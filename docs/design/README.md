# Design-Entwürfe

Hier liegen Gestaltungsentwürfe, die noch nicht im Spiel stecken. Es sind
eigenständige HTML-Dateien ohne Abhängigkeiten — doppelklicken genügt, ein
Build ist nicht nötig. Die Zahlen darin sind erfundene Beispielbeteiligungen
in den Bändern der Engine (`lib/engine/engine.ts`), keine echten Spielstände.

## `portfolio-deck.html` — Kartendeck für die Beteiligungen

Drei Vorschläge, wie die Portfolio-Ansicht als Kartendeck aussehen könnte
statt als lange Liste untereinander. Alle drei zeigen dieselbe Beteiligung
mit denselben Zahlen; sie unterscheiden sich darin, wovon die Karte erzählt.

- **A · Dossier** — die Karte als Datenblatt. Sechs Trumpfzeilen, jede mit
  eigener Referenz (Marge gegen Benchmark, Wachstum gegen Markt, Leverage
  gegen Covenant), dazu das ▲/▼ der Quartett-Mechanik. Management,
  Performance und Growth als dreigeteilte Konsole am Kartenfuß; Management
  klappt die Besetzung auf.
- **B · Battle** — die Karte als Duell. Ein Dreieck spannt die drei Hebel
  auf, gefüllt die Beteiligung, gepunktet der Sektorschnitt. Die drei Knöpfe
  *sind* die Ecken des Dreiecks.
- **C · Konsole** — die Karte als Werkbank. Querformat, acht Kennzahlen mit
  Referenz, rechts die drei Programme als Schächte mit Restlaufzeit.

Gemeinsam ist allen dreien die Navigation: das Deck ist eine Schiene mit
`scroll-snap-type: x mandatory`. Gewischt und gezogen wird seitwärts, dazu
`←`/`→`, Pfeilknöpfe und eine Namensleiste unter dem Deck. Eine Karte ist
eine Beteiligung und endet, wo sie endet — in ihr wird nicht gescrollt.

Die Gestaltung baut auf dem auf, was schon da ist: Farben aus `SECCOLOR`,
Schriften Inter und JetBrains Mono wie im Spiel, dazu Chakra Petch für
Beschriftungen, dessen gekappte Ecken die angeschrägte Kartenform aufnehmen.
Die Kartenbausteine gibt es bereits als `Stages`, `Pips` und
`PerformanceCompare` in `components/pel/ui.tsx` — das Deck umhüllt sie, es
ersetzt sie nicht. Die Sperre der Programmknöpfe ist dieselbe wie im Spiel:
`INIT_SLOTS = 4` Werkbänke fürs ganze Portfolio.
