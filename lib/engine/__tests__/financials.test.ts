import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { SECTORS, SECNAMES, ARCHES, CAPITAL, PERIODS, TAX_RATE, newDeal, ebitdaOf } from "../engine";
import { runQuarter } from "../runQuarter";
import { dealStatements, holdingStatements, MIN_CASH_PCT, PPE_YEARS, ratiosOf } from "../financials";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function initialFund(slot: number, isAi: boolean, archetype: string | null): RuntimeFund {
  const arch = archetype ? ARCHES.find((a) => a.key === archetype)! : null;
  return {
    slot, profileId: isAi ? null : "player-" + slot, isAi, archetype,
    name: isAi ? arch!.name : "Fonds " + slot,
    attrs: isAi ? arch!.attrs : { sourcing: 2, analysis: 3, negotiation: 2, operations: 3, financing: 2 },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  };
}

function initialState(): RuntimeState {
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  const archKeys = ["sourcing", "ops", "fin", "all"];
  return {
    market,
    funds: [initialFund(0, false, null), ...archKeys.map((k, i) => initialFund(i + 1, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
}

/* Eine Partie, in der der Spieler kauft, Maßnahmen startet, Positionen besetzt
   und nichts verkauft — damit die Beteiligungen eine lange Historie aufbauen,
   an der sich die Berichte prüfen lassen. Liefert alle Beteiligungen, die am
   Ende noch im Portfolio stehen, samt Marktstand.                            */
function playedGame(seed: number, periods = PERIODS) {
  const rng = createRng(seed);
  let state = initialState();
  const boot: unknown[] = [];
  for (let i = 0; i < 4; i++) boot.push(newDeal(rng, "process", state.market));
  boot.push(newDeal(rng, "prop", state.market, 2));
  state.deals = boot;

  const ids = ["opex", "nwc", "erp", "ai"];
  for (let hy = 1; hy <= periods; hy++) {
    const decisions: TurnDecisions = {};
    const me = state.funds[0];
    const holdings = me.holdings as Any[];
    if (holdings.length < 4 && state.deals.length) {
      const d = state.deals[0] as Any;
      decisions.bids = [{ dealId: d.id, multiple: d.askMult * 0.99, leverage: Math.min(d.levCap, 3.4) }];
      decisions.dueDiligence = [d.id];
    }
    // Maßnahmen in beiden Dimensionen, damit Einmalaufwand und Cash Release anfallen
    const freeP = holdings.find((h) => !h.initP);
    if (freeP) decisions.initiatives = [{ holdingUid: freeP.uid, dim: "plat", id: ids[hy % ids.length] as Any }];
    const freeA = holdings.find((h) => !h.initA);
    if (freeA) {
      decisions.initiatives = [...(decisions.initiatives || []),
        { holdingUid: freeA.uid, dim: "acc", id: (hy % 3 === 0 ? "ma" : "pen") as Any }];
    }
    // Personalwechsel erzeugen Retainer, Signing Bonus und Abfindung
    const vac = holdings.find((h) => h.cfo.skill <= 0 && !(h.searches || []).some((s: Any) => s.seat === "cfo"));
    if (vac) decisions.searches = [{ holdingUid: vac.uid, seat: "cfo" }];
    const list = state.shortlist[String(me.slot)] || [];
    if (list.length) decisions.hires = list.map((it) => ({ holdingUid: it.holdingUid, seat: it.seat, choice: "aplayer" as const }));

    state = runQuarter({ state, halfYear: hy, decisionsBySlot: { [me.slot]: decisions }, rng }).state;
  }
  return { holdings: state.funds[0].holdings as Any[], market: state.market };
}

describe("Finanzberichte einer Beteiligung", () => {
  const { holdings } = playedGame(4711, 14);

  it("führt in einer gespielten Partie überhaupt Beteiligungen mit Historie", () => {
    expect(holdings.length).toBeGreaterThan(0);
    expect(Math.max(...holdings.map((h) => (h.hist || []).length))).toBeGreaterThan(4);
  });

  it("bildet in jeder Periode eine Bilanz, die aufgeht", () => {
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      st.periods.forEach((p) => {
        expect(Math.abs(p.assets - (p.debt + p.equity)),
          `${c.name} ${p.label}: Aktiva ${p.assets} vs. Passiva ${p.debt + p.equity}`).toBeLessThan(1e-6);
      });
    });
  });

  it("trennt Nettoverschuldung in Bankdarlehen und liquide Mittel", () => {
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      st.periods.forEach((p) => {
        // Die Aufteilung ist eine Darstellung, keine zweite Rechnung:
        // Darlehen minus Kasse muss die Nettoverschuldung der Engine ergeben.
        expect(p.debt - p.cash).toBeCloseTo(p.netDebt, 9);
        expect(p.debt).toBeGreaterThanOrEqual(0);
        expect(p.cash).toBeGreaterThanOrEqual(0);
        // Solange die Beteiligung netto verschuldet ist, steht die operative
        // Mindestliquidität in der Kasse.
        if (p.netDebt > 0) {
          expect(p.cash).toBeCloseTo((MIN_CASH_PCT / 100) * p.revenue * (12 / p.months), 9);
        }
      });
    });
  });

  it("läuft in der Kapitalflussrechnung exakt auf die Nettoverschuldung der Engine zu", () => {
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      st.periods.forEach((p) => {
        if (p.opening) return;
        // Nettoverschuldung Ende = Anfang − Free Cashflow + Ausschüttung
        const closing = p.netDebtOpen - p.netCashFlow + p.distributions;
        expect(Math.abs(closing - p.netDebt),
          `${c.name} ${p.label}: abgeleitet ${closing} vs. Engine ${p.netDebt}`).toBeLessThan(1e-6);
      });
      // ... und die letzte Spalte auf den heutigen Stand der Beteiligung
      const last = st.periods[st.periods.length - 1];
      expect(Math.abs(last.netDebt - c.netDebt)).toBeLessThan(1e-6);
    });
  });

  it("schließt die Nettoverschuldung lückenlos von Periode zu Periode an", () => {
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      st.periods.forEach((p, i) => {
        if (i === 0) return;
        expect(Math.abs(p.netDebtOpen - st.periods[i - 1].netDebt),
          `${c.name} ${p.label}: Eröffnung ${p.netDebtOpen} vs. Vorspalte ${st.periods[i - 1].netDebt}`).toBeLessThan(1e-6);
      });
    });
  });

  it("weist das bereinigte EBITDA der Engine aus und leitet daraus das berichtete ab", () => {
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      // Eröffnungsspalte: LTM-EBITDA beim Vollzug
      expect(st.periods[0].adjEbitda).toBeCloseTo(c.hist[0].eb, 9);
      st.periods.forEach((p) => {
        expect(p.repEbitda).toBeCloseTo(p.adjEbitda - p.oneOff, 9);
        expect(p.ebit).toBeCloseTo(p.repEbitda - p.da, 9);
        expect(p.netIncome).toBeCloseTo(p.ebit - p.interest - p.tax, 9);
      });
    });
  });

  it("bucht Einmalaufwand aus Maßnahmen und Personalwechsel überhaupt", () => {
    // Über alle Beteiligungen zusammen muss in einer so gespielten Partie
    // Einmalaufwand angefallen sein, sonst prüft der Test nichts.
    const total = holdings.reduce((s, c) => {
      const st = holdingStatements(c)!;
      return s + st.periods.reduce((a, p) => a + p.oneOff, 0);
    }, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("hält Abschreibung und Capex deckungsgleich, wie die Steuerformel der Engine", () => {
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      st.periods.forEach((p) => {
        // Capex enthält zusätzlich nachgeholte Investitionen aus Ereignissen;
        // abgeschrieben wird nur der laufende Investitionsaufwand.
        expect(p.da).toBeLessThanOrEqual(p.capex + 1e-9);
        expect(Math.abs(p.tax - TAX_RATE * Math.max(0, p.adjEbitda - p.da - p.interest)),
          `${c.name} ${p.label}: Steuer weicht von der Engine-Formel ab`).toBeLessThan(1e-6);
      });
    });
  });

  it("verdichtet Halbjahre zu Geschäftsjahren und weist angebrochene Jahre als solche aus", () => {
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      const halves = (c.hist.length - 1);
      expect(st.periods.length).toBe(1 + Math.ceil(halves / 2));
      st.periods.slice(1).forEach((p, i) => {
        const full = (i + 1) * 2 <= halves;
        expect(p.months).toBe(full ? 12 : 6);
      });
    });
  });

  it("liefert Kennzahlen, die auf die Kennzahlen der Karte passen", () => {
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      const last = st.periods[st.periods.length - 1];
      const r = ratiosOf(last, st.levered);
      // Leverage der letzten Spalte gegen den heutigen Stand: annualisiertes
      // EBITDA der Periode gegen die Nettoverschuldung am Stichtag.
      const ebAnn = last.adjEbitda * (12 / last.months);
      expect(r.leverage!).toBeCloseTo(c.netDebt / ebAnn, 9);
      expect(r.adjMargin).toBeCloseTo((last.adjEbitda / last.revenue) * 100, 9);
    });
  });

  it("gibt für eine gerade geschlossene Beteiligung nur die Eröffnungsspalte aus", () => {
    const fresh = { name: "Testholding", sector: "Industrials", capexPct: 5, nwcPct: 20,
      entryEbitda: 10, entryMult: 8, entryEV: 80, entryDebt: 30, netDebt: 30,
      hist: [{ rev: 80, eb: 10, nd: 30, mg: 12.5, ql: 50, eq: 50, mult: 8, st: 1, out: 0 }] };
    const st = holdingStatements(fresh as Any)!;
    expect(st.periods).toHaveLength(1);
    const p0 = st.periods[0];
    expect(p0.opening).toBe(true);
    // Eröffnungsbilanz zum Enterprise Value, finanziert mit Fremd- und Eigenkapital
    expect(p0.netDebt).toBe(30);
    expect(p0.equity).toBeCloseTo(50, 9);
    expect(p0.nwc).toBeCloseTo(16, 9);
    expect(p0.ppe).toBeCloseTo(PPE_YEARS * 4, 9);
    // Kasse und Darlehen getrennt: 2 % von 80 Umsatz stehen als Liquidität,
    // das Darlehen trägt den Rest der Nettoverschuldung.
    expect(p0.cash).toBeCloseTo(1.6, 9);
    expect(p0.debt).toBeCloseTo(31.6, 9);
    expect(p0.assets).toBeCloseTo(81.6, 9);
    expect(p0.assets).toBeCloseTo(p0.debt + p0.equity, 9);
    // Vermögen ohne Kasse steht zum Enterprise Value des Erwerbs
    expect(p0.ppe + p0.goodwill + p0.nwc).toBeCloseTo(80, 9);
  });

  it("verkraftet Altbestände ohne Periodenmitschrift und trifft trotzdem die Nettoverschuldung", () => {
    const legacy = holdings.map((c) => ({
      ...c, hist: (c.hist as Any[]).map((row) => { const stripped = { ...row }; delete stripped.fin; return stripped; }),
    }));
    legacy.forEach((c) => {
      const st = holdingStatements(c as Any)!;
      expect(st.anyEstimated).toBe(true);
      st.periods.forEach((p) => {
        expect(Math.abs(p.assets - (p.debt + p.equity))).toBeLessThan(1e-6);
        if (p.opening) return;
        expect(Math.abs((p.netDebtOpen - p.netCashFlow + p.distributions) - p.netDebt)).toBeLessThan(1e-6);
      });
    });
  });
});

describe("Finanzberichte eines Zielunternehmens", () => {
  const rng = createRng(99);
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  const deals = Array.from({ length: 40 }, () => newDeal(rng, "process", market));

  it("rechnet den Umsatz exakt über das ausgewiesene Wachstum zurück", () => {
    deals.forEach((d: Any) => {
      const st = dealStatements(d);
      expect(st.periods).toHaveLength(3);
      const [y2, y1, ltm] = st.periods;
      expect(ltm.revenue).toBeCloseTo(d.revenue, 9);
      expect(y1.revenue * (1 + d.growth / 100)).toBeCloseTo(ltm.revenue, 9);
      expect(y2.revenue * (1 + d.growth / 100)).toBeCloseTo(y1.revenue, 9);
    });
  });

  it("weist EBITDA und Marge der Karte aus", () => {
    deals.forEach((d: Any) => {
      const ltm = dealStatements(d).periods[2];
      expect(ltm.adjEbitda).toBeCloseTo(ebitdaOf(d), 9);
      expect(ltm.adjEbitda / ltm.revenue * 100).toBeCloseTo(d.margin, 9);
      // Ohne Halteperiode gibt es keine Einmaleffekte: beide EBITDA sind gleich
      expect(ltm.repEbitda).toBeCloseTo(ltm.adjEbitda, 9);
    });
  });

  it("stellt cash-free/debt-free dar und lässt die Bilanz aufgehen", () => {
    deals.forEach((d: Any) => {
      const st = dealStatements(d);
      expect(st.levered).toBe(false);
      st.periods.forEach((p) => {
        expect(p.netDebt).toBe(0);
        expect(p.interest).toBe(0);
        // Cash-free/debt-free: weder Kasse noch Darlehen im Kaufgegenstand
        expect(p.cash).toBe(0);
        expect(p.debt).toBe(0);
        expect(p.assets).toBeCloseTo(p.debt + p.equity, 9);
        expect(p.nwc).toBeCloseTo((d.nwcPct / 100) * p.revenue, 9);
        expect(p.capex).toBeCloseTo((d.capexPct / 100) * p.revenue, 9);
        expect(p.tax).toBeCloseTo(TAX_RATE * Math.max(0, p.adjEbitda - p.capex), 9);
      });
    });
  });

  /* Die Karte rechnet die Kapitalbindung auf dem heutigen Umsatz hoch
     (nwcPct × Umsatz × Wachstum) — eine Vorausschau. Der Bericht zeigt die
     tatsächliche Bewegung des abgelaufenen Jahres, also die Quote auf dem
     Zuwachs gegenüber dem Vorjahr. Beide kommen aus denselben Feldern und
     unterscheiden sich genau um den Faktor (1 + g).                         */
  it("bindet Working Capital mit der Quote der Karte auf dem tatsächlichen Zuwachs", () => {
    deals.forEach((d: Any) => {
      const st = dealStatements(d);
      const [, y1, ltm] = st.periods;
      expect(ltm.dNwc).toBeCloseTo((d.nwcPct / 100) * (ltm.revenue - y1.revenue), 9);
      const forward = (d.nwcPct / 100) * ((d.revenue * d.growth) / 100);
      expect(ltm.dNwc * (1 + d.growth / 100)).toBeCloseTo(forward, 6);
    });
  });

  it("gibt eine Cash Conversion in der Größenordnung der Deal-Karte", () => {
    deals.forEach((d: Any) => {
      const ltm = dealStatements(d).periods[2];
      const eb = ebitdaOf(d);
      const capexA = (d.revenue * d.capexPct) / 100;
      const nwcA = (d.nwcPct / 100) * ((d.revenue * d.growth) / 100);
      const cardConv = ((eb - capexA - nwcA) / eb) * 100;
      expect(Math.abs(ratiosOf(ltm, false).conversion! - cardConv)).toBeLessThan(1.5);
    });
  });
});
