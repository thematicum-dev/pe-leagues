# Management Bandwidth — Vorschlag für eine angepasste Spiellogik

Entwurf, noch nicht implementiert. Zur Entscheidung, nicht zur Umsetzung ohne
Gegenlesen.

Die Frage: Der Spieler soll abhängig von der Qualität des Managements
Aktionspunkte haben, die er auf Value-Creation-Initiativen allokiert. Dieses
Dokument beschreibt, was dafür an der Engine zu ändern wäre, mit welchen Zahlen,
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

### 3.2 Was eine Maßnahme kostet

| Maßnahme | Dim | BP | Warum |
| --- | --- | --- | --- |
| `opex` — Cost-out | plat | **1,0** | CFO-getrieben, wenig Organisationslast |
| `nwc` — NWC-Programm | plat | **1,0** | dito, arbeitet im Bestand |
| `erp` — ERP & Digitalisierung | plat | **2,0** | bindet das halbe Haus über Quartale |
| `ai` — KI-Automatisierung | plat | **2,0** | dito, plus Prozessarbeit |
| `pen` — Pricing & Cross-Selling | acc | **1,0** | Vertriebsführung, kurzer Zyklus |
| `exp` — Markt-/Segmentexpansion | acc | **1,5** | neue Region braucht Führungspräsenz |
| `ma` — Add-on M&A | acc | **2,5** | Integration ist der teuerste Zeitfresser |

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

---

## 5 — Zwei Ausbaustufen

### Stufe 1 — minimal-invasiv

`c.initP` / `c.initA` bleiben. Bandbreite ersetzt nur den fondsweiten
Slot-Zähler. Höchstens zwei parallele Maßnahmen je Beteiligung, wie heute.

Berührt: `runQuarter.ts:231–265` (die Slot-Prüfung), `buildInit()` (load in `p`
und `dur`), `targetMargin()` (Überzeichnung), `maturePeople()` (Poach-Faktor),
drei UI-Stellen. Kein Datenmodellwechsel, kein Migrationsrisiko.

Der Haken: Bei nur zwei möglichen Maßnahmen je Beteiligung — eine je Dimension —
ist die *Allokation* kaum je eine Wahl. Die Bandbreite entscheidet meistens nur,
ob eine oder zwei laufen. Das ist eine Verbesserung, aber noch keine
Aktionspunkt-Mechanik.

### Stufe 2 — die eigentliche Fassung

`c.initP` / `c.initA` weichen einer Liste `c.inits[]`. Die Dimensionsgrenze
fällt, die Bandbreite ist die einzige Schranke. Damit werden echte Allokationen
möglich: zwei Performance-Programme parallel auf einer Beteiligung mit starkem
CFO, während die Wachstumsseite ruht — heute unmöglich, inhaltlich völlig
normal.

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
4. KI-Zweig auf dieselbe Prüfung (6.2).
5. `EngineCompat`-Schalter und `LEGACY_COMPAT` (6.3).
6. Tests (6.5), dann 60 nachgespielte Partien: Median-TVPI Spieler und Kohorte
   vorher/nachher. Zielmarke: Median unverändert ±0,05, aber deutlich größere
   Spreizung zwischen gut und schlecht geführten Beteiligungen. Verschiebt sich
   der Median, greift 4.1.
7. Oberfläche (6.4).
8. Erst danach Stufe 2 (Abschnitt 5).

Schritte 1–7 sind Stufe 1 und in sich abgeschlossen. Wenn die Messung in
Schritt 6 die Spreizung nicht zeigt, ist der Vorschlag gescheitert und
zurückzubauen — nicht nachzujustieren, bis die Zahl passt.
