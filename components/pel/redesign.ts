/* Redesign v1 (November 2026)

   Eine Stilschicht, die nach allen anderen Spiel-Styles geladen wird (siehe CSS in
   ui.tsx). Sie ändert Typografie, Flächen, Formen und die Handlungsfarbe und zieht
   den hellen Modus durch Kopfleiste, Tableiste und die Sheets von Draft und Battle
   Card. Inhalte, Bilder und Tokenwerte bleiben unverändert.

   Die Selektoren beginnen mit .pel.pel statt .pel: Die doppelte Klasse hebt die
   Spezifität genau so weit an, dass die Regeln hier gegen die gleichlautenden in
   ui.tsx, battle.tsx und draft.tsx gewinnen. !important steht nur dort, wo ein
   Inline-Style (Link in der Kopfleiste) oder eine Zustandsregel mit höherer
   Spezifität (Großschreibung, Randstreifen der Meldungen, Zellrahmen der
   Leitzahlen) zu überschreiben ist.

   Entwurf und Gegenüberstellung: Figma-Datei „PE-Leagues – Ist-Stand“, Seite
   „Redesign v1“; Tokens in docs/design/figma-tokens.json. */
export const REDESIGN_CSS = `
/* ==========================================================================
   PE-Leagues · Redesign v1
   Grundsätze:
   1. Ruhe statt Lärm: Beschriftungen in normaler Schreibweise, 11–12 px,
      keine gesperrten Großbuchstaben mehr.
   2. Flächen statt Rahmen: Gruppen entstehen durch Tonwert (card / shade)
      und Abstand, nicht durch 1-px-Linien um jede Zahl.
   3. Eine Hauptzahl je Block: groß, Inter mit Tabellenziffern. Mono nur noch
      für dichte Zahlenreihen.
   4. Einheitliche Formen: Karten 24 px, Innenflächen 16 px, Knöpfe 14 px,
      Chips rund. Abstände im 4-px-Raster, Seitenrand 16 px.
   5. Gold ist die Handlungsfarbe: Primärknöpfe, aktive Tabs, Regler.
   Bilder von Firmen und Managern bleiben unverändert.
   ========================================================================== */

.pel.pel {
  --r: 16px;
  --rcard: 24px;
  --rbtn: 14px;
  --num: "Inter", system-ui, sans-serif;
  --cta: #F2C14E;          /* Handlungsfarbe, in beiden Themes gleich */
  --oncta: #12201F;
  letter-spacing: -0.006em;
}

/* ---------- Typografie ---------- */
/* Beschriftungen in normaler Schreibweise. Großbuchstaben bleiben nur bei
   Abzeichen, die wie ein Siegel wirken: Stufe (GOLD), ASSESSMENT, MOIC, Rollen. */
.pel.pel :is(.eyebrow, .stat, table.cmp th, table.cmp tr.seg td, table.cmp tr.grp button, table.fin th small,
  table.fin tr.head td.rl, .tag, .tabs button, .kpil, .bpill, .bstate, .bmeta, .bheadline .l, .bsech .r, .btilelab,
  .bpowerlab, .bscore .l, .bseat .rn, .bablab, .bshelfmoic .l, .bcard.hold .bicons .l, .blever .f,
  .dhead .sub, .darch, .din.pad h4, .brhead .sub, .brtl, .bflab, .bmlab) {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-size: 11.5px;
  font-weight: 500;
}
.pel.pel .bcard.hold .bsech h4 { text-transform: none; letter-spacing: -0.015em; font-size: 16px; }
.pel.pel .hint { font-size: 12.5px; line-height: 1.55; }
.pel.pel h3, .pel.pel h4 { letter-spacing: -0.02em; }
.pel.pel .bsech h4 {
  font-size: 16px; font-weight: 650; text-transform: none; letter-spacing: -0.015em; color: var(--ink);
}
.pel.pel .bsech { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.pel.pel .bsech .r { color: var(--ink2); }

/* ---------- Kopfleiste ---------- */
.pel.pel > .bar { padding: 12px 20px 14px; box-shadow: none; border-bottom: 1px solid var(--pline); }
.pel.pel .cockzeit { margin: -12px -20px 2px; padding: 8px 16px 9px; }
.pel.pel .cockgrp { padding: 10px 0 0; margin-top: 0; }
.pel.pel .cockgrp + .cockgrp { border-top: 1px solid var(--pline); margin-top: 12px; padding-top: 12px; }
.pel.pel .bar .stat { color: var(--pmute); opacity: 1; margin-bottom: 1px; }
.pel.pel .bar .statv {
  font-family: var(--num); font-variant-numeric: tabular-nums; font-size: 24px; font-weight: 650;
  letter-spacing: -0.03em; line-height: 1.15; margin-top: 0;
}
.pel.pel .bar .statv .delta { font-size: 12px; font-weight: 600; margin-left: 8px; letter-spacing: 0; vertical-align: 3px; }
.pel.pel .cockkpi {
  font-family: var(--num); font-variant-numeric: tabular-nums; font-size: 12.5px; color: var(--psoft); opacity: 1;
  display: flex; gap: 16px; margin-top: 4px;
}
.pel.pel .cockkpi span { white-space: nowrap; }
/* Die Tail-End-Vorschau ist ein ganzer Satz in einem Element und muss umbrechen dürfen. */
.pel.pel .cockkpi { flex-wrap: wrap; }
.pel.pel .cockkpi > span.ox { white-space: normal; }
.pel.pel .bar .barrow button.mono {
  font-family: var(--num) !important; font-size: 13px; font-weight: 600; color: var(--pgold) !important;
  text-decoration: none !important; min-height: 0;
}

/* ---------- Karten, Meldungen ---------- */
.pel.pel .card,
.pel.pel .news {
  border: 0; border-radius: var(--rcard); box-shadow: none; margin: 16px; background: var(--card);
}
.pel.pel .card h3 { padding: 20px 20px 12px; font-size: 18px; font-weight: 650; }
.pel.pel .news .nh { padding: 16px 20px 12px; border-bottom: 0; }
.pel.pel .news .eyebrow { font-size: 14px; font-weight: 650; color: var(--ink); }
.pel.pel .item {
  border-left: 0 !important; border-bottom: 0; padding: 10px 20px; gap: 14px; font-size: 13.5px; line-height: 1.5;
}
.pel.pel .item:last-child { padding-bottom: 18px; }
.pel.pel .item .em {
  width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--shade); font-size: 16px; line-height: 1;
}
.pel.pel .item.neg .em { background: color-mix(in srgb, var(--ox) 18%, var(--card)); }
.pel.pel .item.pos .em { background: color-mix(in srgb, var(--teal) 18%, var(--card)); }
.pel.pel .item.tip .em { background: color-mix(in srgb, var(--gold) 18%, var(--card)); }

/* Tabellen in Karten */
.pel.pel .card table th { text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 500; }

/* ---------- Knöpfe und Regler ----------
   Nur Aktionsknöpfe. Karten, Porträts, Tabs und Info-Punkte sind technisch
   auch <button>, behalten aber ihre eigene Gestalt. */
.pel.pel :is(:is(button:not([class]), button[class=""]):not(table button):not(.barrow button):not(.ddots button):not(.tabs button), button.solid, button.cta-big, button.ox, .bacts button, .dbar button, .sheet .row button) {
  border-radius: var(--rbtn); min-height: 46px; font-weight: 600; font-size: 14px; letter-spacing: -0.005em;
}
.pel.pel :is(:is(button:not([class]), button[class=""]):not(table button):not(.barrow button):not(.ddots button):not(.tabs button), .bacts button:not(.solid):not(.cta-big):not(.ox)) {
  border-color: transparent; background: var(--shade); color: var(--ink);
}
.pel.pel :is(button.solid, button.cta-big),
.pel.pel .dbar button.solid {
  background: var(--cta); border-color: var(--cta); color: var(--oncta); min-height: 52px;
  font-size: 15px; font-weight: 650; box-shadow: 0 10px 24px -14px var(--cta);
}
.pel.pel button.infb { background: transparent; }
.pel.pel input[type=range] { accent-color: var(--gold); }

/* ---------- Tableiste ---------- */
.pel.pel .tabs { border-top: 1px solid var(--pline); box-shadow: none; }
.pel.pel .tabs button {
  text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 550; padding: 10px 4px 14px; background: transparent;
}
.pel.pel .tabs button svg { width: 21px; height: 21px; }
.pel.pel .tabs .ind { height: 3px; width: 33.333%; background: transparent; box-shadow: none; }
/* Die alte Markierung des aktiven Tabs (Innenschatten oben) entfällt, der Strich übernimmt. */
.pel.pel .tabs button.on { box-shadow: none; }
/* Der Indikator wandert per translateX um seine eigene Breite, er muss also ein
   Drittel breit bleiben. Der sichtbare, kürzere Strich sitzt darin. */
.pel.pel .tabs .ind::after {
  content: ""; position: absolute; top: 0; left: 27%; right: 27%; height: 3px;
  border-radius: 0 0 3px 3px; background: var(--gold);
}

/* ---------- Deal- und Beteiligungskarten ---------- */
.pel.pel .bcard {
  border: 0; border-radius: var(--rcard); margin: 16px 16px 24px;
  box-shadow: 0 24px 48px -32px color-mix(in srgb, var(--own) 80%, transparent);
}
.pel.pel .bcard .bedge { height: 3px; }
.pel.pel .bhero { padding: 18px 20px 20px; min-height: 248px; }
.pel.pel .bpill, .pel.pel .bstate { padding: 6px 12px 6px 9px; font-weight: 600; }
.pel.pel .bname { font-size: 27px; font-weight: 700; letter-spacing: -0.04em; line-height: 1.08; }
.pel.pel .bclaim { font-size: 14px; line-height: 1.5; color: color-mix(in srgb, var(--ink) 78%, transparent); }

/* Drei Leitzahlen: eine ruhige Fläche statt drei gerahmter Zellen */
.pel.pel .bheadline {
  margin: 0 16px; padding: 4px 0; border: 0; border-radius: var(--r); background: var(--shade);
  display: grid; grid-template-columns: repeat(3, 1fr);
}
.pel.pel .bheadline > div {
  border: 0 !important; padding: 12px 10px 13px 12px; text-align: left; display: flex; flex-direction: column; justify-content: space-between;
}
.pel.pel .bheadline > div + div { box-shadow: inset 1px 0 0 var(--rule); }
.pel.pel .bheadline .l { color: var(--ink2); display: block; margin-bottom: 4px; min-height: 0; line-height: 1.3; font-size: 11.5px; }
.pel.pel .bheadline .v {
  font-family: var(--num); font-variant-numeric: tabular-nums; font-size: 15.5px; font-weight: 650; letter-spacing: -0.025em; margin-top: 0;
}

/* Vier Kennzahlen: Kacheln mit Zeichen links, Wert rechts */
.pel.pel .bicons { grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px 16px 4px; }
.pel.pel .bicons > div {
  display: grid; grid-template-columns: 36px 1fr; column-gap: 12px; align-items: center; text-align: left;
  background: var(--shade); border-radius: var(--r); padding: 12px;
}
.pel.pel .bicons .ic { grid-row: 1 / span 3; margin: 0; width: 36px; height: 36px; border: 0; border-radius: 11px; }
.pel.pel .bicons .l { font-size: 11.5px; }
.pel.pel .bicons .v {
  font-family: var(--num); font-variant-numeric: tabular-nums; font-size: 17px; font-weight: 650; margin-top: 1px;
}
.pel.pel .bicons .s { font-size: 11px; margin-top: 1px; }
.pel.pel .bicons .s.lock { justify-self: start; border: 0; padding: 2px 8px; font-size: 10.5px; }

/* Abschnitte */
.pel.pel .bsec { padding: 24px 20px 0; }
.pel.pel .bsec.flush > .bsech { padding: 0 20px; }
.pel.pel .bmore { margin: 16px 16px 0; border: 0; border-radius: var(--r); background: var(--shade); }
.pel.pel .bmore > summary { padding: 14px 16px; font-size: 14px; }
.pel.pel .bmore > summary .mi { border: 0; }

/* Kennzahlenkacheln */
.pel.pel .bstats { gap: 8px; padding: 16px 16px 0; }
.pel.pel .btile { border: 0; border-radius: 14px; background: var(--shade); padding: 12px; }
.pel.pel .btileval { font-family: var(--num); font-variant-numeric: tabular-nums; font-size: 16px; font-weight: 650; }
.pel.pel .btilesub { font-size: 11px; }

/* Underwriting */
.pel.pel .bfoot {
  margin: 0 16px; border: 0; border-radius: var(--r); background: var(--shade); padding: 16px;
}
.pel.pel .bdial + .bdial { margin-top: 14px; }
.pel.pel .slrow { font-size: 13px; }
.pel.pel .slval { font-family: var(--num); font-variant-numeric: tabular-nums; font-weight: 650; font-size: 14px; }
.pel.pel .bfnums { border-top: 1px solid var(--rule); margin-top: 14px; padding-top: 10px; }
.pel.pel .bfrow { padding: 4px 0; font-size: 13px; }
.pel.pel .bfval { font-family: var(--num); font-variant-numeric: tabular-nums; font-weight: 650; }
.pel.pel .bpower { border-top: 1px solid var(--rule); margin-top: 10px; padding-top: 12px; }
.pel.pel .bpowerval { font-family: var(--num); font-variant-numeric: tabular-nums; font-size: 34px; font-weight: 700; letter-spacing: -0.04em; }
.pel.pel .bacts { padding: 16px 16px 0; }
.pel.pel .bend { height: 20px; }

/* Beteiligungskarte: Messleisten und Medaillon */
.pel.pel .bmeters { gap: 8px; }
.pel.pel .bmrow { border: 0; background: var(--shade); border-radius: 14px; }
.pel.pel .bmedal .v { font-family: var(--num); font-variant-numeric: tabular-nums; }
.pel.pel .bshelf { border: 0; border-radius: var(--r); background: var(--card); }

/* Regler: Griff in Gold, Spur als ruhige Linie */
.pel.pel :is(.bcard, .bfoot) input[type=range]::-webkit-slider-runnable-track { height: 4px; background: color-mix(in srgb, var(--ink) 14%, transparent); }
.pel.pel :is(.bcard, .bfoot) input[type=range]::-webkit-slider-thumb {
  width: 22px; height: 22px; margin-top: -9px; background: var(--cta); border: 3px solid var(--card);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--gold) 60%, transparent), 0 4px 10px rgba(0,0,0,.35);
}

/* Beteiligungskarte: dieselben Kacheln wie im Dealflow */
.pel.pel .bcard.hold .bicons > div { border: 0; background: var(--shade); }
.pel.pel .bcard.hold .bicons .ic { border: 0; }


/* ==========================================================================
   Heller Modus
   Kopfleiste, Tableiste und die Sheets von Draft und Battle Card waren in
   beiden Themes dunkel (--panel). Im hellen Modus wirkten sie wie ein
   Fremdkörper. Statt jedes Element einzeln zu überschreiben, werden die
   Panel-Tokens in genau diesen Bereichen auf die hellen Theme-Farben gelenkt:
   alles darin folgt automatisch.
   ========================================================================== */
.pel.pel:not(.dark) > .bar,
.pel.pel:not(.dark) .tabs,
.pel.pel:not(.dark) .ddraft {
  --panel: var(--card);
  --onpanel: var(--ink);
  --ptext: var(--ink);
  --pmute: var(--ink2);
  --psoft: color-mix(in srgb, var(--ink) 72%, var(--card));
  --pline: var(--rule);
  --pshade: var(--shade);
  --pteal: var(--teal);
  --pgold: var(--gold);
  --pox: var(--ox);
}
.pel.pel:not(.dark) .ddraft { --panel: var(--paper); background: var(--paper); color: var(--ink); }
.pel.pel:not(.dark) > .bar { background: var(--card); color: var(--ink); }
.pel.pel:not(.dark) .theme { border-color: var(--rule); color: var(--ink); }
.pel.pel:not(.dark) .theme:hover { background: var(--shade); color: var(--ink); }
.pel.pel:not(.dark) .tabs { background: var(--card); border-top-color: var(--rule); }
.pel.pel:not(.dark) .tabs button { color: var(--ink2); }
.pel.pel:not(.dark) .tabs button.on { color: var(--ink); }
.pel.pel:not(.dark) .waitbar .wroster li { border-color: var(--rule); color: var(--ink2); }
/* Abwählen im Draft: auf hellem Sheet als ruhige Fläche */
.pel.pel:not(.dark) .dbar button:not(.solid):not(.ox) { background: var(--shade); border-color: transparent; color: var(--ink); }

/* ---------- Hover ----------
   Die alten Regeln invertierten jeden Knopf (ui.tsx: .pel button:hover), färbten
   den Primärknopf türkis und den Draft-Knopf dunkelgold. Hier bleibt jeder Knopf
   in seiner Farbe; nur Geräte mit echtem Zeiger bekommen eine leichte Aufhellung.
   Auf Touch-Geräten bleibt :hover nach dem Tippen stehen, deshalb keine Flächen. */
.pel.pel :is(button.solid, button.cta-big):hover:not(:disabled),
.pel.pel .dbar button.solid:hover:not(:disabled) {
  background: linear-gradient(180deg, color-mix(in srgb, var(--cta) 82%, #fff), var(--cta) 55%, color-mix(in srgb, var(--cta) 88%, #8a5b06));
  border-color: var(--cta); color: var(--oncta); filter: none;
}
.pel.pel :is(:is(button:not([class]), button[class=""]):not(table button):not(.barrow button):not(.ddots button):not(.tabs button), .bacts button:not(.solid):not(.cta-big):not(.ox)):hover:not(:disabled) {
  background: var(--shade); border-color: transparent; color: var(--ink);
}
.pel.pel .tabs button:hover { background: transparent; }
@media (hover: hover) {
  .pel.pel :is(button.solid, button.cta-big):hover:not(:disabled),
  .pel.pel .dbar button.solid:hover:not(:disabled) { filter: brightness(1.06); }
  .pel.pel :is(:is(button:not([class]), button[class=""]):not(table button):not(.barrow button):not(.ddots button):not(.tabs button), .bacts button:not(.solid):not(.cta-big):not(.ox)):hover:not(:disabled) {
    background: color-mix(in srgb, var(--ink) 9%, var(--shade));
  }
  .pel.pel .tabs button:hover { color: var(--onpanel); }
}

/* ---------- Nachträge aus dem Spieltest ----------
   Stellen, die erst beim Durchspielen sichtbar wurden. */

/* Kopfleiste im Übungsmodus: drei Werte in einer Zeile neben den Knöpfen.
   Kleiner als in der Mehrspielerpartie, sonst laufen "18,4 Mio. €" und
   "20/20" ineinander. Die Kennzahlzeilen darunter kamen als Inline-Style mit
   10,5 px und 55 % Deckkraft. */
.pel.pel > .bar .barrow:has(> .theme) { align-items: flex-end; gap: 12px; }
.pel.pel > .bar .barrow:has(> .theme) .statv { font-size: 20px; }
.pel.pel > .bar .barrow + .barrow,
.pel.pel > .bar .barrow.mono {
  font-family: var(--num) !important; font-variant-numeric: tabular-nums;
  font-size: 12px !important; opacity: 1 !important; color: var(--psoft); margin-top: 6px !important;
}
.pel.pel > .bar .barrow + .barrow .mono { font-family: var(--num); }

/* Tombstone (Endabrechnung, Financial Statements, Verwendung der Erlöse):
   bleibt das Signaturelement mit feiner Goldlinie, aber in der neuen
   Formensprache und ohne gesperrte Großbuchstaben. */
.pel.pel .tomb {
  border: 0; border-radius: var(--rcard); padding: 24px 20px 22px; margin: 16px;
  box-shadow: 0 18px 40px -28px var(--glow);
}
.pel.pel .tomb:before { inset: 6px; border-radius: 18px; border-color: color-mix(in srgb, var(--pgold) 45%, transparent); }
.pel.pel .tomb .sub {
  font-size: 12.5px; letter-spacing: 0; text-transform: none; line-height: 1.5; color: var(--psoft);
}
.pel.pel .tomb .sub:first-child { font-size: 13px; font-weight: 650; color: var(--pgold); }
.pel.pel .tomb .amt { font-family: var(--num); font-variant-numeric: tabular-nums; font-weight: 700; letter-spacing: -0.04em; }

/* Halbjahresbericht: Kacheln auf Flächen statt eines Rasters mit Linien */
.pel.pel .brhead .sub { font-size: 12.5px; letter-spacing: 0; text-transform: none; font-weight: 650; }
.pel.pel .brgrid { gap: 8px; background: transparent; border: 0; }
.pel.pel .brtile { background: var(--shade); border-radius: 14px; padding: 12px; }
.pel.pel .brtv { font-family: var(--num); font-variant-numeric: tabular-nums; font-size: 18px; font-weight: 650; letter-spacing: -0.02em; }
.pel.pel .brtd { font-family: var(--num); font-size: 11.5px; }
.pel.pel .brlist { border: 0; border-radius: var(--r); background: var(--card); overflow: hidden; }
.pel.pel .brtodo { border: 0; border-radius: 14px; background: color-mix(in srgb, var(--gold) 10%, var(--shade)); }

/* Im hellen Modus folgen auch Tombstone und Berichtskopf dem Theme */
.pel.pel:not(.dark) .tomb,
.pel.pel:not(.dark) .brhead {
  --panel: var(--card);
  --onpanel: var(--ink);
  --psoft: color-mix(in srgb, var(--ink) 72%, var(--card));
  --pgold: var(--gold);
  --pteal: var(--teal);
  --pox: var(--ox);
}
.pel.pel:not(.dark) .brchip { border-color: var(--rule); background: var(--shade); }

/* Kontenblätter mit Sätzen statt Zahlen (Maßnahmenkatalog, Zukaufsprüfung,
   Kapitalzuführung): Inter statt Mono. Mono brach dort Sätze wie
   "+1.18 (streut 0.7–1.1×)" mitten in der Zahl um. Zahlen bleiben über
   Tabellenziffern bündig. Reine Zahlentabellen (.ledger ohne .fix) bleiben Mono. */
.pel.pel .ledger.fix td:last-child { font-family: var(--num); font-variant-numeric: tabular-nums; font-weight: 550; }
.pel.pel .ledger.fix td.lab { color: var(--ink2); }

/* Primärknopf mit leichtem Goldverlauf und Lichtkante: die Hauptaktion soll
   nach Belohnung aussehen, nicht nach einer flachen Fläche. */
.pel.pel :is(button.solid, button.cta-big):not(:disabled),
.pel.pel .dbar button.solid:not(:disabled) {
  background: linear-gradient(180deg, color-mix(in srgb, var(--cta) 82%, #fff), var(--cta) 55%, color-mix(in srgb, var(--cta) 88%, #8a5b06));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 10px 24px -14px var(--cta);
}

/* Coach im Erklärmodus: randlose Karte mit warmer Goldfläche statt dünnem
   Goldrahmen, Schrittangabe in normaler Schreibweise */
.pel.pel .coach {
  border: 0; border-radius: 20px; padding: 18px 18px 16px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--gold) 16%, var(--card)), color-mix(in srgb, var(--gold) 6%, var(--card)) 70%);
  box-shadow: 0 16px 36px -28px var(--gold);
}
.pel.pel .coach .ceyebrow { font-size: 12px; letter-spacing: 0; text-transform: none; font-weight: 650; }
.pel.pel .coach h4 { font-size: 17px; font-weight: 650; }
.pel.pel .coach .why { border-left-width: 3px; border-radius: 2px; }

/* ---------- Schmale Handys ----------
   Gerätetest: Bei 360 px (Galaxy S8) fehlten den drei Leitzahlen 4 px, bei
   320 px (iPhone SE der ersten Generation) bis zu 18 px, den Beschriftungen
   der Kennzahlkacheln bis zu 36 px. Vor dem Redesign passte alles; die
   größeren Zahlen und Innenabstände brauchen hier eine kleinere Stufe. */
@media (max-width: 380px) {
  .pel.pel .bheadline > div { padding: 11px 6px 12px 8px; }
  .pel.pel .bheadline .v { font-size: 14px; letter-spacing: -0.03em; }
  .pel.pel .bicons { gap: 6px; padding: 8px 12px 4px; }
  .pel.pel .bicons > div { grid-template-columns: 28px 1fr; column-gap: 8px; padding: 10px 9px; }
  .pel.pel .bicons .ic { width: 28px; height: 28px; border-radius: 9px; }
  .pel.pel .bicons .ic .bsi { width: 16px; height: 16px; }
  .pel.pel .bicons .l { font-size: 11px; }
}
@media (max-width: 340px) {
  .pel.pel .bheadline .v { font-size: 12.5px; letter-spacing: -0.035em; }
  .pel.pel .bheadline .l { font-size: 10.5px; }
  .pel.pel .bicons > div { grid-template-columns: 1fr; }
  .pel.pel .bicons .ic { display: none; }
  .pel.pel .bicons .v { font-size: 15px; }
}

/* Draft und Battle Card: Die Aktionsleiste klebt am unteren Rand des Sheets.
   Gerätetest: Auf dem iPhone SE (667 px) und dem iPhone 15 Pro mit
   Safari-Leisten (659 px) lag sie rund 80 px unter dem sichtbaren Bereich,
   weil die Karte mindestens 480 px hoch ist — die eigentliche Entscheidung
   war erst nach dem Scrollen zu sehen. */
.pel.pel .ddraft .dbar {
  position: sticky; bottom: 0; z-index: 4;
  margin-top: 6px; padding-top: 18px; padding-bottom: max(14px, env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to bottom, transparent, var(--panel) 34%);
}
/* Der Innenabstand des Sheets unten wandert in Leiste und Hinweis — sonst
   klebt die Leiste über einem Streifen, durch den die Karte durchscheint. */
.pel.pel .ddraft { padding-bottom: 0; }
.pel.pel .ddraft > :last-child:not(.dbar) { padding-bottom: max(16px, env(safe-area-inset-bottom, 0px)); }

/* ---------- Kompaktes Cockpit (20.11.2026) ----------
   Vier Werte in einer Zeile, darunter ein Schalter für die übrigen
   Kennzahlen. Vorher stand jeder Wert in 24 px mit eigener Zeile darunter. */
.pel.pel .cockmain {
  display: grid; grid-template-columns: 1fr auto 1.25fr auto; gap: 4px 14px; align-items: end; padding-top: 10px;
}
.pel.pel .cockmain > div:nth-child(2), .pel.pel .cockmain > div:nth-child(4) { text-align: right; }
.pel.pel .cockmain .stat { font-size: 11px; }
.pel.pel .bar .cockmain .statv { font-size: 19px; white-space: nowrap; }
.pel.pel .bar .cockmain .statv .delta { font-size: 10.5px; margin-left: 4px; vertical-align: 2px; }
.pel.pel .cockfoot { display: flex; align-items: center; gap: 12px; margin-top: 8px; min-width: 0; }
.pel.pel .cocktoggle {
  display: inline-flex; align-items: center; gap: 5px; flex: none;
  min-height: 0; padding: 4px 10px; border-radius: 999px; border: 0;
  font-size: 12px; font-weight: 600; color: var(--ptext); background: var(--pshade);
}
.pel.pel .cocktoggle:hover:not(:disabled) { background: var(--pshade); color: var(--ptext); }
.pel.pel .cocktoggle span { font-size: 10px; color: var(--pmute); }
.pel.pel .cockpeek {
  font-family: var(--num); font-variant-numeric: tabular-nums; font-size: 12px; color: var(--pmute);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.pel.pel .cockmore { padding-top: 4px; }
.pel.pel .cockmore .cockkpi { margin-top: 5px; }
/* Stand prüfen: unter dem Cockpit, ohne eigene Trennlinie */
.pel.pel > .bar .cockmain ~ .cockgrp { border-top: 0; margin-top: 4px; padding-top: 6px; }
@media (max-width: 360px) {
  .pel.pel .cockmain { gap: 4px 10px; }
  .pel.pel .bar .cockmain .statv { font-size: 16.5px; }
  .pel.pel .bar .cockmain .statv .delta { display: none; }
}
`;
