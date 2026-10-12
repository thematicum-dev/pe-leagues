import { describe, expect, it } from "vitest";
import { briefMood, briefSummary, groupBriefing, sectionOf } from "../briefing";

/* Der Halbjahresbericht ordnet die Meldungen nach ihrem Emoji. Diese Zuordnung
   ist die einzige Stelle, an der ein Abgang im Management landet statt unter
   "Weitere Meldungen" — und beide Spielmodi müssen dabei gleich behandelt
   werden. */
describe("Halbjahresbericht", () => {
  it("ordnet die Meldungen beider Spielmodi ihren Abschnitten zu", () => {
    expect(sectionOf({ e: "🏆", tone: "pos", t: "Zuschlag: …" })).toBe("deals");
    expect(sectionOf({ e: "⚔️", tone: "neg", t: "überbietet dich" })).toBe("deals");
    expect(sectionOf({ e: "🛠️", tone: "pos", t: "<b>X</b>: Cost-out abgeschlossen" })).toBe("value");
    expect(sectionOf({ e: "🛠", tone: "pos", t: "ohne Variantenselektor" })).toBe("value");
    expect(sectionOf({ e: "🚪", tone: "neg", t: "Der CFO wurde abgeworben." })).toBe("people");
    expect(sectionOf({ e: "💰", tone: "pos", t: "Exit" })).toBe("exits");
    expect(sectionOf({ e: "📉", tone: "neg", t: "Lock-up bei X ausgelaufen" })).toBe("exits");
    expect(sectionOf({ e: "📉", tone: "neg", t: "Sektorabschwung in Software" })).toBe("market");
    expect(sectionOf({ e: "📣", tone: "neu", t: "Verkaufsprozess für X eröffnet." })).toBe("exits");
    expect(sectionOf({ e: "📣", tone: "neu", t: "Trophy Asset angekündigt" })).toBe("market");
    // Öffentlich ist immer Marktbericht — auch der Zukauf eines Wettbewerbers (🤝)
    expect(sectionOf({ e: "🤝", tone: "neu", t: "Aurum kauft …", pub: true })).toBe("market");
    expect(sectionOf({ e: "🤝", tone: "pos", t: "Neuer CEO an Bord" })).toBe("people");
  });

  it("zählt Zuschläge, Abgänge und Maßnahmen für die Kopfzeile", () => {
    const items = [
      { e: "🏆", tone: "pos", t: "a" }, { e: "🏆", tone: "pos", t: "b" },
      { e: "🥈", tone: "neg", t: "c" },
      { e: "🛠️", tone: "pos", t: "d" }, { e: "🛠️", tone: "neu", t: "gestartet" },
      { e: "❌", tone: "neg", t: "e" },
      { e: "👋", tone: "neg", t: "f" },
      { e: "🤝", tone: "neu", t: "Marktbericht", pub: true },
    ];
    const chips = Object.fromEntries(briefSummary(items).map((c) => [c.label, c.n]));
    expect(chips).toEqual({
      "Zuschläge": 2, "ohne Zuschlag": 1, "Maßnahme geglückt": 1, "Maßnahme verfehlt": 1, "Abgang": 1,
    });
    expect(groupBriefing(items).map((g) => g.key)).toEqual(["deals", "people", "value", "market"]);
  });

  it("liest die Stimmung aus Meldungen und Wertung", () => {
    const perf = { score: 1.1, rank: 2, funds: 5, tvpi: 1.2, irr: 0.1, dpi: 0, dry: 100 };
    expect(briefMood([{ e: "🏆", tone: "pos", t: "" }], perf, { ...perf, score: 1.0 })).toBe("pos");
    expect(briefMood([{ e: "☠️", tone: "neg", t: "" }, { e: "🏆", tone: "pos", t: "" }], perf, null)).toBe("neg");
    expect(briefMood([], perf, perf)).toBe("neu");
  });
});
