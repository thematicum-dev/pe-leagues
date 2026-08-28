import { describe, expect, it } from "vitest";
import { lboProjection, impliedMoM, ENTRY_FEE, PROC_FEE, SECTORS } from "../engine";

/* Ein Zielunternehmen mit runden Zahlen, damit die Erwartungswerte von Hand
   nachvollziehbar bleiben: 100 Mio. € Umsatz, 15 % Marge -> 15 Mio. € EBITDA. */
function target(over: Record<string, unknown> = {}) {
  return {
    sector: "Industrials",
    revenue: 100,
    margin: 15,
    benchMargin: 15,
    benchCapex: 5,
    benchNwc: 20,
    capexPct: 5,
    nwcPct: 20,
    growth: 3,
    quality: 55,
    ...over,
  };
}

describe("LBO-Base-Case (Implied MoM)", () => {
  it("rechnet das Eigenkapital identisch zum Equity Ticket der Deal-Karte", () => {
    const d = target();
    const mult = 8, lev = 3;
    const p = lboProjection(d, mult, lev, 2)!;
    const eb = 15;
    // EV - Fremdkapital + Transaktionskosten, exakt wie in DealCard und beim Closing
    expect(p.equity0).toBeCloseTo(eb * mult - eb * lev + eb * mult * ENTRY_FEE, 9);
  });

  it("liefert bei höherem Gebot einen niedrigeren MoM — sonst wäre der Preis wirkungslos", () => {
    const d = target();
    const cheap = impliedMoM(d, 7, 3, 2)!;
    const mid = impliedMoM(d, 9, 3, 2)!;
    const dear = impliedMoM(d, 11, 3, 2)!;
    expect(cheap).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(dear);
  });

  it("liefert bei höherem Leverage einen höheren MoM — der Hebel wirkt in die erwartete Richtung", () => {
    const d = target();
    const low = impliedMoM(d, 9, 1, 2)!;
    const mid = impliedMoM(d, 9, 3, 2)!;
    const high = impliedMoM(d, 9, 4.5, 2)!;
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it("belohnt eine bessere Financing-Fähigkeit über die Kreditmarge", () => {
    const d = target();
    const weak = impliedMoM(d, 9, 4, 1)!;
    const strong = impliedMoM(d, 9, 4, 5)!;
    expect(strong).toBeGreaterThan(weak);
  });

  it("belohnt erwartetes Wachstum über dem Sektor", () => {
    const d = target();
    const flat = impliedMoM(d, 9, 3, 2, { drift: 0 })!;
    const growing = impliedMoM(d, 9, 3, 2, { drift: 3 })!;
    const shrinking = impliedMoM(d, 9, 3, 2, { drift: -3 })!;
    expect(growing).toBeGreaterThan(flat);
    expect(flat).toBeGreaterThan(shrinking);
  });

  it("bleibt in einer plausiblen Größenordnung für einen Base Case ohne Value Creation", () => {
    // Marktüblicher Einstieg: Sektormultiple, moderater Leverage.
    const d = target();
    const m = impliedMoM(d, 8.5, 3, 2)!;
    // Kein Multiple-Arbitrage, kein Programm: der Zuwachs kommt aus
    // Entschuldung und organischem Wachstum. Alles jenseits dieser Spanne
    // wäre ein Modellfehler, kein Spielergebnis.
    expect(m).toBeGreaterThan(1.0);
    expect(m).toBeLessThan(4.0);
  });

  it("zerlegt den Zuwachs vollständig in EBITDA-Wachstum und Entschuldung", () => {
    const d = target();
    const mult = 9;
    const p = lboProjection(d, mult, 3, 2)!;
    // Exit zum Einstiegsmultiple: Equity(exit) vor Kosten = EV(exit) - Schulden(exit).
    // Der Zuwachs gegenüber EV(entry) - Schulden(entry) muss sich restlos aus
    // EBITDA-Zuwachs (zum selben Multiple) und Schuldentilgung erklären.
    const eb0 = 15;
    const equityEntryNoFees = eb0 * mult - eb0 * 3;
    const equityExitPreFee = p.equityExit / (1 - PROC_FEE);
    expect(equityExitPreFee - equityEntryNoFees).toBeCloseTo(p.fromEbitda + p.fromDelev, 6);
  });

  it("gibt null zurück, wenn kein Eigenkapital eingesetzt wird (Leverage >= Multiple)", () => {
    const d = target();
    // Fremdkapital deckt den ganzen Kaufpreis: kein sinnvoller MoM
    expect(impliedMoM(d, 4, 5, 2)).toBeNull();
  });

  it("benutzt die Sektorkonstanten des Spiels, keine eigenen Wachstumsannahmen", () => {
    // Software wächst laut SECTORS deutlich schneller als Consumer; bei sonst
    // identischem Ziel muss sich das im Base Case niederschlagen.
    expect(SECTORS.Software.g).toBeGreaterThan(SECTORS.Consumer.g);
    const soft = impliedMoM(target({ sector: "Software" }), 9, 3, 2)!;
    const cons = impliedMoM(target({ sector: "Consumer" }), 9, 3, 2)!;
    expect(soft).toBeGreaterThan(cons);
  });
});
