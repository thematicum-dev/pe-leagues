# Management Bandwidth — Vorschlag für eine angepasste Spiellogik

Entwurf, noch nicht implementiert. Zur Entscheidung, nicht zur Umsetzung ohne
Gegenlesen.

Die Frage: Der Spieler soll abhängig von der Qualität des Managements
Aktionspunkte haben, die er auf Value-Creation-Initiativen allokiert — und die
Allokation soll wirken, nicht nur freischalten: alles auf eine Maßnahme gegen
den Split auf zwei (Abschnitt 3.5). Dieses Dokument beschreibt, was dafür an der Engine zu ändern wäre, mit welchen Zahlen,
wo es sich mit bestehenden Mechaniken überschneidet, und was die Änderung an der
Balance verschiebt.

---

## 1 — Wo das Spiel heute steht

Es gibt bereits eine Kapazitätsgrenze, und sie sitzt an der falschen Stelle.

```
// lib/engine/runQuarter.ts:237
const maxInitSlots = INIT_SLOTS + Math.floor(f.attrs.operations / 2);
```

`INIT_SLOTS` ist 4 (`engine.ts:611`), die Standardattribute des Spielers haben
`operations: 3` — also **fünf gleichzeitig laufende Maßnahmen fürs ganze
Portfolio**, unabhängig davon, wie die einzelnen Beteiligungen geführt sind.
Dieselbe Zahl steht noch zweimal im Client (`PeLeagues.tsx:525`,
`MultiplayerGame.tsx:702`).

Die Qualität des Managements wirkt heute an drei anderen Stellen, alle über
`effSkill(c, seat)` (`engine.ts:645`):

| Kanal | Funktion | Wirkung bei Rating 2 → 5 |
| --- | --- | --- |
| Erfolgswahrscheinlichkeit | `initSuccess(E, cls)` | 0,71 → 0,88 (verlässlich) |
| Dauer | `initDur(E)` | 3 → 2 Halbjahre |
| Ertrag | `initGain(E)` | 1,90 → 2,70 |

Was fehlt, ist genau der vierte Kanal: **wie viel Veränderung die Organisation
gleichzeitig verträgt.** Heute verträgt eine Beteiligung mit vakantem CFO und
einem CEO auf Rating 1 exakt so viele parallele Programme wie eine
durchsanierte mit A-Playern auf allen drei Positionen — nämlich zwei, einen je
Dimension (`c.initP` / `c.initA`, `engine.ts:701`). Die Grenze ist ein
Fondsattribut, kein Unternehmensmerkmal.

Das ist inhaltlich verkehrt herum. Der Engpass in einem Buyout ist nicht das
Operating-Team des Sponsors — das sind zwei Leute, die beraten. Der Engpass ist
die Führungsmannschaft der Beteiligung, die neben dem laufenden Geschäft ein
ERP ersetzen, einen Zukauf integrieren und die Preise durchsetzen soll. Genau
daran scheitern Wertsteigerungspläne in der Praxis: nicht am Geld, nicht an der
Idee, sondern an der Aufmerksamkeit des Vorstands.

---

## 2 — Was die Änderung sagen soll

Ein Satz, an dem sich jede Zahl unten messen lassen muss:

> **Was eine Beteiligung an Wertsteigerung leisten kann, entscheidet sich an
> ihrem Management — und zwar bevor die erste Maßnahme gewählt ist.**

Daraus folgen drei Konsequenzen, die das Spiel heute nicht hat:

1. **Der erste Zug nach dem Closing ist die Mannschaft, nicht das Programm.**
   Heute ist Besetzen eine Parallelspur, die den Ertrag verbessert. Danach ist
   sie die Voraussetzung dafür, dass überhaupt etwas läuft.
2. **Die Allokation wird eine Entscheidung.** Wer knappe Punkte hat, muss
   zwischen dem ERP und dem Zukauf wählen, statt beides anzustoßen.
3. **Portfoliogröße hat einen Preis in Aufmerksamkeit, nicht nur in Kapital.**
   Fünf schlecht geführte Beteiligungen leisten weniger als drei gut geführte —
   heute leisten sie dasselbe.

---

## 3 — Kernvorschlag: Management Bandwidth

### 3.1 Die Bandbreite einer Beteiligung

Jede Beteiligung hat pro Halbjahr ein Budget in **Bandwidth Points (BP)**, das
aus ihrer Führungsmannschaft folgt:

```
mgmtLvl(c)  = 0.50 * c.ceo.skill
            + 0.30 * cappedSkill(c, "cfo")
            + 0.20 * cappedSkill(c, "r3")

mgmtBand(c) = clamp(
    BW_BASE                                        //  0.8  jede Organisation trägt etwas
  + BW_SLOPE * mgmtLvl(c)                          //  0.45 je Ratingpunkt
  - BW_VACANCY * vacancies(c)                      //  0.6  je vakanter Position
  - (c.onboard > 0 ? BW_ONBOARD : 0)               //  0.5  Einarbeitung
  - BW_DISTRESS * max(0, lev(c) - covLimit(c) + 1) //  0.5  je Turn im Sanierungsbereich
  , 0.4, 5.0)
```

`cappedSkill` ist bereits da (`engine.ts:642`) und deckelt die Fachpositionen
auf CEO + 1,5 — A-Player berichten nicht an C-Player, und sie schaffen einem
schwachen CEO auch keine Bandbreite. Die Gewichtung 50/30/20 sagt: Der CEO
entscheidet, wie viel das Haus verträgt; CFO und Fachrolle tragen, was sie
selbst führen.

Drei Abzüge, jeder mit einer Aussage:

- **Vakanz.** Eine offene Position spart heute kein Gehalt (`INTERIM`,
  `engine.ts:626`) — sie soll auch keine Bandbreite liefern. Interim verwaltet,
  es führt nicht.
- **Onboarding.** Ein frisch besetzter Sitz kostet erst einmal Aufmerksamkeit.
  Es gibt dafür schon einen Faktor 0,7 auf `E` (`engine.ts:878`) — siehe
  Abschnitt 6.1, das darf nicht doppelt zählen.
- **Distress.** Wer bei 5,0× Verschuldung und einem 4,5×-Covenant sitzt, führt
  Bankengespräche, keine Programme. Das ist der Kanal, der fehlende Zeit
  abbildet, ohne noch einen Abschlag auf die Bewertung zu legen.

### 3.2 Was eine Maßnahme kostet — die Normalbesetzung

| Maßnahme | Dim | BP | Warum |
| --- | --- | --- | --- |
| `opex` — Cost-out | plat | **1,0** | CFO-getrieben, wenig Organisationslast |
| `nwc` — NWC-Programm | plat | **1,0** | dito, arbeitet im Bestand |
| `erp` — ERP & Digitalisierung | plat | **2,0** | bindet das halbe Haus über Quartale |
| `ai` — KI-Automatisierung | plat | **2,0** | dito, plus Prozessarbeit |
| `pen` — Pricing & Cross-Selling | acc | **1,0** | Vertriebsführung, kurzer Zyklus |
| `exp` — Markt-/Segmentexpansion | acc | **1,5** | neue Region braucht Führungspräsenz |
| `ma` — Add-on M&A | acc | **2,5** | Integration ist der teuerste Zeitfresser |

Diese Zahlen sind **kein Festpreis, sondern der Referenzpunkt**: die
Besetzung, bei der ein Programm so läuft, wie die Engine es heute rechnet.
Abweichen nach oben und unten ist die eigentliche Entscheidung — siehe 3.5.

Entscheidend: **Eine Maßnahme belegt ihre Punkte über die gesamte Laufzeit**,
nicht nur im Halbjahr des Starts. Damit zahlt ein schwaches Team doppelt — es
hat weniger Punkte *und* bindet sie länger, weil `initDur(E)` bei niedrigem
Rating vier statt zwei Halbjahre liefert. Genau diese Kopplung macht die
Mannschaft zum Hebel und nicht zum Bonus.

Optional, und inhaltlich richtig: Ein Add-on gibt nach Abschluss nicht sofort
alles frei, sondern behält für zwei weitere Halbjahre **0,5 BP Integrationslast**.
Wer drei Zukäufe hintereinander macht, merkt es.

### 3.3 Überzeichnung — die eigentliche Entscheidung

Eine harte Grenze wäre die einfachste Umsetzung und die langweiligste. Das
Spiel behandelt Knappheit an anderer Stelle bereits richtig — Fremdkapital ist
nicht verboten, es kostet (Margin Grid, `LEV_STEP`; Zinsschranke, Reality Check
9). Bandbreite sollte genauso funktionieren:

```
load(c) = Σ BP(laufende Maßnahmen) / mgmtBand(c)
```

| `load` | Wirkung |
| --- | --- |
| ≤ 1,00 | nichts — das Haus trägt es |
| > 1,00 | **Erfolgswahrscheinlichkeit** jeder *neu gestarteten* Maßnahme: `p × (1 − 0,35 × (load − 1))` |
| ≥ 1,34 | **Dauer** jeder neu gestarteten Maßnahme: +1 Halbjahr |
| > 1,00 | **Marge**: −1,2 pp je voller Überzeichnung, solange sie anhält |
| > 1,00 | **Abwerberisiko**: `POACH × (1 + 1,5 × (load − 1))` — ausgebrannte Manager gehen |
| > 1,75 | nicht darstellbar (`LOAD_MAX`) |

Der Margenkanal hat mit `overstretch(c) * 1.4` in `targetMargin`
(`engine.ts:199`) bereits ein exaktes Vorbild — dieselbe Bauart, dieselbe
Stelle. Erfolgswahrscheinlichkeit und Dauer werden beim Start festgelegt, was
zur bestehenden Mechanik passt: `buildInit()` würfelt `ok` genau einmal, beim
Anstoßen (`engine.ts:882`). Es reicht also, `load` in `buildInit()`
hineinzureichen.

Damit ist Überzeichnung kein Fehler, sondern ein Trade: Wer im Halbjahr 14 noch
den Exit vorbereiten muss, nimmt die schlechtere Quote und drückt das Programm
durch. Das ist die Entscheidung, die es heute nicht gibt.

### 3.4 Der Sponsor-Pool — wo `operations` bleibt

Das Fondsattribut `operations` verliert seine heutige Wirkung (mehr Slots) und
bekommt eine bessere: einen fondsweiten Pool, den der Spieler auf einzelne
Beteiligungen legt.

```
sponsorBand(f) = SPONSOR_BASE + 0.5 * f.attrs.operations   // 1.0 + …
```

ops 0 → 1,0 BP; ops 3 (Standard) → 2,5 BP; ops 5 → 3,5 BP, verteilbar übers
ganze Portfolio, **höchstens 1,5 BP je Beteiligung**. Der Deckel ist die
Aussage: Ein Operating Partner verstärkt ein Team, er ersetzt keines. Ein
Fonds, der auf Operations spielt, kann eine schwierige Beteiligung tragen —
nicht vier.

Technisch ein neues Feld in `TurnDecisions` (`turnTypes.ts`):

```ts
export interface BandwidthSupportIntent { holdingUid: string; points: number; }
// TurnDecisions: bandwidthSupport?: BandwidthSupportIntent[];
```

Serverseitig gegen `sponsorBand(f)` und den Deckel kappen, wie jede andere
Absicht auch — der Kommentarkopf von `turnTypes.ts` verlangt das ausdrücklich.

### 3.5 Intensität — wie viel Bandbreite auf *diese* Maßnahme

Bis hierher ist Bandbreite eine Schranke: Sie entscheidet, **ob** ein Programm
läuft. Das ist noch keine Allokation. Interessant wird es, wenn die zugeteilte
Bandbreite auch bestimmt, **wie gut** es läuft — alles auf ein Programm gegen
den Split auf zwei.

Jede Maßnahme bekommt dafür eine Intensität `i`, gemessen an ihrer
Normalbesetzung aus 3.2:

```
BP(id, i)  = BW_OVERHEAD + (bpBase(id) - BW_OVERHEAD) * i      // BW_OVERHEAD = 0.3
```

Der Fixanteil ist der Steuerungsaufwand, den jedes Programm unabhängig von
seiner Größe verursacht: Lenkungsausschuss, Reporting, ein Platz auf der
Agenda. Er ist der Grund, warum fünf halbe Programme teurer sind als zwei ganze.

**Drei Stufen, nicht ein Schieberegler.** Das ist eine bewusste Entscheidung
gegen Feingranularität: Ein stufenloser Regler macht aus jeder Runde eine
Optimierungsaufgabe mit einer berechenbaren Lösung, und eine berechenbare
Lösung ist keine Entscheidung. Drei benannte Stufen erzählen dagegen etwas.

| Stufe | `i` | `opex`/`nwc`/`pen` | `exp` | `erp`/`ai` | `ma` |
| --- | --- | --- | --- | --- | --- |
| Sparflamme | 0,6 | 0,7 | 1,0 | 1,3 | 1,6 |
| **Normal** | 1,0 | **1,0** | **1,5** | **2,0** | **2,5** |
| Task Force | 1,6 | 1,4 | 2,2 | 3,0 | 3,8 |

#### Die drei Kanäle

```
gainFactor(i) = (1 + BW_SAT) * i / (i + BW_SAT)     // BW_SAT = 0.7, konkav
pFactor(i)    = cls === "rel"                        // verlässliche Maßnahmen
                  ? 1 + 0.35 * (gainFactor(i) - 1)   //   flach, unterliefern statt scheitern
                  : clamp(0.45 + 0.55 * i^1.6,       // tr / hard: Schwelle unter i = 1,
                          0.30, 1.10)                //   gedeckelt darüber
durShift(i)   = i < 0.75 ? +1 : i >= 1.5 ? -1 : 0
```

| `i` | `gainFactor` | `pFactor` rel | `pFactor` tr/hard | Dauer |
| --- | --- | --- | --- | --- |
| 0,6 | 0,785 | 0,93 | **0,69** | +1 HJ |
| 0,8 | 0,907 | 0,97 | 0,84 | 0 |
| 1,0 | 1,000 | 1,00 | 1,00 | 0 |
| 1,6 | 1,183 | 1,06 | 1,10 (Deckel) | −1 HJ |
| 2,0 | 1,259 | 1,09 | 1,10 (Deckel) | −1 HJ |

Die Formen sind nicht beliebig, sie sind die ganze Mechanik:

- **Der Ertrag ist konkav.** Die ersten Punkte auf ein Programm bringen am
  meisten, die letzten am wenigsten (Grenzertrag von 0,6 auf 0,8: +0,12; von
  1,8 auf 2,0: +0,035). Für sich genommen belohnt das **Verteilen**.
- **Das Risiko ist konvex — aber nur bei Transformationen.** `erp`, `ai` und
  `ma` sind binär im Ausgang und tragen `failCost`. Eine halb besetzte
  ERP-Ablösung liefert nicht 70 % eines ERP, sie liefert ein gescheitertes ERP:
  `pFactor` 0,69, und der Einmalaufwand ist trotzdem gebucht. Für sich genommen
  bestraft das **Verteilen**, und zwar hart.
- **Verlässliche Maßnahmen sind gutmütig.** `opex`, `nwc`, `pen` unterliefern
  statt zu scheitern (`PARTIAL_DELIVERY`) — der Risikokanal ist dort flach.
  Genau deshalb sind sie die Kandidaten für Sparflamme.
- **Die Dauer ist der Preis der Breite.** Und Zeit kostet in diesem Spiel
  echtes Geld: `staleDisc()`, `endPressure()`, zwanzig Halbjahre Fondslaufzeit.

Zusammen ergibt das keine dominante Antwort, sondern eine situative:

> Breit und langsam, wenn viele Maßnahmen gut passen und Zeit da ist. Schmal
> und schnell, wenn nur eine passt oder das Exitfenster näherkommt. Und niemals
> eine Transformation auf Sparflamme.

#### Durchgerechnet: Band 2,15 (solide besetzt, 3/3/3)

| Option | BP | Fit-gewichteter Ertrag | Nebenwirkung |
| --- | --- | --- | --- |
| `opex` Task Force | 1,42 | 1,42 | eine Dimension, ein Halbjahr früher fertig |
| `opex` + `pen` Normal, `pen` passt gut | 2,00 | **2,30** | beide Dimensionen laufen |
| `opex` + `pen` Normal, `pen` passt schwach | 2,00 | 1,55 | schlechter als die Task Force |
| `opex` + `pen` Sparflamme | 1,44 | 1,80 | beide +1 Halbjahr |
| `erp` Sparflamme | 1,32 | — | `pFactor` 0,69 — **die Falle** |

Unterstellt sind `fitOf` 1,20 für `opex` und 1,10 bzw. 0,35 für `pen`. Die
Ablesung: **Die Fit-Spreizung entscheidet.** Wo beide Maßnahmen passen, gewinnt
der Split. Wo die zweite kaum ansetzt, gewinnt die Konzentration — und das ist
genau die Entscheidung, die `fitOf` seit seiner Einführung vorbereitet, ohne
dass sie bisher irgendwo abgefragt wurde.

#### Die Stellschraube, die man kennen muss

`BW_OVERHEAD` steuert, ob Verteilen oder Vollbesetzung effizienter ist. Ertrag
je BP für eine Basismaßnahme:

| `BW_OVERHEAD` | Sparflamme | Normal | Task Force | Effizienzoptimum |
| --- | --- | --- | --- | --- |
| 0,30 | 1,090 | 1,000 | 0,833 | Sparflamme |
| 0,40 | 1,032 | 1,000 | 0,870 | Sparflamme, knapp |
| 0,45 | 1,006 | 1,000 | 0,889 | praktisch gleich |
| 0,50 | 0,981 | **1,000** | 0,910 | Normal |

Bei 0,5 ist Normalbesetzung das Optimum und jede Abweichung kostet Effizienz —
sauber, aber der Regler wird zahnlos: Sparflamme spart dann nur noch 20 % der
Kosten für 21 % weniger Ertrag, und niemand dreht mehr daran.

**Empfehlung: 0,3, und den Gegendruck dort lassen, wo er inhaltlich hingehört** —
in der Dauer und im Zusammenbruch der Transformationsklassen. Breite Bearbeitung
auf Sparflamme *soll* eine tragfähige Strategie sein; sie kostet Zeit, und Zeit
ist in diesem Spiel bereits teuer. Wenn die Messung zeigt, dass alles auf
Sparflamme läuft, ist `BW_OVERHEAD` die Schraube — nicht die Ertragskurve.

#### Was nicht geht: Nachsteuern

Die Intensität steht beim Start fest und ist danach nicht mehr änderbar. Das
ist keine Bequemlichkeit, sondern eine Folge der Architektur: `buildInit()`
zieht `ok` genau einmal aus dem gesetzten Zufallsstrom (`engine.ts:882`). Ein
Programm später zu verstärken hieße, entweder neu zu würfeln — dann verschiebt
sich die Reihenfolge der Ziehungen und `replay.test.ts` bricht — oder die
Ziehung ans Ende der Laufzeit zu verlegen, was ein Eingriff in den Kern ist.

Inhaltlich trägt die Einschränkung: Der Ressourcenplan steht beim Kick-off.
Wer ein Programm unterbesetzt startet, hat sich entschieden.

Eine **Rettungsaktion** — nach der Hälfte der Laufzeit eine Ampel, und gegen
zusätzliche BP ein neuer Wurf — wäre die interessantere Mechanik und ist
bewusst zurückgestellt: Sie ist nur mit einem eigenen, separaten Zufallsstrom
sauber zu bauen. Als Ausbaustufe notiert, nicht als Teil dieses Vorschlags.

---

### 3.6 Abnehmende Erträge — vier Schichten, die es schon gibt

Die Beobachtung ist richtig, und sie ist bereits modelliert. Ein Programm hebt
das Unternehmen, und genau dadurch bringt das nächste in dieselbe Richtung
weniger. Die Engine bildet das an vier Stellen ab, jede an eine andere Größe
gebunden:

| Schicht | Funktion | Bemessen an |
| --- | --- | --- |
| **Eignung** | `fitOf(id, c)` | dem konkreten Defizit, an dem die Maßnahme ansetzt |
| **Reifegraddecke** | `ceilingFactor(lvl)` | dem Niveau der *Dimension* (`c.plat` / `c.acc`) |
| **Wiederholung** | `repeatMalus(n)` | der Zahl früherer Auflagen *derselben* Maßnahme |
| **Harte Grenze** | `REPEAT_MAX = 4` | dito |

Die Beträge, damit die Größenordnung greifbar ist:

| Reifegrad | `ceilingFactor` | | Auflage | `repeatMalus.gm` |
| --- | --- | --- | --- | --- |
| 2,0 | 1,000 | | 1. | 1,000 |
| 3,0 | 0,870 | | 2. | 0,820 |
| 4,0 | 0,740 | | 3. | 0,672 |
| 5,0 | 0,610 | | 4. | 0,551 |

Am schärfsten wirkt aber `fitOf`, weil es über den Umweg der Wirkung greift:
Ein Cost-out hebt `c.plat`, `c.plat` hebt über `targetMargin()` die Marge, und
die Eignung des nächsten Cost-outs misst genau gegen diese Marge.

| `c.plat` | Marge (Bench 14) | `fitOf("opex")` |
| --- | --- | --- |
| 2,0 | 13,0 | 0,83 |
| 3,0 | 14,0 | 0,55 |
| 4,0 | 15,0 | 0,27 |
| 5,0 | 16,0 | 0,10 |

Das ist die stärkste Bremse im Katalog, und sie ist die inhaltlich richtige:
Nicht eine Regel verbietet das zweite Cost-out, sondern es ist schlicht nichts
mehr zu holen. Dazu kommt `decayOf(lvl)` — oberhalb des Branchenniveaus fällt
ein Reifegrad zurück, solange in der Dimension kein Programm läuft.

**Wichtig für den Rest dieses Dokuments: Die Kanäle überschneiden sich kaum.**
Innerhalb einer Dimension greift `fitOf` je Maßnahme an einer *anderen* Größe an
— `opex` an der Marge, `nwc` an der Kapitalbindung, `erp` und `ai` an der Größe.
Geteilt wird nur `ceilingFactor`, weil alle Plattformmaßnahmen dasselbe
`c.plat` heben.

#### Wo Stufe 2 das aushebelt

Der Ertrag einer Maßnahme wird **beim Start** festgeschrieben
(`engine.ts:906`) und erst bei Abschluss gebucht (`engine.ts:1521`). Heute ist
das folgenlos: Pro Dimension läuft genau ein Programm, das nächste startet also
zwangsläufig *nach* dem vorigen und sieht dessen Wirkung in `fitOf` und
`ceilingFactor`. Die Serialisierung erledigt die Abnahme von selbst.

**Stufe 2 nimmt genau diese Serialisierung weg.** Laufen `opex`, `nwc` und `erp`
gleichzeitig, rechnen alle drei ihren `ceilingFactor` gegen dasselbe
Ausgangsniveau — die Decke wird dreimal gegen einen Stand bemessen, den die
ersten beiden Programme längst gehoben haben.

Drei Plattformmaßnahmen mit je 0,70 Rohertrag, Start bei `c.plat` 2,0:

| | Verlauf | Endstand |
| --- | --- | --- |
| sequenziell | +0,700 → +0,636 → +0,578 | **3,915** |
| parallel | 3 × 0,700 | **4,100** |

Ein Zuwachs von 2,10 statt 1,91, also **rund 10 % zu viel** — nicht dramatisch
für ein Paar, aber es wächst mit der Zahl paralleler Programme, und es zeigt
in die falsche Richtung: Es belohnt genau das Stapeln in einer Dimension, das
die Bandbreite eigentlich bepreisen soll.

#### Die Korrektur

`fitOf` und `ceilingFactor` gehören **beim Abschluss** ausgewertet, nicht beim
Start. `ok` und die Streuung `sp` bleiben, wo sie sind — der Zufallsstrom wird
nicht angefasst, nur die deterministischen Faktoren wandern ans Ende der
Laufzeit. Drei Folgen, alle gewollt:

- Überlappende Programme teilen sich die Reserve automatisch und richtig, ohne
  eine eigene Buchführung über beanspruchte Reifegradanteile.
- Ein lange laufendes Programm liefert weniger, wenn ein anderes den Abstand
  inzwischen geschlossen hat. Das ist keine Härte, sondern der Vorgang selbst:
  Das Cost-out landet auf einer Basis, die die ERP-Ablösung schon schlanker
  gemacht hat.
- Der Spieler sieht beim Start eine **Prognose**, keine Zusage. Der
  Maßnahmenpicker rechnet sie pro forma gegen den Zustand, der sich ergibt,
  wenn die laufenden Programme liefern — damit wird die Überlappung sichtbar,
  *bevor* man sich bindet, statt als Enttäuschung bei Abschluss.

Für Stufe 1 ändert die Korrektur praktisch nichts (bei einem Programm je
Dimension sind Start- und Abschlusszustand in derselben Dimension identisch).
Sie ist trotzdem dort einzubauen, nicht erst in Stufe 2: als Vorarbeit, die
unter der heutigen Slotregel nachweislich wirkungsfrei ist und sich deshalb
sauber testen lässt.

#### Was dabei *nicht* doppelt zählt

Die Intensität aus 3.5 und die Abnahme aus diesem Abschnitt sind verschiedene
Achsen, und ihre multiplikative Verknüpfung ist richtig: `gainFactor(i)` sagt,
wie hart man *ein* Programm fährt, `fitOf × ceilingFactor` sagt, wie viel in der
Dimension überhaupt noch liegt. Eine Task Force auf einer ausgereizten
Dimension bleibt teuer und ertraglos — 1,183 × 0,74 × 0,27, und die Bandbreite
kostet sie voll.

**Und das ist die Pointe:** Die Kosten in BP sinken *nicht* mit der Reserve. Der
organisatorische Aufwand eines Cost-outs schrumpft nicht, weil die Marge schon
gut ist. Ertrag fällt, Preis bleibt — erst diese Asymmetrie macht „gar nicht
machen" zu einem echten Zug statt zu einer verpassten Gelegenheit.

#### Eine Nebenwirkung, die bleiben darf

Weil `decayOf()` nur greift, solange in der Dimension *kein* Programm läuft,
wird ein Dauerläufer auf Sparflamme (0,7 BP) zur Rückfallversicherung: Bei
`c.plat` 4,5 hält er 0,20 Reifegrad je Halbjahr, die sonst verfallen. Das ist
kein Schlupfloch, sondern genau die Aussage, mit der `DECAY` eingeführt wurde —
„Halten ist nicht mehr kostenlos". Neu ist nur, dass das Halten jetzt einen
ausgewiesenen Preis in Bandbreite hat statt eines versteckten.

---

---

## 4 — Kalibrierung

Die Zahlen aus Abschnitt 3, durchgerechnet an den Mannschaften, die das Spiel
tatsächlich erzeugt (`makeSeats`, `engine.ts:915`: CEO 1–4, CFO zu 35 % vakant
sonst 1–3, Fachrolle zu 45 % vakant sonst 1–3):

| Situation | mgmtLvl | mgmtBand | Was läuft |
| --- | --- | --- | --- |
| Frisch erworben, Erwartungswert | 1,86 | **1,16** | ein verlässliches Programm, sonst nichts |
| CEO 2,5, CFO und Fachrolle vakant | 1,25 | **0,40** | nichts. Erst besetzen. |
| Solide besetzt (3 / 3 / 3), ein Sitz im Onboarding | 3,00 | **1,65** | ein Programm, und nichts daneben |
| Solide besetzt (3 / 3 / 3) | 3,00 | **2,15** | zwei leichte (2,0), oder ein schweres |
| Durchsaniert (4,5 / 4 / 4) | 4,25 | **2,71** | `opex` + `exp` (2,5); `erp` + `pen` (3,0) leicht überzeichnet |
| Durchsaniert + voller Sponsor (+1,5) | 4,25 | **4,21** | `erp` + `exp` (3,5); `ma` + `erp` (4,5) nur überzeichnet |
| Durchsaniert, 5,2× Lev bei 4,5× Covenant | 4,25 | **1,86** | zurück auf ein Programm, solange es brennt |

Zwei Ablesungen, die zeigen, dass die Kalibrierung die richtigen Sätze sagt:

- **`ma` + `erp` (4,5 BP) ist praktisch nicht darstellbar.** Ein ERP ersetzen
  und gleichzeitig einen Wettbewerber integrieren — das geht in der Wirklichkeit
  auch nicht gut aus. Mit Überzeichnung bis 1,75 wird es *möglich*, bei
  spürbar schlechteren Quoten. Genau richtig.
- **Ein Haus mit zwei vakanten Sitzen steht bei 0,4 BP.** Es kann gar nichts.
  Das ist die stärkste Einzelaussage des Vorschlags und der Grund, warum der
  Search-Zyklus (Mandat → `readyQ + 1` → `onboard`) plötzlich am Anfang der
  Halteperiode steht statt irgendwo.

### 4.1 Durchsatz gegen heute

Das ist die Zahl, die man vor der Umsetzung kennen muss.

- **Heute:** 5 Slots fürs ganze Portfolio. Bei vier Beteiligungen sind das 1,25
  parallele Programme je Beteiligung — unabhängig von allem.
- **Danach:** 1,16 BP frisch erworben, 2,15–2,7 BP gut besetzt, plus 2,5 BP
  Sponsor-Pool. Ein gut geführtes Portfolio aus vier Beteiligungen kommt auf
  rund 11 BP, also **acht bis zehn parallele Programme statt fünf.**

Der Durchsatz eines gut gespielten Portfolios **verdoppelt sich also ungefähr**.
Das ist kein Nebeneffekt, das ist die Hauptwirkung, und sie muss gegenfinanziert
werden — sonst steigt der Median-TVPI des Spielers gegen eine KI-Kohorte, die
dieselbe Rechnung nicht macht. Drei Stellschrauben, in dieser Reihenfolge:

1. **Kosten hoch statt Bandbreite runter.** Alle BP-Kosten × 1,25 (also 1,25 /
   1,9 / 2,5 / 3,1) trifft die schweren Programme stärker und lässt das
   „ein Programm läuft immer" unangetastet.
2. **`BW_SLOPE` von 0,45 auf 0,38.** Trifft die Spitze, lässt den Boden. Macht
   Besetzen weniger dominant — siehe 6.1.
3. **Fondsweite Obergrenze als Notbremse behalten**, aber deutlich höher
   (`INIT_SLOTS` = 8 statt 4) und nur als Deckel, nicht als Budget.

Empfehlung: mit (1) und (2) messen, (3) nur wenn nötig. Ein zweiter Deckel
neben der Bandbreite nimmt der Mechanik genau das, was sie hinzufügen soll.

**Die Intensität aus 3.5 wirkt hier mit, und die Richtung ist offen.** Sie gibt
überschüssiger Bandbreite eine zweite Verwendung: nicht noch ein Programm,
sondern ein besser besetztes. Ob das den Durchsatz dämpft oder weiter treibt,
hängt an `BW_OVERHEAD` und ist aus der Formel nicht abzulesen — bei 0,3 bleibt
Verteilen effizienter, der Durchsatz steigt also eher weiter. Beide Effekte
gehören deshalb in **dieselbe** Messung, nicht in zwei aufeinanderfolgende.

---

## 5 — Zwei Ausbaustufen

### Stufe 1 — minimal-invasiv

`c.initP` / `c.initA` bleiben. Bandbreite ersetzt nur den fondsweiten
Slot-Zähler. Höchstens zwei parallele Maßnahmen je Beteiligung, wie heute.

Berührt: `runQuarter.ts:231–265` (die Slot-Prüfung), `buildInit()` (load in `p`
und `dur`), `targetMargin()` (Überzeichnung), `maturePeople()` (Poach-Faktor),
drei UI-Stellen. Kein Datenmodellwechsel, kein Migrationsrisiko.

Der Haken war: Bei nur zwei möglichen Maßnahmen je Beteiligung — eine je
Dimension — ist die *Allokation* kaum je eine Wahl; die Bandbreite entscheidet
dann nur, ob eine oder zwei laufen.

**Die Intensität aus 3.5 räumt genau das aus.** Auch mit zwei festen Slots gibt
es dann eine echte Allokation: eine Maßnahme als Task Force gegen zwei auf
Sparflamme, und zwischen beiden die Fit-Spreizung als Entscheidungsgrundlage.
Stufe 1 ist damit keine Vorstufe mehr, sondern eine vollständige Mechanik —
Stufe 2 erweitert sie, sie rettet sie nicht.

### Stufe 2 — die eigentliche Fassung

`c.initP` / `c.initA` weichen einer Liste `c.inits[]`. Die Dimensionsgrenze
fällt, die Bandbreite ist die einzige Schranke. Damit werden echte Allokationen
möglich: zwei Performance-Programme parallel auf einer Beteiligung mit starkem
CFO, während die Wachstumsseite ruht — heute unmöglich, inhaltlich völlig
normal.

**Voraussetzung ist die Korrektur aus 3.6:** Ohne sie rechnen parallele
Maßnahmen derselben Dimension ihre Reifegraddecke alle gegen den Ausgangsstand,
und das Stapeln in einer Dimension wird belohnt statt bepreist.

Berührt zusätzlich: `initsOf`, `initIn`, `anyInit`, `sumInit` (`engine.ts:701–705`),
die `["initP","initA"]`-Schleife in `maturePeople()` (`engine.ts:1495`), den
`initA.drag`-Term in `targetMargin()` (wird zur Summe über die Liste), den
DECAY-Zweig in `stepCompany()` und den Maßnahmenpicker. Dazu eine Migration
bestehender `season_state`-Stände (`initP`/`initA` → `inits[]`, verlustfrei) und
ein `EngineCompat`-Schalter für die Wiederholung alter Halbjahre.

**Empfehlung:** Stufe 1 bauen, eine Saison messen, dann Stufe 2. Stufe 1 ist
rückbaubar, Stufe 2 nicht.

### 5.1 Was man mit freier Bandbreite sonst tun kann

Sobald Punkte knapp sind, brauchen sie auch eine Verwendung unterhalb eines
vollen Programms — sonst verfällt Rest-Bandbreite ungenutzt und die Feinsteuerung
läuft leer. Drei kleine Posten, je 0,5 BP, ohne Einmalaufwand:

| Posten | Wirkung |
| --- | --- |
| **Integration begleiten** | `onboard` endet ein Halbjahr früher |
| **Retention-Arbeit** | Abwerberisiko im Halbjahr halbiert |
| **Exit-Vorbereitung** | Vendor-Due-Diligence: +0,15× Multiple im Verkaufsprozess, nur wenn zwei Halbjahre vor Prozessbeginn belegt |

Der dritte ist der interessanteste: Er verbindet die Bandbreite mit dem Exit und
gibt der Spätphase einer Halteperiode etwas zu entscheiden — genau die Lücke,
die im Katalogkommentar zu `initRuns` (`engine.ts:670`) schon einmal als Problem
benannt wurde.

---

## 6 — Was sonst angefasst werden muss

### 6.1 Doppelzählung — das Hauptrisiko

Reality Check 17 stellt die Frage für die Zeitkosten; hier stellt sie sich
schärfer. `effSkill` treibt heute drei Kanäle. Bandbreite wäre der **vierte**,
und alle vier zeigen in dieselbe Richtung.

Grobrechnung für den Sprung Rating 2 → 5, verlässliche Maßnahme:

| Kanal | heute | mit Bandbreite |
| --- | --- | --- |
| Erfolgsquote | ×1,24 | ×1,24 |
| Dauer (Durchsatz) | ×1,50 | ×1,50 |
| Ertrag je Maßnahme | ×1,42 | ×1,42 |
| **Parallelität** | ×1,00 | **×1,79** |
| **Produkt** | **×2,64** | **×4,74** |

Der Wert einer Besetzung steigt also um rund 80 %. Da die Kosten einer
Besetzung unverändert bleiben (`retainerOf` + `signBonusOf` + `severanceOf`,
plus dauerhaft höherer `seatLoad`), wird der A-Player schlicht dominant — und
eine dominante Strategie ist genau das, was die Reality Checks an anderer Stelle
beseitigt haben.

Gegenfinanzierung, zusammen mit Abschnitt 4.1 zu messen:

- `initSuccess`-Steigungen abflachen: 0,055 → 0,042 (rel), 0,048 → 0,037 (tr),
  0,072 → 0,058 (hard). Die Bandbreite trägt jetzt einen Teil dessen, was die
  Quote vorher allein getragen hat.
- `initDur`-Schwelle von 1,6 auf 1,9: Dauern fallen später.
- Onboarding **entweder** über `E × 0,7` (`engine.ts:878`) **oder** über
  `BW_ONBOARD`, nicht beides. Vorschlag: `E`-Faktor auf 0,85 anheben, Abzug in
  der Bandbreite behalten — die Einarbeitung kostet primär Zeit, nicht Können.
- **MEP:** Die Managementbeteiligung gibt heute +0,5 auf `effSkill` und wirkt
  über `retentionFactor` (Reality Check 4). Ein dritter Kanal in der Bandbreite
  wäre zu viel. Entweder ganz weglassen — ein MEP kauft Ausrichtung, keine
  Stunden — oder +0,3 BP geben und den `effSkill`-Bonus auf 0,25 halbieren.
  Empfehlung: weglassen.

Diese Zahlen sind Startwerte für eine Messung, keine Ergebnisse.

### 6.2 Die KI-Fonds müssen dieselbe Rechnung zahlen

Der teuerste Befund der letzten Durchsicht war Reality Check 11: Die KI setzte
MEPs auf, kassierte die Wirkung und zahlte nie dafür. Derselbe Fehler wäre hier
leicht gemacht — der KI-Zweig (`runQuarter.ts:525–560`) stößt Maßnahmen über
`AI_PLAN` an, ohne den Slot-Zähler des Spielers überhaupt zu kennen.

Die KI braucht deshalb dieselbe Prüfung *und* eine Allokationsregel, sonst
startet sie nach Reihenfolge und überzeichnet zufällig. Vorschlag: greedy nach
`fitOf(id, c) / BP(id)` — Ertrag je Punkt — und Überzeichnung nur, wenn der
Archetyp `ops` ist. Das gibt dem Operator-Bot ein erkennbares Profil und der
Kohorte insgesamt einen leicht schlechteren Durchsatz, was der Verdopplung beim
Spieler aus 4.1 entgegenläuft. Beides zusammen messen, nicht nacheinander.

Der Sponsor-Pool gilt für die KI genauso: `sponsorBand()` aus ihren
Archetyp-Attributen, verteilt auf die Beteiligung mit der niedrigsten Bandbreite.

### 6.3 Replay und Kompatibilität

Die Änderung verschiebt die Beträge bereits ausgewerteter Halbjahre. Nach dem
Muster von `legacyNoIntBarrier` / `legacyAddonBenchMargin` braucht es einen
Schalter in `EngineCompat`, etwa `legacyFundInitSlots`, aufgenommen in
`LEGACY_COMPAT` (`lib/engine/replay.ts`), damit alte Partien exakt nachrechenbar
bleiben. Ohne ihn bricht `replay.test.ts`, und zwar zu Recht.

### 6.4 Oberfläche

Drei Stellen, und alle drei müssen die Bandbreite zeigen, bevor gewählt wird —
sonst ist sie verstecktes Wissen statt Entscheidungsgrundlage, genau der Einwand,
mit dem `fitLabel()` (`engine.ts:768`) begründet ist:

- **Beteiligungskarte:** ein Balken `Bandbreite 2,2 BP · belegt 1,0 · frei 1,2`,
  darunter im Klartext, woran es liegt („CFO vakant: −0,6"). Der Spieler muss
  den Zusammenhang zwischen Besetzung und Handlungsfähigkeit sehen können.
- **Maßnahmenpicker:** Kosten je Maßnahme, resultierender `load`, und bei
  Überzeichnung die konkrete Folge ausgeschrieben („Erfolgsquote 71 % → 62 %,
  Dauer 3 statt 2 Halbjahre, −1,2 pp Marge"). Neben `fitLabel` — dieselbe Zeile.
- **Portfolioübersicht:** Sponsor-Pool mit Restbestand, damit die Verteilung
  überhaupt planbar ist.
- **Intensitätsstufe:** drei Schaltflächen im Picker, voreingestellt auf
  „Normal", darunter die Folge in Zahlen — „Sparflamme: 0,7 BP, Ertrag 79 %,
  Erfolgsquote 93 %, ein Halbjahr länger". Bei einer Transformationsmaßnahme
  unter Normal gehört die Warnung ausgeschrieben daneben, in `--ox`: Das ist
  die teuerste vermeidbare Fehlentscheidung im ganzen Modell.

### 6.5 Tests

`lib/engine/__tests__/operatingCapacity.test.ts` prüft heute genau die Regel,
die entfällt, und ist die Vorlage für das, was an ihre Stelle tritt:

- Eine Beteiligung mit zwei vakanten Sitzen startet **keine** Maßnahme, auch
  wenn sie eingereicht wird.
- Dieselbe Beteiligung nach Besetzung startet sie.
- Überzeichnung über `LOAD_MAX` wird serverseitig verworfen — wie bei der
  bestehenden Slot-Regel darf eine eingereichte Entscheidung das nicht umgehen.
- Sponsor-Punkte über `sponsorBand(f)` hinaus werden gekappt, nicht übernommen.
- KI und Spieler laufen durch dieselbe Prüfung: ein KI-Fonds mit vakanten
  Sitzen startet ebenfalls nichts.
- Invarianz: Über eine ganze Partie überschreitet keine Beteiligung `LOAD_MAX`.

Für die Intensität (3.5) kommen dazu:

- `BP(id, i)` ist monoton in `i` und trifft bei `i = 1` exakt `bpBase(id)` —
  sonst verschiebt die Einführung stillschweigend die Kalibrierung aus 3.2.
- Eine Maßnahme, deren Intensität über die freie Bandbreite hinausgeht, wird
  gekappt oder verworfen, nicht ungeprüft übernommen — dieselbe Zusage wie bei
  jeder anderen eingereichten Absicht.
- `gainFactor` ist über den ganzen Bereich konkav und `pFactor` für `tr`/`hard`
  unter `i = 1` konvex. Beides sind Aussagen über die Kurvenform, von denen die
  ganze Entscheidungsstruktur abhängt; ein Vorzeichenfehler beim Tuning fällt
  sonst niemandem auf.
- Bei `i = 1` liefert `buildInit()` in allen drei Kanälen bitgleich dasselbe
  wie vor der Änderung — der Regressionstest gegen die heutige Engine.

Für die Auswertung beim Abschluss (3.6):

- Unter der heutigen Slotregel (ein Programm je Dimension) liefert die
  Verlegung von Start auf Abschluss **identische** Ergebnisse — das ist die
  Zusage, die sie zu einer sicheren Vorarbeit macht.
- Zwei parallele Plattformmaßnahmen heben `c.plat` zusammen um weniger als die
  Summe ihrer Einzelerträge, und um genau so viel wie dieselben beiden
  nacheinander.

---

## 7 — Was ich nicht vorschlage, und warum

**Ein globaler Aktionspunkte-Pool auf Fondsebene.** Näher am wörtlichen
„Aktionspunkte", aber es sagt wieder, der Sponsor sei der Engpass — dieselbe
Aussage wie heute, nur mit feinerer Granularität. Der Sponsor-Pool aus 3.4 ist
die Dosis davon, die stimmt.

**Bandbreite als Währung, die man mit Geld kauft.** Beratermandate gegen BP wäre
implementierbar und macht die Mechanik kaputt: Wer Dry Powder hat, kauft sich um
das Problem herum, und die Führungsmannschaft ist wieder eine Kulisse. Der Preis
der Bandbreite steht schon im Modell, und er steht an der richtigen Stelle — in
den Gehältern, über `seatLoad(c)` in `targetMargin()`. Bessere Führung kostet
Marge. Damit schließt sich die Rechnung ohne einen zweiten Kanal.

**Bandbreite nach Unternehmensgröße statt nach Managementqualität.** Größere
Häuser haben mehr Leute, das stimmt. Es beantwortet aber die gestellte Frage
nicht und würde die Mechanik an `ebitdaOf(c)` hängen, also an eine Zahl, die der
Spieler ohnehin maximiert. Größe gehört als schwacher Zusatzterm hinein oder gar
nicht — Vorschlag: gar nicht, `fitOf` bildet den Größeneffekt für `erp` und `ai`
bereits ab.

---

## 8 — Umsetzungsreihenfolge

1. `mgmtBand()`, `bpCostOf()`, `loadOf()` in `engine.ts`, mit Konstanten und
   Kommentaren nach Hausart. Reine Funktionen, ohne Aufrufer.
2. `runQuarter.ts:231–265`: Slot-Zähler raus, Bandbreitenprüfung rein. `load`
   an `buildInit()` durchreichen.
3. Überzeichnung in `targetMargin()` und `maturePeople()` (Poach).
4. Intensität (3.5): `BP(id, i)`, `gainFactor`, `pFactor`, `durShift`; Feld
   `intensity` in `InitiativeIntent`, serverseitig gegen die freie Bandbreite
   geprüft. Voreinstellung überall „Normal" — bis der Spieler etwas anderes
   wählt, verhält sich das Spiel wie in Schritt 2.
5. `fitOf` und `ceilingFactor` von der Start- an die Abschlussauswertung
   verlegen (3.6). Unter der heutigen Slotregel wirkungsfrei und genau deshalb
   hier, vor Stufe 2, einzubauen und zu testen.
6. KI-Zweig auf dieselbe Prüfung (6.2). Die Allokationsregel aus 6.2 wird dabei
   zweidimensional: erst welche Maßnahme, dann mit welcher Intensität.
   Vorschlag: `tr`-Klassen nie unter Normal, Rest greedy nach Ertrag je Punkt.
7. `EngineCompat`-Schalter und `LEGACY_COMPAT` (6.3).
8. Tests (6.5), dann 60 nachgespielte Partien: Median-TVPI Spieler und Kohorte
   vorher/nachher. Zielmarke: Median unverändert ±0,05, aber deutlich größere
   Spreizung zwischen gut und schlecht geführten Beteiligungen. Verschiebt sich
   der Median, greift 4.1.
9. Oberfläche (6.4) — inklusive der drei Intensitätsstufen im Maßnahmenpicker.
10. Erst danach Stufe 2 (Abschnitt 5).

Schritte 1–9 sind Stufe 1 und in sich abgeschlossen. Wenn die Messung in
Schritt 8 die Spreizung nicht zeigt, ist der Vorschlag gescheitert und
zurückzubauen — nicht nachzujustieren, bis die Zahl passt.
