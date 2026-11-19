# Design mit Figma

Die Farben, Schriften und Radien der App liegen als CSS-Variablen im Spiel-Stylesheet
(`components/pel/ui.tsx`, Konstante `CSS`, Blöcke `.pel` und `.pel.dark`) und gespiegelt
in `app/globals.css` (`:root`) für Start, Anmeldung und Dashboard.

`figma-tokens.json` enthält dieselben Werte im Format von Tokens Studio
(Figma-Plugin „Tokens Studio for Figma“: Import → JSON). Die Namen sind identisch
mit den CSS-Variablen: `ink2` in Figma ist `--ink2` im Code.

- `theme/hell` und `theme/dunkel`: themeabhängige Farben, in Figma als zwei Modes.
- `panel`: Töne für Flächen, die in beiden Themes dunkel sind (Kopfleiste,
  Draft-Leiste, Teamkasten). Bewusst themeunabhängig.
- `sektor`: die fünf Sektorgrundfarben aus `SECCOLOR` in `lib/engine/engine.ts`. Die Farbe
  einer einzelnen Firma ist eine daraus abgeleitete Abwandlung (`identityOf()` in
  `components/pel/battle.tsx`) und deshalb kein eigenes Token.
- `basis`: Radius und Schriften.

Die Figma-Datei „PE-Leagues – Ist-Stand“ führt dieselben Werte als Variablen
(Sammlungen Theme, Panel, Sektor, Basis); bei jeder Variable ist der Name im Code hinterlegt.

Wer in Figma einen Wert ändert, ändert ihn im Code an genau einer Stelle:
in den beiden Blöcken in `ui.tsx` und, falls betroffen, in `app/globals.css`.
Bewusst nicht als Token geführt: Hautfarben und Haare der Avatare (`draft.tsx`),
die Metallverläufe der Kartenstufen und die Konfettifarben. Das sind Illustrationen,
keine Oberflächenfarben.

## Redesign v1

`redesign-v1.css` ist der Entwurf, der in der Figma-Datei auf der Seite „Redesign v1“
zu sehen ist. Er liegt als zusätzliche Stilschicht über dem bestehenden Spiel-Stylesheet
(Selektoren mit `html body .pel …`) und ändert keine Inhalte, Bilder oder Farbwerte.
Wird er übernommen, gehören die Regeln in die CSS-Konstanten von `ui.tsx`, `battle.tsx`
und `draft.tsx`; die vorangestellten `html body` entfallen dann.
