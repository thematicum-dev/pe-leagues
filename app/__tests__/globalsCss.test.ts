/* Zwei Fehler, die am 19.11.2026 zusammen sichtbar wurden:

   1. Beim Zusammenführen zweier Zweige ging in app/globals.css eine
      schließende Klammer verloren. Der Browser verwarf daraufhin alles danach
      — die ganze Feedback-Seite, die Partienliste im Profil und die
      Admin-Ansicht des Feedbacks standen ungestylt da, ohne dass Build, Lint
      oder Typprüfung etwas merkten.
   2. Das globale Stylesheet belegte die Klassen `.stat` und `.badge` neu.
      Dieselben Namen benutzt das Spiel im Cockpit (".pel .stat") und am
      Tab-Zähler (".pel .tabs button .badge"); die globale Regel griff dort
      mit, und das Cockpit bekam Rahmen und Abstände.

   Beides prüft dieser Test. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

describe("app/globals.css", () => {
  it("jede Klammer geht wieder zu", () => {
    let depth = 0;
    let line = 1;
    for (const ch of stripComments(css)) {
      if (ch === "\n") line++;
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      expect(depth, `Zeile ${line}`).toBeGreaterThanOrEqual(0);
    }
    expect(depth, "offene Klammer am Dateiende").toBe(0);
  });

  it("keine Klasse, die das Spiel unter .pel benutzt, wird global frei gestylt", () => {
    // Klassen der Spieloberfläche: alles, was dort unter ".pel " steht
    const gameFiles = ["components/pel/ui.tsx", "components/pel/battle.tsx", "components/pel/draft.tsx", "components/pel/briefing.tsx"];
    const game = new Set<string>();
    for (const f of gameFiles) {
      const src = readFileSync(join(root, f), "utf8");
      for (const m of src.matchAll(/\.pel\s+([^{]*)\{/g)) {
        for (const c of m[1].matchAll(/\.([a-zA-Z][\w-]*)/g)) game.add(c[1]);
      }
    }
    expect(game.size).toBeGreaterThan(50);
    expect(game.has("stat") && game.has("badge"), "die Klassen, an denen es passiert ist").toBe(true);
    // Bewusst geteilte Hilfsklassen: Schrift und gedämpfter Text, im Spiel wie außerhalb gleich gemeint
    const shared = new Set(["mono", "quiet"]);

    // Globale Selektoren, deren ERSTE Klasse frei steht (nicht unter einem Elternteil)
    const clashes: string[] = [];
    const body = stripComments(css).replace(/@media[^{]*\{/g, "");
    for (const m of body.matchAll(/(^|\})\s*([^{}@]+)\{/g)) {
      for (const sel of m[2].split(",")) {
        const first = sel.trim().match(/^\.([a-zA-Z][\w-]*)/);
        if (first && game.has(first[1]) && !shared.has(first[1]) && !sel.trim().startsWith(".pel")) clashes.push(sel.trim());
      }
    }
    expect(clashes, "global gestylte Klassen, die auch das Spiel benutzt").toEqual([]);
  });
});
