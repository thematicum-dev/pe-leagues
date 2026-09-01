import { describe, expect, it } from "vitest";
import { cashflowsOf, irrOf, tvpiOf, drawnOf, IRR_FLOOR, IRR_CAP, PERIODS } from "../engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Der IRR eines Fonds wird aus einer Reihe mit mehreren Vorzeichenwechseln
   gezogen — Abrufe und Ausschüttungen wechseln sich über zehn Jahre ab. Die
   alte Bisektion nahm an, der Barwert falle mit steigendem Zins, und schloss
   aus "Barwert bei −95 % negativ" auf "Zins am Boden". Nahe −100 % gilt das
   Gegenteil: Der Diskontfaktor explodiert, und das Vorzeichen der spätesten
   Zahlung entscheidet allein. Eine Management Fee im Schlusshalbjahr, auf die
   keine Ausschüttung mehr folgt, warf damit jeden siebten Fonds auf −95 %. */

const market: Record<string, number> = {};

function fund(calls: [number, number][], dists: [number, number][]): Any {
  return {
    holdings: [], recyc: 0, accrued: 0,
    calls: calls.map(([q, amt]) => ({ q, amt })),
    dists: dists.map(([q, amt]) => ({ q, amt })),
    drawn: calls.reduce((s, [, a]) => s + a, 0),
    distTotal: dists.reduce((s, [, a]) => s + a, 0),
  };
}

const npvOf = (f: Any, r: number, quarter: number) =>
  cashflowsOf(f, market, quarter).reduce((s: number, p: Any) => s + p.v / Math.pow(1 + r, p.t), 0);

describe("IRR eines Fonds", () => {
  it("lässt sich von einer kleinen Schlusszahlung nicht auf den Boden werfen", () => {
    // Verdoppelt das Kapital, zahlt im letzten Halbjahr aber noch eine Gebühr
    const f = fund([[1, 100], [20, 0.26]], [[10, 200]]);
    expect(tvpiOf(f, market, PERIODS)).toBeGreaterThan(1.9);
    const irr = irrOf(f, market, PERIODS);
    expect(irr).toBeGreaterThan(0.1);          // vorher: exakt IRR_FLOOR
    expect(npvOf(f, irr, PERIODS)).toBeCloseTo(0, 6);
  });

  it("liefert eine echte Nullstelle des Barwerts", () => {
    const cases = [
      fund([[1, 100]], [[12, 180]]),
      fund([[1, 60], [4, 40], [9, 25]], [[8, 70], [14, 90], [20, 60]]),
      fund([[2, 120], [20, 3]], [[6, 40], [11, 55], [19, 70]]),
    ];
    for (const f of cases) {
      const irr = irrOf(f, market, PERIODS);
      expect(irr).toBeGreaterThan(IRR_FLOOR);
      expect(irr).toBeLessThan(IRR_CAP);
      expect(npvOf(f, irr, PERIODS)).toBeCloseTo(0, 6);
    }
  });

  /* npv(0) = Σ Ausschüttungen − Σ Abrufe = drawn · (TVPI − 1). Damit hat der
     IRR zwingend dasselbe Vorzeichen wie TVPI − 1 — die Eigenschaft, an der
     der alte Fehler auffiel. */
  it("hat dasselbe Vorzeichen wie TVPI − 1", () => {
    const cases: [Any, string][] = [
      [fund([[1, 100], [20, 0.26]], [[10, 200]]), "Gewinn mit Schlussgebühr"],
      [fund([[1, 100]], [[10, 60], [20, 30]]), "Verlust"],
      [fund([[1, 100], [6, 50]], [[12, 80], [20, 62]]), "knapp unter 1,00×"],
      [fund([[1, 200], [3, 100]], [[18, 480], [20, 0.5]]), "spät zurückgezahlt"],
    ];
    for (const [f, label] of cases) {
      const t = tvpiOf(f, market, PERIODS) - 1;
      const irr = irrOf(f, market, PERIODS);
      expect(Math.sign(irr), label).toBe(Math.sign(t));
      expect(npvOf(f, 0, PERIODS)).toBeCloseTo(drawnOf(f) * t, 6);
    }
  });

  it("liegt bei genau 1,00× auf null", () => {
    // npv(0) = 0: Es kam genau so viel zurück, wie abgerufen wurde
    const f = fund([[1, 100], [6, 50]], [[12, 80], [20, 70]]);
    expect(tvpiOf(f, market, PERIODS)).toBeCloseTo(1, 9);
    expect(irrOf(f, market, PERIODS)).toBeCloseTo(0, 6);
  });

  it("bleibt beim Totalverlust am Boden", () => {
    const f = fund([[1, 100], [4, 50]], []);
    expect(irrOf(f, market, PERIODS)).toBe(IRR_FLOOR);
  });

  it("saldiert Abrufe und Ausschüttungen desselben Halbjahres zu einer Zahlung", () => {
    const cf = cashflowsOf(fund([[4, 30], [4, 10]], [[4, 25]]), market, PERIODS);
    expect(cf).toEqual([{ t: 2, v: -15 }]);
  });
});
