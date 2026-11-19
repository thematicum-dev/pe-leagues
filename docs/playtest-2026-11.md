# Agentenpartie vom 10./11.11.2026

Zwei KI-Agenten haben eine vollständige Mehrspielerpartie gegeneinander
gespielt: zwanzig Halbjahre, je ein menschlicher Fondsplatz, drei KI-Fonds,
gerechnet mit `runQuarter()` — demselben Weg wie die Auswertung auf dem Server.
Gespielt wurde über `scripts/agent-match.ts` (`npm run match -- rules`). Jeder
Agent sah nur, was die Oberfläche seinem Platz zeigt, kannte den Quelltext
nicht und sollte gewinnen **und** berichten, wie sich das Spiel spielt.

Agent B spielte bewusst breit (Zukäufe, Managementwechsel, MEP, Studie,
Equity Cure, drei Exit-Wege), Agent A ohne Vorgabe.

## Ergebnis (Startwert 20261110)

| Platz | Fonds | Wertung | TVCC | IRR |
|---|---|---|---|---|
| 1 | Bravo Partners (Agent B) | 1,37 | 2,77× | 18,2 % |
| 2 | Nordkap Capital (KI) | 1,30 | 1,59× | 29,0 % |
| 3 | Alpha Capital (Agent A) | 1,06 | 2,13× | 14,1 % |
| 4 | Hansabruck Partners (KI) | 0,79 | 1,44× | 12,2 % |
| 5 | Aurum Partners (KI) | 0,63 | 1,18× | 9,4 % |

Beide Agenten haben alle zwanzig Halbjahre gespielt; die Partie lief ohne
Absturz und ohne ungültigen Zustand durch.

## Was daraus geändert wurde

Alle Regeländerungen hängen an `EngineCompat.legacyAddonGrowth`, ältere
Halbjahre lassen sich weiter exakt nachrechnen. Tests:
`lib/engine/__tests__/playtestFixes.test.ts`.

| Befund | Ursache | Änderung |
|---|---|---|
| **Zukäufe dominieren alles.** Ein Add-on verdoppelte den NAV in einem Halbjahr (82 → 166, 101 → 244); das Multiple sprang von 8× auf 12,8×. Beide Agenten nannten es unabhängig die eine Strategie, neben der alles andere sinnlos wirkt. | `growthPrem()` rechnete mit der Umsatz-CAGR **samt zugekauftem Umsatz**. Ein Zukauf brachte also die Multiple-Arbitrage und obendrauf bis zu 55 % Wachstumsprämie auf das ganze Unternehmen. | Die Prämie rechnet mit organischem Wachstum (`organicCagrOf`, `orgF`). 30 % des zugekauften Umsatzes zählen als Skalenprämie mit (`ADDON_GROWTH_CREDIT`). |
| CFO im Halbjahr seiner Verpflichtung abgeworben — beide Meldungen untereinander | keine Schonfrist | zwei Halbjahre ohne Abwerbung (`POACH_GRACE`) |
| Maßnahmen über dem Slot-Kontingent verschwanden wortlos (sechs Fälle) | `return` ohne Meldung | Meldung mit Grund: Dimension belegt, Slots voll, Voraussetzung fehlt, Covenant-Abstand |
| Studie auf eine Beteiligung mit Branchenreferenz: nichts passiert, keine Meldung | dito | Meldung, dass nichts beauftragt und nichts berechnet wurde |
| Gebot auf der angezeigten Leverage-Obergrenze als ungültig verworfen (zweimal, einmal entschied es die Auktion) | Anzeige gerundet, Prüfung exakt | Überschreitung bis 0,05× wird auf die Obergrenze gekappt |

**Gemessen** (40 Startwerte, Spielweisen aus `pilotStrategies.ts`, ⌀ Wertung):

| | vorher | organisch, ohne Anrechnung | organisch, 30 % Anrechnung |
|---|---|---|---|
| Mensch mit Zukäufen ("aggr") | 1,02 | 0,56 | 0,85 |
| Aurum Partners (KI) | 1,23 | 0,82 | 1,12 |
| Nordkap Capital (KI) | 0,89 | 0,71 | 0,85 |
| Hansabruck Partners (KI) | 0,71 | 0,68 | 0,69 |

Ganz ohne Anrechnung fällt das Wertungsniveau insgesamt zu stark (die
Benchmark 1,00 wäre kaum noch erreichbar); mit 50 % ändert sich fast nichts.
30 % nimmt dem Zukauf den Automatismus und lässt ihn eine gute Maßnahme
bleiben. Der Wert ist eine Stellschraube — nach den ersten echten Partien
erneut messen.

Vier vermeintliche Fehler lagen am Testwerkzeug, nicht am Spiel, und sind dort
behoben: `keepPct` ist ein Anteil (0–1), die Agenten gaben Prozent an; das
Angebotsrisiko war falsch beschriftet (es ist das Risiko, dass der Verkauf
scheitert — der „verschwundene“ Exit in Halbjahr 20 war die Fusionskontrolle);
die Schlussansicht zeigte die Meldungen des vorletzten Halbjahres; und das
Zukaufsrisiko stand nur für die Referenzgröße da.

## Offen — Entscheidungen, keine Fehler

Nach Wirkung auf das Spielgefühl geordnet.

1. **Die Bewertung ist die wichtigste Zahl und die am wenigsten erklärte.**
   Beide Agenten konnten den NAV nicht ±50 % vorhersagen. Vorschlag: auf der
   Beteiligungskarte eine Zeile „Warum 14,3×“ (Sektor, Qualität,
   Wachstumsprämie, Altbestand) und je Halbjahr „Warum hat sich der NAV
   geändert“. Die Zahlen liegen alle vor (`markMultiple`, `bridgeStep`).
2. **IRR wiegt in der Wertung sehr schwer.** Nordkap wurde mit halbem TVCC
   Zweiter, weil der Fonds früh alles verkauft hat und auf 29 % IRR saß. Das
   ist in `scoreOf` so entschieden und begründet; die Frage ist, ob ein
   KI-Fonds mit dieser Spielweise fast gewinnen soll. Möglich: IRR-Anteil
   erst ab einem Mindest-TVCC voll zählen.
3. **KI-Fonds bieten stark und führen schwach.** Zwei von drei waren ab
   Halbjahr 12–15 vollständig verkauft und sahen dem Rest zu.
4. **Tote Halbjahre in der zweiten Hälfte** (13–19): Portfolio voll, Programme
   laufen, Prozesse offen. Dazu Liquidität, die für keine Plattform reicht und
   sonst nirgends hin kann. Ideen der Agenten: freie Mittel ausschütten
   dürfen, „jetzt verkaufen oder halten“ mit IRR-Wirkung anzeigen.
5. **Gebote werden in der Reihenfolge des Dealflows abgearbeitet**, nicht in
   der des Spielers. Zweimal fiel so das wichtigere Gebot an Kapital oder
   Platz weg, obwohl es gewonnen hätte. Vorschlag: Rangfolge in der Abgabe.
6. **Sektorabschwünge kommen ohne Vorwarnung** und treffen auch eine gerade
   geschlossene Beteiligung voll (Trophy Asset: EBITDA 7,7 → 5,5 im ersten
   Halbjahr). Vorschlag: Ausblick ein Halbjahr voraus.
7. **Ereignismeldungen ohne Zahlen** („Regulatorische Auflage“,
   „Investitionsstau aufgedeckt“ — 8 Mio. € Schulden ohne Betrag in der
   Meldung), und der Abstand zwischen Gebot und Nettoerlös beim Exit ist nicht
   aufgeschlüsselt.
8. **Eigenschaften der Kandidaten** (`flight`, `sponsor`, `day1` …) und die
   Wirkung des MEP waren für beide nicht zu erkennen — in der Oberfläche
   prüfen, ob die Karte sie erklärt.
9. **Sicherheit:** `season_state` enthält den vollen Zustand, auch was die
   Oberfläche verdeckt (Qualität und Marge von Off-Market-Deals vor der Due
   Diligence, das wahre Profil der Kandidaten, den Zustand der Mitspieler).
   Wer die Netzwerkanfragen liest, sieht es. Für einen Wettbewerb mit
   Rangliste gehört das serverseitig gefiltert (eine Sicht je Fondsplatz).

## Wiederholen

```bash
npm run match -- init --dir /tmp/partie --seed 42 --names "A,B"
npm run match -- rules
npm run match -- view   --dir /tmp/partie --slot 0
npm run match -- submit --dir /tmp/partie --slot 0 --file zug.json
npm run match -- wait   --dir /tmp/partie --hy 1
```
