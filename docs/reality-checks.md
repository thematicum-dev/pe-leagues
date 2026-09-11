# Reality Checks

Ein externer Corporate-Finance- und PE-Praktiker hat das Spiel durchgesehen und
acht Punkte aufgeschrieben. Dieses Dokument beantwortet sie, ergänzt sie um zehn
weitere Prüfungen derselben Art und hält für jede fest, was der Code tatsächlich
tut — und was daraufhin geändert wurde.

Die Gliederung ist für jeden Punkt dieselbe:

- **Frage** — was geprüft wird.
- **Befund** — was der Code tut, mit Fundstelle.
- **Konsequenz** — korrekt, bewusste Vereinfachung, oder Fehler und Korrektur.

Jeder Punkt ist in `lib/engine/__tests__/realityChecks.test.ts` festgenagelt, in
derselben Reihenfolge. Ein Befund, der nur hier steht und nirgends geprüft wird,
ist eine Behauptung; ein Test ist eine Zusage.

---

## Aus dem Review

### 1 — Covenant auf bereinigtem, nicht auf berichtetem EBITDA

**Frage.** Testet der Kreditvertrag gegen Adjusted EBITDA?

**Befund.** Ja, und zwar ausschließlich. `stepCompany()` rechnet
`covLev = netDebt / ebitdaOf(c)`, und `ebitdaOf` ist Umsatz × Marge — die Engine
führt gar kein anderes operatives Ergebnis. Alles, was ein berichtetes EBITDA
drücken würde (Programmkosten, Restrukturierung, Personalwechsel), bucht sie über
`bookOff()` unterhalb des EBITDA gegen die Nettoverschuldung. Die
Berichtsansicht leitet daraus das berichtete EBITDA ab, nicht umgekehrt
(`lib/engine/financials.ts`, Konvention 1).

Das ist auch inhaltlich der richtige Weg herum: Testete der Covenant auf dem
berichteten Ergebnis, löste jedes Wertsteigerungsprogramm genau den Bruch mit
aus, den es verhindern soll.

**Konsequenz.** Keine Änderung an der Rechnung. Die Konvention steht jetzt
ausgeschrieben an der Teststelle in `engine.ts` und ist durch einen Test
gesichert, der eine Beteiligung mit hohem Einmalaufwand führt: berichtet reißt
sie den Covenant, bereinigt nicht — und die Engine zählt keinen Bruch.

Zwei Konventionen gehören dazu und sind bewusst so gewählt:

- Getestet wird die **Laufrate der Periode**, annualisiert, nicht ein
  LTM-Durchschnitt. Damit ist der angezeigte Leverage immer der getestete; eine
  zweite Bemessungsgrundlage neben Bewertung und Karte hätte die Anzeige von der
  Wirkung getrennt.
- Die **Add-backs sind unbegrenzt**, weil die Engine kein berichtetes EBITDA
  führt, aus dem sie zu begrenzen wären. In einem echten Kreditvertrag steht dort
  eine Kappe.

### 2 — IRR: Mischung aus realisierten Rückflüssen und Bewertung?

**Frage.** Mischt der IRR realisierte und unrealisierte Beträge?

**Befund.** Ja, mit Absicht. `cashflowsOf()` baut die Since-Inception-Reihe des
Investors: tatsächliche Abrufe negativ, tatsächliche Ausschüttungen positiv, und
der verbleibende NAV plus nicht reinvestierte Liquidität als fiktive
Schlusszahlung zum Stichtag. Das ist der Netto-IRR, den jedes LP-Reporting
ausweist — solange ein Fonds läuft, gibt es keine andere Art, ihn zu messen.

Nach Halbjahr 20 ist der NAV null (`liquidateAll`), die Endwertung steht also auf
einer rein realisierten Zahlungsreihe. Nur die Zwischenstände sind gemischt.

**Konsequenz.** Keine Änderung. Die Herkunft steht jetzt über `cashflowsOf()`,
und der Hinweis, wie sich beides trennen lässt, gehört zur Ansicht: **DPI** zeigt
nur Ausschüttungen, **RVPI** nur NAV, beide je abgerufenem Euro und beide neben
dem TVPI. Ein hoher Zwischen-IRR bei niedrigem DPI ist eine Bewertung, keine
Rendite.

### 3 — Cash Sweep in den Return-Brücken

**Frage.** Wird der Cash Sweep — das Geld, das eine schuldenfreie Beteiligung an
den Fonds ausschüttet — in der Halbjahres-, der Exit- und der Schlussbrücke
richtig berücksichtigt, also der jeweiligen PortCo zugeordnet?

**Befund, Zuordnung: korrekt.** Der Sweep setzt die Nettoverschuldung auf null
und bucht den Betrag als `dist` (`runQuarter`, Abschnitt 3a). In den Brücken
taucht er danach genau einmal auf:

- `bridgeStep()` (Halbjahr): Die Entschuldung misst die Veränderung der
  Nettoverschuldung — die bei null endet —, der ausgeschüttete Überschuss steht
  daneben als eigene Position. Zusammen ergeben sie die volle Cash-Generierung,
  ohne Überschneidung.
- `makeBridge()` (Exit): `dist` trägt die kumulierten Rekapitalisierungen,
  `delev` die Entschuldung bis zum Verkaufsstichtag. `exit = net + recap`.
- `fundBridge()` (Partie): Rekapitalisierungen stehen als eigener Posten im
  realisierten Block — auch die aus Beteiligungen, die noch im Portfolio sind.

**Befund, zwei echte Lücken.** Beim Nachrechnen sind zwei Dinge aufgefallen, die
nicht die Zuordnung, sondern den Betrag betrafen:

1. Der Sweep ging **ungekürzt** an den Fonds, auch wenn ein MEP aufgesetzt war —
   siehe Punkt 11. Damit war der Cash Sweep der offene Weg, Wert am Management
   vorbeizuführen: erst ausschütten, dann verkaufen.
2. Der MOIC realisierter Deals rechnete auf mehreren Wegen gegen `entryEquity`
   statt über `dealMoic()` — siehe Punkt 13. Rekapitalisierungen fielen dort aus
   der Kennzahl heraus, obwohl sie längst beim Investor angekommen waren.

**Konsequenz.** Beides korrigiert (Punkte 11 und 13). Die Zuordnung selbst bleibt
unverändert und ist jetzt durch Tests gesichert — Halbjahresbrücke, Exitbrücke
und Deal-MOIC je einzeln.

### 4 — MEP-Retention, wenn er tief im Geld steht

**Frage.** Warum lässt sich ein Manager abwerben, der auf einem Paket sitzt, das
beim Exit ein Vielfaches bringt?

**Befund.** Tat er, und zwar genauso oft wie einer mit einem wertlosen Paket: Die
Managementbeteiligung halbierte das Abwerberisiko pauschal
(`ltip ? 0.5 : 1`), unabhängig vom Wert. Das ist die Wirkung eines MEP genau
verkehrt herum gedacht.

**Konsequenz.** `retentionFactor(c, market)` ersetzt den Pauschalfaktor. Er läuft
am Gesamtwert der Beteiligung je Euro Einstand:

| Gesamtwert je Euro Einstand | Abwerberisiko gegenüber "kein MEP" |
| --- | --- |
| 0,5× (deutlich unter Einstand) | ~0,68 — der MEP bindet kaum noch |
| 1,0× | 0,50 — wie bisher |
| 1,5× | 0,33 |
| 2,2× und darüber | 0,08 — praktisch vollständige Bindung |

Ganz auf null geht es nicht: Auch ein Paket im Geld hält niemanden, der gehen
will.

### 5 — Recycling nach einem Exit

**Frage.** Recycling von Exiterlösen funktioniert nach einem Exit nicht mehr —
wurde das wieder herausgenommen?

**Befund.** Nein, es ist unverändert da, aber zweifach begrenzt, und beide
Grenzen stehen so im LPA (`recycleRoom()`):

- nur **innerhalb der Investitionsperiode** (bis einschließlich Halbjahr 10);
- kumuliert höchstens **ein Commitment** (`RECYCLE_CAP`).

Außerhalb wird zwingend voll ausgeschüttet. Innerhalb wirkt es bei jedem Exit,
auch beim zweiten und dritten.

Was den Eindruck erzeugt hat: Der Verwendungsdialog erscheint nur, wenn
überhaupt Spielraum besteht — ab Halbjahr 11 also gar nicht mehr, und zwar
kommentarlos. Ein verschwindender Dialog sieht aus wie ein Fehler.

**Konsequenz.** Keine Regeländerung. Die Exitvorschau sagt jetzt in beiden
Modi, woran man ist: wie viel einbehalten werden kann, oder warum nichts —
Investitionsperiode vorbei oder Deckel ausgeschöpft.

### 6 — Fondskapital für Zukäufe

**Frage.** Es sollte möglich sein, ein Add-on mit Eigenkapital aus dem Fonds zu
finanzieren.

**Befund.** War es nicht. Jeder Zukauf war vollständig fremdfinanziert; reichte
die Pro-forma-Verschuldung nicht bis unter die Finanzierungsgrenze, war der
Zukauf schlicht nicht darstellbar — unabhängig davon, wie viel Dry Powder der
Fonds hatte.

**Konsequenz.** Implementiert. `addonCheck(c, market, equity)` teilt den
Kaufpreis in Fremd- und Eigenkapitalanteil; die Pro-forma-Prüfung sieht nur noch
den fremdfinanzierten Teil. Im Maßnahmenkatalog steht dafür ein Schieberegler,
voreingestellt auf `addonEquityNeeded()` — genau den Betrag, den die
Akquisitionsfinanzierung nicht mehr trägt. Ein Zukauf, der nur an der
Finanzierungsgrenze scheitert, ist damit ohne weiteres Zutun darstellbar, und
der Preis steht daneben.

Auch die KI-Fonds nutzen den Weg, gedeckelt auf ein Viertel ihres investierbaren
Kapitals — sonst stünde dem Spieler ein Hebel offen, den die Kohorte nicht kennt.

Das Geld fließt unmittelbar an den Verkäufer weiter und senkt die
Nettoverschuldung der Plattform deshalb nicht; es erhöht die Kostenbasis des
Deals um denselben Betrag. Ein Zukauf wird dadurch nicht billiger, nur
finanzierbar.

### 7 — Alles verkauft: Dry Powder = offenes Commitment, keine Gebühren mehr?

**Frage.** Stimmt das Bild, wenn das Portfolio leer ist?

**Befund, Gebühren: korrekt.** Bis Halbjahr 10 läuft die Management Fee auf dem
**Commitment** — so steht es in jedem LPA, und sie läuft auch dann weiter, wenn
gerade nichts im Portfolio ist. Danach bemisst sie sich am **Einstand des
Restportfolios**; ist alles verkauft, ist die Basis null und es fällt keine
Gebühr mehr an (`runQuarter`, Abschnitt 3b). Teilexits senken die Basis
anteilig, weil `entryEquity` mit dem verkauften Anteil sinkt.

**Befund, Dry Powder: Fehler.** `investableOf()` = offenes Commitment +
einbehaltene Erlöse − Gebührenreserve. `feeReserveOf()` zog von der Reserve
aber noch einmal die einbehaltenen Erlöse ab. Derselbe Euro war damit zweimal
da, und das investierbare Kapital lag um genau die einbehaltenen Erlöse zu hoch
— ein Fonds, der recycelt hatte, konnte mehr zusagen, als er je aufbringen
konnte.

**Konsequenz.** Die Reserve ist jetzt schlicht der Barbetrag der künftigen
Gebühren, unabhängig davon, aus welchem Topf sie bezahlt werden. Mit leerem
Portfolio nach der Investitionsperiode ist Dry Powder damit exakt das offene
Commitment — die Aussage der Frage stimmt jetzt auch rechnerisch.

### 8 — Kann ein Fonds in Carry einen niedrigeren TVPI haben als einer ohne?

**Frage.** Ist der Wasserfall monoton?

**Befund.** Er war es nicht. `carryOf()` rechnete
`gain > pref ? 0.20 * gain : 0` — eine Klippe: Ein Fonds, der die Hurdle um einen
Euro überschritt, verlor schlagartig 20 % seines **gesamten** Gewinns an den GP.
Genau der beschriebene Fall, und er trat regelmäßig ein.

**Konsequenz.** Der übliche europäische Wasserfall mit 100 % Catch-up hat drei
Stufen, und keine davon springt:

| Gewinn | Carry |
| --- | --- |
| ≤ Pref | 0 — die Vorzugsrendite ist noch nicht verdient |
| zwischen Pref und Pref / 0,8 | Gewinn − Pref — Catch-up, jeder weitere Euro geht an den GP |
| ≥ Pref / 0,8 | 20 % des Gewinns |

In einer Zeile: `clamp(gain − pref, 0, CARRY · gain)`. Stetig, monoton, und der
Netto-TVPI fällt nie, wenn der Bruttogewinn steigt. Ein Test fährt den ganzen
Verlauf in Zweierschritten ab und prüft genau das.

---

## Zehn weitere Prüfungen

### 9 — Zinsschranke (§ 4h EStG / ATAD Art. 4)

**Frage.** Ist der Zinsabzug begrenzt?

**Befund.** War er nicht. Zinsaufwand minderte die Bemessungsgrundlage
unbegrenzt; der Steuerschild wuchs linear mit dem Leverage, Fremdkapital
verbilligte sich also mit jedem Turn weiter. Für einen DACH-Buyout ist das keine
Randnotiz, sondern genau die Verzerrung, gegen die der Gesetzgeber die Schranke
gesetzt hat.

**Konsequenz.** `taxOf()` begrenzt den Abzug auf 30 % des bereinigten EBITDA
(`INT_BARRIER`). Bei einem Zinssatz um 6,5 % greift sie ab etwa 4,6×
Nettoverschuldung, mit dem Margin-Grid-Aufschlag (`LEV_STEP`) entsprechend
früher — also genau dort, wo sie hingehört. Ein Zinsvortrag wird nicht geführt:
Was über der Grenze liegt, ist verloren, nicht aufgeschoben. Das ist die
konservative Seite der Vereinfachung und steht als Fußnote unter der
Berichtsansicht.

Getroffen werden die hochverschuldeten Strukturen, und das ist der Punkt: Über
60 nachgespielte Partien mit moderater Finanzierung (0,8 × Leverage-Kapazität)
verschiebt sich der Median-TVPI des Spielers nicht messbar.

### 10 — Add-on: gekauftes gegen geliefertes EBITDA

**Frage.** Kommt nach der Integration genau das EBITDA an, für das bezahlt wurde?

**Befund.** Nein. Gekauft wird EBITDA (`addEb × mult`), geliefert wird im Modell
Umsatz — und die Umrechnung lief über die **Branchenmarge** statt über die
Ist-Marge der Plattform. Eine Plattform mit 21 % Ist-Marge und 14 %
Branchenmarge bekam für denselben Kaufpreis rund die Hälfte mehr EBITDA, als sie
bezahlt hatte: ein Gewinn aus einer Rechenkonvention, nicht aus dem Zukauf. Bei
einer Plattform unter Branchenniveau lief es umgekehrt — dort war jedes Add-on
strukturell wertvernichtend.

**Konsequenz.** Die Umrechnung läuft über `c.margin`. Der Test prüft, dass der
EBITDA-Zuwachs exakt dem bezahlten entspricht.

### 11 — Sweet Equity auf allen Rückflusswegen

**Frage.** Nimmt das Management an jedem Rückfluss teil?

**Befund.** Auf genau einem von sieben Wegen. Der MEP-Abzug (`LTIP_SHARE`) stand
nur im Schlussverkauf des Spielers. Ohne Abzug liefen: Teilexit ins Continuation
Vehicle, Börsengang, Platzierung der Restbeteiligung nach dem Lock-up, Cash
Sweep, Tail-End-Verwertung und **jeder Exit eines KI-Fonds**.

Der letzte Punkt war der teuerste: Die KI setzt regelmäßig MEPs auf, kassierte
die Wirkung (Retention, +0,5 effektives Rating) und zahlte nie dafür. Der
Spieler zahlte.

**Konsequenz.** Jeder Rückfluss läuft durch `exitNetOf()` bzw. `mepCut()` —
Haupt-, Übungs- und Erklärmodus. Die Exitvorschau weist den Abzug als eigene
Zeile aus. Über 60 nachgespielte Partien fällt der Median-TVPI der KI-Kohorte
von 1,49 auf 1,38 — dieser Punkt und die Zinsschranke aus Punkt 9 zusammen. Das
ist kein Nerf, sondern die Rechnung, die sie vorher nicht bezahlt hat.

Was bleibt und bewusst so ist: Das Sweet Equity hat keinen Strike und keinen
Ratchet. Das Management hält 6 % des Eigenkapitals, ohne etwas eingezahlt zu
haben, und nimmt deshalb auch an einem Verlustexit teil.

### 12 — Equity Cure

**Frage.** Lässt sich ein gerissener Covenant heilen?

**Befund.** Nicht. Nach dem ersten Bruch blieb genau ein Halbjahr, und der
einzige Ausweg war der Notverkauf — eine Wahl, die in einem Kreditvertrag so
nicht vorkommt. Sponsoren haben Heilungsrechte, und sie ziehen sie.

**Konsequenz.** Der Fonds kann Eigenkapital in eine Beteiligung nachschießen
(`fundEquityIn`, Entscheidung `equityInjections`). Das senkt die
Nettoverschuldung und erhöht die Kostenbasis um denselben Betrag. Einen eigenen
Heilungsschalter braucht es nicht: Der Covenant wird in `stepCompany()` jede
Periode neu getestet, gesenkte Verschuldung setzt den Bruchzähler also von
selbst zurück. Begrenzt ist die Heilung nicht durch eine Regel, sondern durch
ihren Preis — jeder MOIC danach misst gegen einen höheren Einstand.

In den Brücken steht die Zuführung **nicht** als Entschuldung (sie ist Kapital,
keine Leistung), sondern als eigener Posten neben der Ausschüttung; in der
Fondsaufstellung taucht sie gar nicht auf, weil sie den NAV und das abgerufene
Kapital um denselben Betrag hebt und zum Gewinn nichts beiträgt.

### 13 — MOIC-Basis realisierter Deals

**Frage.** Misst jeder Track-Record-Eintrag gegen dieselbe Basis?

**Befund.** Nein. `dealMoic(c, net) = (net + recapOut) / costLeft` ist die
richtige Rechnung und stand im Schlussverkauf. Vier andere Wege rechneten
`net / entryEquity`: Platzierung der Restbeteiligung, KI-Exits,
Tail-End-Verwertung (nur in der Meldung) und die Exitvorschau des
Mehrspielermodus. Dort fielen Rekapitalisierungen aus der Kennzahl und die durch
einen Teilexit bereits freigesetzte Kostenbasis blieb im Nenner stehen.

**Konsequenz.** Alle Wege benutzen `dealMoic()` und `costLeft`. Gleiches gilt für
die Kostenbasis, die an `applyProceeds()` übergeben wird.

### 14 — Management Fee bei erschöpftem Commitment

**Frage.** Was passiert mit der Gebühr, wenn nichts mehr abrufbar ist?

**Befund.** Korrekt gelöst. `spendFund()` ruft nie über das Commitment hinaus ab;
was ungedeckt bleibt — nach Totalverlusten möglich —, läuft als Verbindlichkeit
auf (`f.accrued`) und wird vor der nächsten Ausschüttung bedient
(`applyProceeds`). Die Gebühr wird dabei genau einmal als Aufwand gezählt, beim
Anfall, nicht bei der Tilgung.

**Konsequenz.** Keine Änderung; durch Tests gesichert, inklusive einer ganzen
Partie mit Zuführungen und Recycling, in der kein Fonds je mehr abruft als
zugesagt.

### 15 — Carry auf unrealisiertem NAV

**Frage.** Carry wird auf einen Gesamtwert gerechnet, der zum großen Teil noch
Bewertung ist — ohne Escrow, ohne Clawback.

**Befund.** So ist es. `carryOf()` rechnet auf `totalValueOf()`, also inklusive
NAV. Das ist die übliche **Accrual**-Darstellung im Reporting, nicht die
tatsächliche Auszahlung; `tvpiOf()` und `dpiOf()` ziehen den Carry-Drag
entsprechend anteilig ab.

**Konsequenz.** Bewusste Vereinfachung, dokumentiert. Ein Escrow-Konto mit
Clawback wäre die vollständige Abbildung, änderte aber am Endstand einer Partie
nichts: Nach Halbjahr 20 ist der NAV null, der Carry also ohnehin vollständig
realisiert.

### 16 — Kostenbasis, Brutto- und Netto-MOIC

**Frage.** Stehen Transaktionskosten und Due Diligence an der richtigen Stelle?

**Befund.** Ja.

- Die Entry Fee (`ENTRY_FEE`, 2 % vom EV) steckt im Equity Ticket und damit in
  `entryEquity`, `costTotal` und `costLeft` — der Deal-MOIC misst also gegen das,
  was der Deal wirklich gekostet hat.
- Due-Diligence-Kosten fallen auf **Fondsebene** an, auch für Deals, die man
  nicht gewinnt. Sie erhöhen das abgerufene Kapital und damit den TVPI-Nenner,
  gehören aber in keine Dealkostenbasis — genau so, wie eine Abort Cost anfällt.
- `grossMoicOf()` misst Auswahl und Wertsteigerung auf Dealebene
  (`(proceeds + NAV) / investedTotal`), der TVPI misst zusätzlich das
  Deployment. Der Abstand zwischen beiden ist die Aussage.

**Konsequenz.** Keine Änderung.

### 17 — Die Zeitkosten: dreimal derselbe Abschlag?

**Frage.** Altbestandsabschlag, Endfälligkeitsdruck und Tail-End-Abschlag greifen
alle in die Haltedauer. Zählt etwas doppelt?

**Befund.** Nein, die drei greifen an verschiedenen Stellen:

- `staleDisc()` hängt an der **Haltedauer der Beteiligung** (ab 4 Jahren, 2 % je
  Halbjahr, gedeckelt bei 20 %) und steckt im Bewertungsmultiple.
- `endPressure()` hängt an der **Restlaufzeit des Fonds** (letzte zwei Jahre) und
  steckt nur im Transaktionsmultiple, nicht im NAV.
- Die Tail-End-Verwertung rechnet `markMultiple − LIQ_DISC`. Das ist exakt
  derselbe Betrag, den `endPressure()` im Halbjahr 20 liefert — nur ohne die
  Verhandlungsprämie, weil ein Zwangsverkäufer keine hat. Kein zusätzlicher
  Abschlag obendrauf.

**Konsequenz.** Keine Änderung.

### 18 — Schuldenstruktur

**Frage.** Wie realistisch ist die Akquisitionsfinanzierung?

**Befund.** Bewusst einfach: ein endfälliges Darlehen, 100 % Cash Sweep, keine
planmäßige Tilgung, keine Laufzeit und damit kein Refinanzierungsrisiko, keine
Zinssicherung, keine Tranchierung in Senior und Junior. Was der Leverage kostet,
läuft über zwei Kanäle — das Margin Grid (`LEV_FREE` / `LEV_STEP`, 85 bp je Turn
über 3,0×) und seit dieser Durchsicht die Zinsschranke aus Punkt 9.

**Konsequenz.** Keine Änderung. Das ist die bewusst gezogene Grenze des Modells:
Eine Unitranche mit PIK-Komponente und Refinanzierungsfenster wäre realistischer,
verlangte dem Spieler aber eine Entscheidungsebene ab, die mit der eigentlichen
Frage des Spiels — wann verkauft man ein Asset, das noch weiterläuft — nichts zu
tun hat. Sie ist hier notiert, damit sie eine Entscheidung bleibt und nicht zum
Versehen wird.

---

## Was sich am Spiel geändert hat

Für laufende Partien relevant, in der Reihenfolge der Wirkung:

1. **Carry-Catch-up** (8). Der Netto-TVPI steigt für Fonds knapp über der Hurdle
   spürbar; die Sprungstelle ist weg.
2. **Sweet Equity auf allen Wegen** (11). Die KI-Kohorte verliert zusammen mit
   Punkt 9 rund einen Zehntelpunkt Median-TVPI — sie zahlt jetzt, was sie vorher
   nur kassiert hat.
3. **Zinsschranke** (9). Hoher Leverage entschuldet langsamer.
4. **Add-on-EBITDA über die Ist-Marge** (10). Zukäufe liefern genau das, was sie
   kosten — je nach Plattform mehr oder weniger als vorher.
5. **Fondskapital für Zukäufe und Equity Cure** (6, 12). Zwei neue
   Entscheidungen, beide mit einem Preis in der Kostenbasis.
6. **Dry Powder ohne Doppelzählung** (7). Wer recycelt hat, sieht ein niedrigeres
   investierbares Kapital — das richtige.
7. **MEP-Retention am Wert** (4). Ein MEP im Geld bindet, einer unter Wasser
   nicht.
8. **MOIC-Basis vereinheitlicht** (13).

Die beiden Regeländerungen, die den Zufallsstrom nicht, wohl aber die Beträge
eines bereits ausgewerteten Halbjahres verschieben, tragen Schalter in
`EngineCompat` (`legacyNoIntBarrier`, `legacyAddonBenchMargin`) und stehen in
`LEGACY_COMPAT`, damit sich alte Halbjahre weiterhin exakt nachrechnen lassen
(`lib/engine/replay.ts`).
