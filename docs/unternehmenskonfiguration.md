# Unternehmenskonfiguration und Value-Creation-Strategie

Vorschläge, wie ein Zielunternehmen im Spiel eine eigene Struktur bekommt —
und wie daraus die Aufgabe wird, die das Spiel bisher nicht stellt: **zu
entschlüsseln, welcher Hebel bei genau diesem Unternehmen trägt.**

Das Dokument ist ein Entwurf, keine Umsetzung. Jeder Vorschlag nennt die
Mechanik, die Fundstelle im Code, was der Spieler sieht, was die Änderung an
der Entscheidung ändert — und woran sich messen lässt, ob sie funktioniert.
Die Gliederung folgt `docs/reality-checks.md`: Befund, Vorschlag, Konsequenz.

---

## 1 — Befund: was das Spiel heute tut

### 1.1 Woraus ein Unternehmen heute besteht

Ein Zielunternehmen entsteht in `newDeal()` (`lib/engine/engine.ts`) aus einem
Eintrag des Dealbuchs `BOOK` und wird beim Zuschlag in `runQuarter.ts` zur
Beteiligung. Seine vollständige Beschreibung sind vierzehn Zahlen:

| Feld | Herkunft | Spannweite |
| --- | --- | --- |
| `sector` | gleichverteilt aus fünf | — |
| `revenue`, `margin`, `growth` | Bänder des Geschäftsmodells | z. B. Marge 7–30 % |
| `quality` | Band + Rauschen | 10–97 |
| `drift` | 0,45 × (Wachstum − Sektor − 0,6) + Rauschen | −6 … +6 pp |
| `capexPct`, `nwcPct` | fest je Geschäftsmodell | 1,5–12 bzw. −5…35 |
| `levCap`, `askMult` | Band bzw. Markt × Qualität | — |
| `flag` | eine von fünf, mit 55 % | — |
| `ceo/cfo/r3.skill` | `makeSeats()` | 0–4 |
| `plat`, `acc` | 0,6 + Zufall | 0,6–1,8 |
| `addonSize`, `addonComp` | Zufall | — |

Das ist mehr Struktur, als es aussieht — aber es ist fast ausschließlich
**Niveau**, nicht **Konfiguration**. Zwei Unternehmen desselben Sektors
unterscheiden sich darin, *wie gut* sie sind, kaum darin, *woran es liegt*.

### 1.2 Wo die Konfiguration heute in die Strategie eingeht

An genau einer Stelle: `fitOf(id, c)`. Jede Maßnahme liest ein oder zwei Felder:

```
opex  ← Margenlücke zur Branche          (ein Feld)
nwc   ← Kapitalbindungsquote             (ein Feld)
erp   ← EBITDA                           (ein Feld)
ai    ← EBITDA × Prozessreife            (zwei Felder)
pen   ← Assetqualität                    (ein Feld)
exp   ← Sektorwachstum + Drift           (zwei Felder)
ma    ← keine Eignung, dafür addonRisk   (Prozessreife, Leverage, Bissgröße)
```

Der Ertrag einer Maßnahme ist
`initGain(E) × spread × gm × repeatMalus × fitOf × ceilingFactor`.
Von diesen sechs Faktoren hängt genau einer am Unternehmen — die übrigen hängen
am Team, am Katalog oder an der Wiederholungszahl.

### 1.3 Die vier Lücken

**Lücke 1 — Die Unternehmen unterscheiden sich in einer Dimension je Maßnahme.**
`fitOf` spannt zwar weit (0,10 bis 1,70, also Faktor 17), aber jede Maßnahme
liest ihre eigene, von den anderen unabhängige Zahl. Es gibt keine
Unternehmenstypen, nur sieben unabhängige Skalare. Ein Unternehmen ist nie
"der klassische Carve-out mit aufgeblähtem Gemeinkostenblock und drei
ERP-Systemen" — es ist "Margenlücke 3,1 pp, Kapitalbindung 22 %, EBITDA 14".

**Lücke 2 — Es gibt nichts zu entschlüsseln.**
`fitLabel()` gibt die Antwort im Klartext aus, vor dem Start, kostenlos, für
jede Maßnahme: *"hoch — Marge liegt deutlich unter dem Branchenniveau"*. Der
Maßnahmenpicker (`InitPicker`, `components/pel/ui.tsx`) zeigt zusätzlich
Erfolgswahrscheinlichkeit, Dauer und erwarteten Reifegradgewinn auf zwei
Nachkommastellen. Die analytische Arbeit ist bereits erledigt; übrig bleibt,
die größte Zahl anzuklicken. Das ist keine Entscheidung, das ist eine
Sortierung.

**Lücke 3 — Sieben Maßnahmen münden in zwei Skalare.**
Alles läuft über `plat` und `acc`, und die wirken über
`targetMargin()` bzw. `(A − ACC_BENCH) × ACC_GROWTH_PP` auf Marge und Wachstum.
Ein Cost-out und ein ERP-Programm unterscheiden sich in Kosten, Dauer und
Risiko — in ihrer *Wirkung* unterscheiden sie sich nur im Betrag. Reihenfolge
und Wechselwirkung gibt es fast nicht: `accEff = min(acc, People+1, Platform+1)`
und die CFO-Anforderung bei `ai` sind die einzigen beiden Kopplungen im ganzen
Katalog.

**Lücke 4 — Auf dem Wachstumskanal liegt das Signal unter dem Rauschen.**
`GROWTH_NOISE = 6` ergibt über `rng.nrm()` eine Standardabweichung von
3,46 pp auf das annualisierte Wachstum je Halbjahr. Ein vollständig
durchgezogenes Wachstumsprogramm trägt laut Kommentar im Code rund 2,4–2,7 pp
bei. Pro Periode ist die eigene Entscheidung also **nicht** sichtbar; erst über
zehn Halbjahre mittelt sich das Rauschen auf 1,09 pp herunter und das Signal
setzt sich durch. Auf dem Margenkanal ist es umgekehrt: `MARGIN_NOISE = 0,6`
ergibt sd 0,35 pp gegen rund +1,6 pp aus einem Cost-out — dort ist die
Entscheidung sofort ablesbar.

Das ist für diesen Entwurf die härteste Nebenbedingung: **Wer entschlüsseln
soll, muss nachprüfen können, ob er richtig lag.** Ein Hebel, dessen Wirkung im
Rauschen verschwindet, lehrt nichts.

---

## 2 — Zielbild und Entwurfsprinzipien

> Jedes Unternehmen hat einen besten Hebel, einen zweitbesten und drei, die
> nichts bringen. Welcher welcher ist, steht nicht auf der Karte — es steht in
> den Zahlen, und die muss man lesen.

Sechs Prinzipien, an denen sich jeder der folgenden Vorschläge messen lässt:

1. **Konfiguration statt Niveau.** Unternehmen sollen sich darin unterscheiden,
   *woran* es liegt, nicht nur *wie gut* sie sind. Struktur ist lernbar, Niveau
   nicht.
2. **Beobachtbar, nicht sichtbar.** Der Spieler bekommt Belege (Kundenanteile,
   Systemlandschaft, Quoten gegen Branche), nicht das Ergebnis der Auswertung.
   Verdeckte Information ohne Belege wäre Glücksspiel; Belege ohne Auswertung
   sind Arbeit, und Arbeit ist das Spiel.
3. **Information kostet.** Jede Auflösung einer Unsicherheit hat einen Preis in
   Geld, Zeit oder Teamkapazität. Sonst prüft man immer alles — genau die
   Begründung, die schon für `ddCostOf()` im Code steht.
4. **Wechselwirkung statt Katalog.** Der Ertrag einer Maßnahme soll davon
   abhängen, was vorher geschah. Reihenfolge ist die billigste Quelle von
   Tiefe, die es gibt — sie braucht keine einzige neue Maßnahme.
5. **Signal über Rauschen.** Die Differenz zwischen bestem und schlechtestem
   Hebel muss über die Halteperiode deutlich größer sein als die Streuung des
   Ergebnisses. Andernfalls ist die Entschlüsselung Dekoration.
6. **Rückwirkende Lesbarkeit.** Nach jeder Maßnahme und nach jedem Exit muss
   ablesbar sein, *warum* es so kam. Ohne Rückmeldung gibt es keine Lernkurve,
   und ohne Lernkurve keinen Grund für eine zweite Partie.

---

## 3 — Die Vorschläge

### V1 — Konfigurationsvektor: das Unternehmen bekommt eine Struktur

**Idee.** Jedes Zielunternehmen trägt ein Bündel latenter Treiber, aus dem sich
jede Maßnahmeneignung *ableitet*, statt sie einzeln zu würfeln. Die Treiber
werden zweistufig gezogen: das **Geschäftsmodell** (`BOOK`-Eintrag) liefert die
Bänder, die **Einzelfirma** streut darin. Damit ist Branchenwissen über Partien
hinweg lernbar (ein Lohnbeschichter hat *immer* einen Investitionsstau und eine
hohe Fixkostenbasis), die konkrete Firma bleibt trotzdem aufzuklären.

**Mechanik.** Zehn Treiber, jeweils auf 0…1 normiert, an der Deal-Karte:

```ts
cfg: {
  fixCost:      // Fixkostenanteil der Kostenbasis — trägt Skalen- und Cost-out-Effekte
  pricePower:   // Preissetzungsmacht (NICHT quality: ein guter Betrieb kann trotzdem
                // preisnehmend sein — Handelsmarke gegen Eigenmarke)
  custConc:     // Umsatzanteil der drei größten Kunden
  recurring:    // wiederkehrender Umsatzanteil
  sysFrag:      // Systemlandschaft und Standortzahl — Doppelstrukturen
  procMat:      // Prozessreife bei Einstieg (Ausgangspunkt, nicht c.plat)
  orgDepth:     // zweite Führungsebene — trägt Umsetzung ohne den CEO
  wcSlack:      // Abstand der Kapitalbindung zur Best Practice der Branche
  capexBacklog: // Investitionsstau
  fragMkt:      // Fragmentierung des Zielmarkts — Zahl möglicher Add-ons
}
```

Ergänzung in `BOOK` je Geschäftsmodell, als Bänder in derselben Schreibweise
wie `m`, `g`, `rb`:

```ts
{ s: ["Oberflächentechnik", "Galvanik"], cx: 9, nw: 10, m: [14, 20], …,
  cfg: { fixCost: [.7,.9], pricePower: [.2,.4], custConc: [.5,.8],
         recurring: [.3,.5], sysFrag: [.5,.8], procMat: [.2,.4],
         orgDepth: [.1,.3], wcSlack: [.3,.6], capexBacklog: [.6,.9],
         fragMkt: [.6,.9] } }
```

Dreißig Einträge × zehn Bänder ist Fleißarbeit, aber genau die Fleißarbeit, aus
der das Spiel seine Textur bezieht — `BOOK` hat diese Qualität in den
Beschreibungstexten bereits, sie ist nur nicht mechanisch wirksam. Die Prosa in
`d:` und der Vektor müssen dieselbe Geschichte erzählen; der Beschreibungstext
wird damit zum ersten, kostenlosen Beleg.

**Was der Spieler sieht.** Zunächst nichts Neues — V1 allein ändert die Anzeige
nicht, sondern nur die Herkunft der Eignung (siehe V2). Die Beschreibung der
Karte wird lesbar *als Hinweis*: "standortgebundenes Geschäft mit hoher
Anlagenintensität, Kunden im Umkreis von 200 Kilometern" sagt jetzt etwas über
`fixCost`, `capexBacklog` und `custConc` aus.

**Konsequenz.** Aus sieben unabhängigen Skalaren wird ein Unternehmen mit
zusammenhängender Struktur. Ein hoher `fixCost` macht gleichzeitig Cost-out
attraktiv und Expansion riskant; ein hoher `recurring` macht Pricing und KI
attraktiv und Kundendiversifizierung überflüssig. Genau diese Kopplungen sind
das, was es zu entschlüsseln gibt.

**Aufwand.** Mittel. Datenpflege in `BOOK`, neues Feld in `newDeal()`,
`newLandmark()` und beim Closing in `runQuarter.ts` und `PeLeagues.tsx`.
Keine Änderung an der Auswertungsreihenfolge, damit replay-verträglich, wenn
`cfg` für Altbestände aus den vorhandenen Feldern hergeleitet wird (Rückfall
wie bei `nwcBalanceOf`).

---

### V2 — Wirkungsmatrix: Maßnahmen greifen an Treibern an, nicht an einem Skalar

**Idee.** `fitOf` wird aus dem Konfigurationsvektor berechnet statt aus je einem
Feld — und der *Erfolg* einer Maßnahme schreibt in die Treiber zurück, statt nur
`plat`/`acc` zu erhöhen. Damit ist die Wirkung einer Maßnahme in den Zahlen des
Unternehmens nachweisbar und nicht nur in einem abstrakten Reifegrad.

**Mechanik.** Jede Maßnahme bekommt Gewichte auf Treiber (Auszug):

| Maßnahme | trägt bei hohem … | leidet bei hohem … | schreibt zurück auf |
| --- | --- | --- | --- |
| Cost-out | `fixCost`, `sysFrag`, Margenlücke | `procMat` | `−pricePower` (0,05/Auflage), `−fixCost` |
| NWC | `wcSlack`, `nwcPct` | `recurring` | `−wcSlack`, `nwcFix` |
| ERP | `sysFrag`, EBITDA | — | `+procMat`, `−sysFrag`, `capexFix` |
| KI | `procMat`, `recurring`, EBITDA | `sysFrag` | `+procMat` |
| Pricing | `pricePower`, `recurring` | `custConc` | `−pricePower` (Ausschöpfung) |
| Expansion | Marktwachstum, `orgDepth` | `fixCost`, `custConc` | `+custConc`↓, `−orgDepth` (Bindung) |
| Add-on M&A | `fragMkt`, `procMat` | Leverage, `sysFrag` | `+sysFrag`, `+fixCost` |

Formal ersetzt

```ts
fitOf(id, c) = clamp(base[id] + Σ w[id][k] · (cfg[k] − 0.5), 0.10, 1.70)
```

die heutige `switch`-Kaskade. Die bisherigen Eingänge (Margenlücke,
Kapitalbindungsquote, EBITDA) bleiben darin — sie sind beobachtbare Größen und
gehören zu den stärksten Belegen.

**Der wichtige Teil ist die Rückschreibung.** Ein Cost-out senkt `pricePower`:
Wer drei Jahre lang Einkauf bündelt, Servicetechniker abbaut und Standorte
verdichtet, kann anschließend nicht mehr so gut Preise durchsetzen. Ein Add-on
erhöht `sysFrag` und `fixCost`: Der Zukauf bringt ein zweites ERP und eine
zweite Verwaltung mit — und macht damit das *nächste* Cost-out lohnend. So
entsteht ein Programm mit innerer Reihenfolge, ohne dass eine Regel sie
vorschreibt.

**Was der Spieler sieht.** Die Eignung verändert sich sichtbar mit der eigenen
Arbeit. Nach dem Add-on springt die Eignung von Cost-out von "gering" auf
"hoch" — und wer das erkennt, plant ab dann in Sequenzen statt in Einzelzügen.

**Konsequenz.** Die Frage "welche Maßnahme bringt am meisten" wird zu "welche
*Abfolge* bringt am meisten" — dieselbe Frage, die ein Value-Creation-Plan in
der Praxis beantwortet. Und sie hat je Unternehmen eine andere Antwort.

---

### V3 — Evidenz statt Etikett: die Eignung wird zur Schätzung

**Idee.** Der Maßnahmenpicker zeigt nicht mehr das Ergebnis der Auswertung,
sondern die Belege — und daneben eine Schätzung mit Band, dessen Breite von der
eigenen Informationslage abhängt. Genau das Muster, das für den Drift bereits
im Code steht (`driftErrSd`, `driftBandOf`, `driftEstOf`): es ist konsistent,
erprobt und dem Spieler bereits vertraut.

**Mechanik.**

```ts
export const fitErrSd = (c, analysis) => clamp(
  0.55                                   // Grundunsicherheit
  - 0.07 * analysis                      // Analysefähigkeit des Fonds
  - 0.10 * ddModulesOf(c).length         // beauftragte DD-Module (V4)
  - 0.04 * Math.min(c.holdQ ?? 0, 6),    // beobachtete Halbjahre
  0.05, 0.55);

export const fitEstOf = (id, c, analysis) =>
  fitOf(id, c) + (c.fitNoise?.[id] ?? 0) * fitErrSd(c, analysis);
```

`fitNoise` wird **einmal je Beteiligung und Maßnahme** gezogen und festgehalten
— exakt wie `dnoise` beim Drift. Ohne das könnte man die Schätzung durch
Aufrufen der Ansicht neu würfeln, und die Unsicherheit wäre keine.

**Was der Spieler sieht.** Statt *"Eignung: hoch — Marge liegt deutlich unter
dem Branchenniveau"* ein Belegblock plus Schätzung:

```
Cost-out-Programm                                        verlässlich
  Befunde aus dem Datenraum
    Materialquote               48 %   Branche 41 %      ▲ 7 pp
    Personalquote               26 %   Branche 24 %      ▲ 2 pp
    Standorte / ERP-Systeme      4 / 3                   fragmentiert
    Gemeinkosten je Standort    1,8 Mio. €               über Referenz
  Erwarteter Reifegradgewinn   +1,15 ± 0,42
  Erfolgswahrscheinlichkeit      82 %        Dauer  2 Halbjahre
```

Die Eignungsstufe ("hoch/mittel/gering") bleibt — aber als *Schätzung*, die
falsch sein kann, mit sichtbarem Band. Und das Band schrumpft, wenn man dafür
bezahlt.

**Konsequenz.** Der sorgfältige Spieler gewinnt systematisch, nicht zufällig:
Er liest die Belege, bildet eine These und zahlt gezielt für die Auflösung
genau der Unsicherheit, die seine These trägt. Der eilige Spieler klickt
weiter die größte Zahl an — und liegt in etwa einem von vier Fällen daneben.

---

### V4 — Information kostet: Due-Diligence-Module und Diagnose im Bestand

**Idee.** Die heutige Due Diligence ist ein Schalter (`c.dd` ja/nein) mit einem
Preis (`ddCostOf`) und einer Kapazität (`ddCapOf`). Vorschlag: vier Module, die
jeweils einen Teil des Konfigurationsvektors auflösen, unterschiedlich viel
kosten und unterschiedlich viel Teamkapazität binden.

**Mechanik.**

| Modul | Preis | löst auf | Nebeneffekt |
| --- | --- | --- | --- |
| Financial DD | 0,4 × `ddCostOf` | `benchMargin`, Quoten, Drift-Band wie heute | Pflicht für ein Gebot über X |
| Commercial DD | 0,3 × | `pricePower`, `custConc`, `recurring`, Marktwachstum | senkt das Risiko des Post-Closing-Margenschocks |
| Operational DD | 0,3 × | `fixCost`, `procMat`, `capexBacklog`, `wcSlack` | deckt `Investitionsstau` auf, bevor er als Ereignis kommt |
| IT / Tech DD | 0,2 × | `sysFrag`, Voraussetzung für belastbare ERP-/KI-Schätzung | — |

Die Summe aller Module liegt bewusst **über** dem heutigen `ddCostOf` (Faktor
1,2), damit "alles prüfen" eine echte Entscheidung gegen den Preis bleibt und
nicht die Standardantwort wird. `ddCapOf(analysis)` zählt weiterhin Prozesse,
nicht Module — wer die Analysefähigkeit hoch hat, kann breit prüfen, wer sie
niedrig hat, muss wählen, *was* er prüft.

**Diagnose im Bestand.** Nach dem Closing bleiben drei Wege, Unsicherheit zu
senken, mit ausdrücklich unterschiedlichem Preis:

- **Werksbesuch / Managementgespräch** — kostenlos, einmal je Beteiligung und
  Halbjahr, löst *einen* Treiber grob auf (Band halbiert, nicht beseitigt).
- **Benchmarkstudie** — bereits im Code (`decisions.studies`), erweitert auf die
  Treiber des gewählten Moduls, Preis wie heute `DD_COST / 2`.
- **100-Tage-Diagnose** — belegt einen Initiativ-Slot für ein Halbjahr, kostet
  wie ein kleines Programm und löst **alle** Treiber dieser Beteiligung exakt
  auf. Der Preis ist die verlorene Zeit: ein Halbjahr Diagnose ist ein Halbjahr
  ohne Wertsteigerung. Genau der Trade-off, um den es in den ersten hundert
  Tagen nach dem Closing tatsächlich geht.

**Konsequenz.** Die Informationsbeschaffung wird zur eigenen Strategie, und sie
interagiert mit dem Fondsprofil: Der Sourcing-Fonds kauft off-market und weiß
wenig; der analytische Fonds zahlt für Klarheit und trifft besser. Heute ist
`analysis` fast ausschließlich Drift-Schätzgüte plus Prozesskapazität — es
bekäme eine dritte, im Spielverlauf ständig spürbare Wirkung.

---

### V5 — Wechselwirkungen und Sequenzierung

**Idee.** Über die Rückschreibung aus V2 hinaus: ausdrückliche Vorbedingungen,
Synergien und Kollisionen zwischen Maßnahmen. Alles läuft über den
Konfigurationsvektor, also ohne Sonderfälle in der Engine.

**Mechanik.** Drei Arten, je mit Beispiel:

*Vorbedingung (multiplikativ auf den Ertrag).*
KI auf einer fragmentierten Systemlandschaft liefert nicht:
`gain(ai) × (0,35 + 0,65 · (1 − sysFrag))`. Die heutige harte Anforderung
`effSkill(cfo) ≥ 4` bleibt als zweite, personelle Schranke bestehen — aber die
eigentliche Bedingung wird strukturell und damit *herstellbar*: Wer erst ERP
macht, senkt `sysFrag` und macht KI überhaupt erst sinnvoll. Zwei Maßnahmen
werden zu einem Pfad.

*Synergie (additiv auf die Eignung der Folgemaßnahme).*
Nach einem integrierten Add-on steigt `sysFrag` und `fixCost` — die Eignung von
Cost-out steigt entsprechend. Buy-&-Build ohne anschließende Integration ist im
Modell dann das, was es in der Praxis ist: eine Umsatzaddition ohne Marge.

*Kollision (negative Rückschreibung).*
Cost-out senkt `pricePower` je Auflage um 0,05. Das dritte Cost-out auf
demselben Betrieb macht das Pricing-Programm wertlos — und eine Firma, deren
Wert an der Preissetzungsmacht hängt, kaputtzusparen ist der klassische Fehler,
den das Spiel heute nicht abbilden kann. Ebenso: Expansion bindet `orgDepth`;
ein Betrieb ohne zweite Führungsebene, der gleichzeitig expandiert und
restrukturiert, erhöht seine Ereigniswahrscheinlichkeit (CEO wirft hin) statt
zu liefern. Das ist `overstretch()` — aber an der Organisation gemessen statt
an einer Reifegradzahl.

**Was der Spieler sieht.** Im Maßnahmenpicker eine Zeile *"Wirkt auf spätere
Maßnahmen"* mit den ein bis zwei stärksten Rückschreibungen im Klartext:
*"senkt die Preissetzungsmacht — Pricing-Programme danach schwächer"*.
Die Kollision wird angekündigt, nicht versteckt: verdeckt wäre sie eine Falle,
angekündigt ist sie eine Abwägung.

**Konsequenz.** Die Value-Creation-Strategie bekommt eine Zeitachse. Die Frage
ist nicht mehr "welche vier Maßnahmen", sondern "in welcher Reihenfolge über
fünf Jahre" — und die Antwort hängt an der Konfiguration.

---

### V6 — Management als Teil der Konfiguration

**Idee.** Amtsinhaber haben heute eine Zahl (`skill` 0–4) und, bei Neubesetzung,
eine Herkunft (Veteran / A-Player / Entwicklungsprofil). Vorschlag: zusätzlich
ein **Profil**, das bestimmt, *welche Art* von Programm dieses Team liefern
kann.

**Mechanik.** Vier Profile, je Sitz gezogen, mit Wirkung auf
Erfolgswahrscheinlichkeit und Dauer je Risikoklasse:

| Profil | verlässlich (`rel`) | Transformation (`tr`) | marktabhängig (`hard`) |
| --- | --- | --- | --- |
| Sanierer | +0,08 | ±0 | −0,08 |
| Techniker | ±0 | +0,10 | −0,05 |
| Vertriebler | −0,04 | −0,05 | +0,12 |
| Verwalter (Gründer-Nachfolge) | ±0 | −0,10 | −0,05 |

Dazu: `orgDepth` (V1) bestimmt, **wie viele Programme eine einzelne Beteiligung
parallel trägt** — heute ist es fest je eines pro Dimension. Eine Firma mit
tiefer zweiter Führungsebene trägt zwei Performance-Programme gleichzeitig, ein
Ein-Mann-Betrieb keines, solange der CEO-Sitz vakant ist. Die Kapazität des
Fonds (`INIT_SLOTS + floor(operations/2)`) bleibt daneben bestehen: Der Fonds
begrenzt, wie viel er begleiten kann, das Unternehmen, wie viel es aushält.

**Konsequenz.** Die Personalentscheidung und die Maßnahmenentscheidung werden
eine einzige Entscheidung. Wer ein ERP-Programm plant, braucht vorher einen
Techniker im CFO-Sitz — und der kostet Geld, Zeit (`onboard`) und eine
Abfindung für den Vorgänger. Das ist heute nur über die Ratinghöhe abgebildet,
nicht über die Eignung.

---

### V7 — Die Investmentthese als Zusage

**Idee.** Beim Closing wählt der Spieler eine These aus drei bis vier
vorgeschlagenen — und wird an ihr gemessen.

**Mechanik.** Die These ist eine Verteilung über die drei Treiber der Value
Bridge (EBITDA / Multiple / Entschuldung) plus eine Leitmaßnahme, z. B.:

- **Margenexpansion** — 60 % EBITDA aus Marge, Leitmaßnahme Cost-out/ERP
- **Buy & Build** — 60 % EBITDA aus Volumen, Leitmaßnahme Add-on
- **Wachstumsstory** — 40 % EBITDA, 40 % Multiple, Leitmaßnahme Pricing/Expansion
- **Financial Engineering** — 50 % Entschuldung, Leitmaßnahme keine

Wirkung, bewusst klein gehalten, damit die These lenkt und nicht dominiert:

- **Beim Einstieg** — die Kreditgeber preisen sie ein: eine
  Entschuldungs-These bekommt Covenant-Spielraum (`COV_HEADROOM`) und einen
  besseren Zins, eine Wachstums-These nicht.
- **Während der Halteperiode** — das Management zieht mit: Maßnahmen, die zur
  These passen, bekommen +0,05 Erfolgswahrscheinlichkeit; der MEP wird von den
  Amtsinhabern nur angenommen, wenn These und Sweet Equity zusammenpassen.
- **Beim Exit** — die realisierte Value Bridge (`makeBridge`, bereits im Code)
  wird gegen die These gestellt. Wer geliefert hat, was er versprochen hat,
  bekommt einen Aufschlag auf das Exit-Multiple (Käufer kaufen eine schlüssige
  Story, nicht eine Zahlenreihe); wer eine Wachstumsthese über Entschuldung
  eingelöst hat, bekommt ihn nicht.

**Konsequenz.** Die Strategie wird ausgesprochen, bevor sie umgesetzt wird —
und ist damit überhaupt erst bewertbar. Für ein Lernspiel ist das der Kern:
Der Spieler muss eine Hypothese formulieren, nicht nur optimieren.

---

### V8 — Kalibrierung: wann die Entschlüsselung sich lohnt

Ohne diesen Punkt sind V1–V7 Dekoration. Drei Anforderungen, alle messbar über
eine Simulationsreihe wie in `lib/engine/__tests__/fullGame.test.ts`:

**(a) Jedes Unternehmen hat einen Hebel — und keins hat alle.**
Der Vektor wird so normiert, dass die Summe der Eignungen über alle sieben
Maßnahmen je Unternehmen ungefähr konstant bleibt, die *Verteilung* aber
streut. Garantiert: mindestens eine Maßnahme mit Eignung ≥ 1,30 und mindestens
zwei mit ≤ 0,50. Damit gibt es keine toten Assets (jede Firma ist zu etwas gut)
und keine Selbstläufer (nirgends ist alles richtig). Prüfbar als Invariante.

**(b) Die Entscheidung muss das Rauschen überragen.**
Anforderung: Der Unterschied zwischen dem besten und dem schlechtesten
zulässigen Maßnahmenpfad muss über eine Halteperiode von sechs Halbjahren
mindestens das 1,5-Fache der Standardabweichung des Ergebnisses betragen.
Nach Befund 1.4 heißt das konkret: Auf dem **Margenkanal** ist die Bedingung
heute erfüllt, auf dem **Wachstumskanal** nicht. Entweder `GROWTH_NOISE` senken
(6 → 4, sd 3,46 → 2,31 pp) oder `ACC_GROWTH_PP` weiter anheben — mit der im Code
bereits dokumentierten Vorsicht, dass `accEff` die Bindung bleiben soll.
Empfehlung: das Rauschen senken. Es ist die Größe ohne Gegenleistung.

**(c) Information muss sich bezahlt machen.**
Messgröße: die Wertung eines Spielers mit vollständiger Kenntnis des Vektors
gegen einen, der gleichverteilt zufällig wählt, bei sonst gleicher Spielweise.
Liegt der Abstand unter etwa 0,15 Wertungspunkten, trägt die Mechanik nicht und
gehört gekürzt statt ausgebaut. Dieselbe Messung beantwortet auch die Preisfrage
für V4: Ein DD-Modul darf höchstens so viel kosten, wie es im Mittel einbringt.

---

### V9 — Die Lernschleife: warum es so kam

**Idee.** Jede Rückmeldung des Spiels soll den Zusammenhang offenlegen, den der
Spieler vorher erraten musste. Erst damit wird aus Zufall Erfahrung.

**Mechanik.**

- **Nach jeder Maßnahme** — die Meldung in `maturePeople()` nennt den Treiber,
  der getragen oder gebremst hat: *"Cost-out abgeschlossen, Reifegrad +1,32 —
  getragen vom hohen Fixkostenanteil (78 %); die Materialquote liegt jetzt auf
  Branchenniveau."* Heute steht dort nur der Betrag.
- **Beim Exit** — eine Gegenüberstellung: realisierte Value Bridge
  (`makeBridge`) gegen den Base Case beim Einstieg (`lboProjection`, bereits im
  Code) **und** gegen den besten Pfad im Nachhinein. Die dritte Spalte ist die
  eigentliche Lehre: *"Der stärkste Hebel war Pricing (Eignung 1,52) — er wurde
  nie aufgelegt. Cost-out, dreimal aufgelegt, lief ab der zweiten Auflage
  leer."*
- **Nach der Partie** — dieselbe Aufstellung über alle Beteiligungen, als
  wiederkehrendes Muster: *"In vier von sechs Fällen wurde zuerst die Maßnahme
  mit der höchsten Erfolgswahrscheinlichkeit gewählt statt der mit der höchsten
  Eignung."*

**Konsequenz.** Der Wiederspielwert kommt nicht aus neuen Zahlen, sondern
daraus, dass man beim zweiten Mal erkennt, was man beim ersten Mal übersehen
hat. Das ist derselbe Mechanismus, aus dem ein Investment Committee lernt.

---

## 4 — Stufenplan

Drei Stufen, jede für sich lauffähig und für sich messbar. Keine Stufe setzt
voraus, dass die nächste kommt.

### Stufe 1 — Struktur und Belege (kleiner Eingriff, größter Effekt)

- **V1** Konfigurationsvektor in `BOOK`, `newDeal()`, Closing.
- **V2** nur die Leserichtung: `fitOf` liest den Vektor. Noch **keine**
  Rückschreibung, damit die Auswertungsreihenfolge unverändert bleibt.
- **V3** Belegblock im `InitPicker` und auf der Deal-Karte; Eignung als
  Schätzung mit Band, `fitNoise` einmalig je Beteiligung gezogen.
- **V8 (b)** `GROWTH_NOISE` von 6 auf 4, damit die neue Entscheidung überhaupt
  sichtbar wird.

Ergebnis nach Stufe 1: Unternehmen unterscheiden sich strukturell, der Spieler
muss lesen statt sortieren — und die Spielmechanik selbst ist unverändert.

### Stufe 2 — Zeitachse

- **V2** Rückschreibung auf die Treiber.
- **V5** Vorbedingungen, Synergien, Kollisionen.
- **V6** Managementprofile und `orgDepth` als Kapazität je Beteiligung.
- **V9** Rückmeldung je Maßnahme.

Ergebnis nach Stufe 2: Die Strategie ist eine Abfolge, nicht eine Auswahl.

### Stufe 3 — Informationsökonomie und Bewertung

- **V4** DD-Module, Werksbesuch, 100-Tage-Diagnose.
- **V7** Investmentthese als Zusage.
- **V9** Exit-Gegenüberstellung und Partie-Auswertung.

---

## 5 — Was bewusst nicht vorgeschlagen wird

**Mehr Maßnahmen.** Der Katalog hat sieben Einträge und ist damit an der
Grenze des Überschaubaren. Tiefe soll aus Wechselwirkung kommen, nicht aus
Länge. Die einzige Ausnahme, die zu erwägen wäre: **Kundendiversifizierung**
(senkt `custConc`, hebt das Exit-Multiple, entschärft das Ereignis
"Schlüsselkunde kündigt") — sie hat keinen Platzhalter im heutigen Katalog und
wäre die einzige Antwort auf eine Flagge, die das Spiel häufig zieht.

**Verdeckte Information ohne Belege.** Eine Eignung, die man nur durch
Ausprobieren herausfindet, ist kein Rätsel, sondern eine Lotterie mit
Wartezeit. Jeder verdeckte Treiber braucht mindestens zwei beobachtbare
Belege, sonst gehört er nicht ins Spiel.

**Funktionale Mikrosteuerung.** Kein Einkaufs-, Vertriebs- oder
Produktionsmodul mit eigenen Reglern. Das Spiel steht auf der Sicht des
Investors: Er wählt Hebel, Leute und Zeitpunkt — nicht Lieferantenverträge.

**Ein zweiter Regelstand.** Alles hier Vorgeschlagene verändert das
Spielverhalten. Laufende Partien sind bei Einführung zurückzusetzen, statt
`EngineCompat` um ein Dutzend Einträge wachsen zu lassen — die Datei sagt das
über ihre eigene Liste bereits selbst.

---

## 6 — Prüfbarkeit

Jeder Vorschlag, der umgesetzt wird, braucht seinen Test — die Konvention aus
`docs/reality-checks.md` gilt unverändert: *"Ein Befund, der nur hier steht und
nirgends geprüft wird, ist eine Behauptung."*

| Vorschlag | Zusage | Test |
| --- | --- | --- |
| V1 | Jedes erzeugte Unternehmen hat einen vollständigen, in \[0,1\] liegenden Vektor; Altbestände fallen verlustfrei zurück | Invariante über 10.000 `newDeal()`-Ziehungen |
| V2 | `fitOf` bleibt in \[0,10; 1,70\]; Rückschreibungen verändern den Vektor monoton | Eigenschaftstest je Maßnahme |
| V3 | Die Schätzung wird bei wiederholtem Aufruf nicht neu gezogen; das Band schrumpft monoton mit Information | Test wie `irr.test.ts` |
| V5 | KI ohne ERP liefert messbar weniger; drei Cost-outs senken den Pricing-Ertrag unter die Hälfte | Szenariotest |
| V8a | Je Unternehmen mindestens ein Hebel ≥ 1,30 und zwei ≤ 0,50 | Invariante über die Ziehung |
| V8b | Bester minus schlechtester Pfad ≥ 1,5 × sd über sechs Halbjahre | Simulationsreihe, 200 Partien |
| V8c | Vollinformierter Spieler schlägt den zufällig wählenden um ≥ 0,15 Wertungspunkte | Simulationsreihe, 200 Partien |

Berührte Stellen außerhalb der Engine: `components/pel/ui.tsx` (Deal-Karte,
`InitPicker`, Erklärtexte in `ExplainMode.tsx`), `app/season/[id]/turnDraft.ts`
und `turnTypes.ts` (neue Entscheidungsarten für DD-Module und Diagnose),
`lib/engine/replay.ts`. Die SQL-Migrationen sind nicht betroffen — sie bilden
Fondsattribute ab, keine Unternehmen.
