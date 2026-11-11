import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, TIERS, achievementsOf, longestRun, pointsOf, summarize, tierOf, type CareerRow } from "../career";

const row = (i: number, o: Partial<CareerRow> = {}): CareerRow => ({
  season_id: "s" + i, universe_name: "Live", finished_at: `2026-0${1 + (i % 9)}-01T00:00:00Z`,
  place: 3, funds: 5, humans: 2, score: 0.9, tvcc: 1.4, irr: 0.12, tvpi: 1.6, fund_name: "Fonds", ...o,
});

describe("Karrierepunkte", () => {
  it("Wertung in Hundertsteln plus Platzzuschlag, nie negativ", () => {
    expect(pointsOf({ score: 1.0, place: 4 })).toBe(100);
    expect(pointsOf({ score: 1.42, place: 1 })).toBe(192);
    expect(pointsOf({ score: 0.8, place: 2 })).toBe(105);
    expect(pointsOf({ score: -0.3, place: 5 })).toBe(0);
    expect(pointsOf({ score: -0.3, place: 3 })).toBe(10);
  });

  it("jede beendete Partie bringt voran, eine gute schneller", () => {
    const weak = summarize([row(1, { score: 0.4, place: 5 }), row(2, { score: 0.4, place: 5 })]);
    const strong = summarize([row(1, { score: 1.6, place: 1 })]);
    expect(weak.points).toBe(80);
    expect(strong.points).toBe(210);
    expect(tierOf(weak.points).tier.key).toBe("analyst");
    expect(tierOf(strong.points).tier.key).toBe("associate");
  });
});

describe("Kennzahlen", () => {
  it("leerer Track Record", () => {
    const s = summarize([]);
    expect(s).toMatchObject({ played: 0, wins: 0, points: 0, bestScore: null, avgScore: null, bestTvcc: null, benchmarkRate: null });
    expect(tierOf(s.points)).toMatchObject({ progress: 0, toNext: 150 });
    expect(achievementsOf([]).every((a) => !a.done)).toBe(true);
  });

  it("Bestwerte, Schnitt, Benchmarkquote; alte Partien ohne TVCC zählen dort nicht", () => {
    const s = summarize([
      row(1, { score: 1.2, place: 1, tvcc: 2.1, irr: 0.26 }),
      row(2, { score: 0.6, place: 4, tvcc: null, irr: 0.05 }),
      row(3, { score: 1.0, place: 2, tvcc: 1.6, irr: 0.18 }),
    ]);
    expect(s.played).toBe(3);
    expect(s.wins).toBe(1);
    expect(s.podiums).toBe(2);
    expect(s.bestScore).toBe(1.2);
    expect(s.avgScore).toBeCloseTo(2.8 / 3);
    expect(s.bestTvcc).toBe(2.1);
    expect(s.bestIrr).toBe(0.26);
    expect(s.benchmarkRate).toBeCloseTo(2 / 3);
  });

  it("Zahlen aus der Datenbank kommen als Zeichenketten an", () => {
    const s = summarize([row(1, { score: "1.25" as unknown as number, irr: "0.2" as unknown as number, tvcc: "1.9" as unknown as number })]);
    expect(s.bestScore).toBe(1.25);
    expect(s.points).toBe(135);
  });
});

describe("Karrierestufen", () => {
  it("lückenlos und aufsteigend", () => {
    expect(TIERS[0].from).toBe(0);
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].from).toBeGreaterThan(TIERS[i - 1].from);
  });

  it("Grenzen, Fortschritt und höchste Stufe", () => {
    expect(tierOf(149).tier.key).toBe("analyst");
    expect(tierOf(150).tier.key).toBe("associate");
    expect(tierOf(275)).toMatchObject({ progress: 0.5, toNext: 125 });
    expect(tierOf(275).next?.key).toBe("vp");
    expect(tierOf(99999)).toMatchObject({ next: null, progress: 1, toNext: 0 });
    expect(tierOf(-5).tier.key).toBe("analyst");
    expect(tierOf(NaN).tier.key).toBe("analyst");
  });
});

describe("Auszeichnungen", () => {
  const done = (rows: CareerRow[]) => achievementsOf(rows).filter((a) => a.done).map((a) => a.id);

  it("eindeutige Kennungen", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it("erste Partie unter Benchmark: nur First Close", () => {
    expect(done([row(1)])).toEqual(["first_close"]);
  });

  it("eine starke Partie schaltet mehrere frei", () => {
    expect(done([row(1, { score: 1.6, place: 1, tvcc: 2.2, irr: 0.3, humans: 4 })]).sort())
      .toEqual(["alpha", "benchmark", "first_close", "irr25", "outperformer", "top_quartile", "two_x"].sort());
  });

  it("Sieg gegen nur einen Menschen ist kein Platzhirsch", () => {
    expect(done([row(1, { place: 1, humans: 2 })])).not.toContain("alpha");
  });

  it("Konstanz verlangt drei in Folge — nach Datum, nicht nach Reihenfolge der Liste", () => {
    const rows = [
      row(1, { score: 1.1, finished_at: "2026-03-01T00:00:00Z" }),
      row(2, { score: 0.5, finished_at: "2026-02-01T00:00:00Z" }),
      row(3, { score: 1.3, finished_at: "2026-01-01T00:00:00Z" }),
      row(4, { score: 1.0, finished_at: "2026-04-01T00:00:00Z" }),
    ];
    expect(longestRun(rows, (r) => r.score >= 1)).toBe(2);
    expect(done(rows)).not.toContain("consistent");
    const c = achievementsOf(rows).find((a) => a.id === "consistent")!;
    expect([c.have, c.need]).toEqual([2, 3]);
    rows.push(row(5, { score: 1.2, finished_at: "2026-05-01T00:00:00Z" }));
    expect(done(rows)).toContain("consistent");
  });

  it("Zähler laufen bis zum Ziel und nicht darüber", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(i, { place: 1 }));
    const by = Object.fromEntries(achievementsOf(rows).map((a) => [a.id, a]));
    expect([by.fund_v.have, by.fund_v.need, by.fund_v.done]).toEqual([5, 5, true]);
    expect([by.fund_x.have, by.fund_x.need, by.fund_x.done]).toEqual([10, 10, true]);
    expect([by.hattrick.have, by.hattrick.need]).toEqual([3, 3]);
    const seven = Object.fromEntries(achievementsOf(rows.slice(0, 7)).map((a) => [a.id, a]));
    expect([seven.fund_x.have, seven.fund_x.done]).toEqual([7, false]);
  });
});
