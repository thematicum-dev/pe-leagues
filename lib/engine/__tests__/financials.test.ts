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
      // Nur die Zeitreihe: Die Vergleichsspalten am Ende (laufendes Halbjahr,
      // Vorjahreshalbjahr, LTM) setzen die Reihe nicht fort.
      const chain = st.periods.filter((p) => !p.compare);
      chain.forEach((p, i) => {
        if (i === 0) return;
        expect(Math.abs(p.netDebtOpen - chain[i - 1].netDebt),
          `${c.name} ${p.label}: Eröffnung ${p.netDebtOpen} vs. Vorspalte ${chain[i - 1].netDebt}`).toBeLessThan(1e-6);
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

  /* Die Zeitreihe kennt nur volle Geschäftsjahre; ein übriges Halbjahr steht
     nicht mehr als halbe Spalte zwischen Jahreszahlen, sondern in den
     Vergleichsspalten am Ende — laufendes Halbjahr, Vorjahreshalbjahr, LTM. */
  it("verdichtet Halbjahre zu vollen Geschäftsjahren", () => {
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      const halves = c.hist.length - 1;
      const chain = st.periods.filter((p) => !p.compare);
      expect(chain.length, c.name).toBe(1 + Math.floor(halves / 2));
      chain.forEach((p) => expect(p.months, `${c.name} ${p.label}`).toBe(12));
    });
  });

  it("stellt dem laufenden Halbjahr das Vorjahreshalbjahr und die LTM-Periode zur Seite", () => {
    let sawLtmColumn = 0, sawLtmYear = 0;
    holdings.forEach((c) => {
      const st = holdingStatements(c)!;
      const halves = c.hist.length - 1;
      const cmp = st.periods.filter((p) => p.compare);
      const labels = cmp.map((p) => p.label);

      expect(labels, c.name).toContain("HJ " + halves);
      if (halves >= 3) expect(labels, c.name).toContain("HJ " + (halves - 2));

      // Die LTM-Periode ist immer da: als eigene Spalte, wenn sie quer zu den
      // Geschäftsjahren liegt, sonst als das jüngste Geschäftsjahr selbst.
      const ltm = cmp.find((p) => p.label === "LTM");
      if (halves % 2 === 1) {
        expect(ltm, c.name).toBeTruthy();
        sawLtmColumn++;
      } else {
        expect(ltm, c.name).toBeUndefined();
        const chain = st.periods.filter((p) => !p.compare);
        expect(chain[chain.length - 1].sub, c.name).toMatch(/LTM/);
        sawLtmYear++;
      }

      const current = cmp.find((p) => p.label === "HJ " + halves)!;
      expect(current.months, c.name).toBe(6);
      if (ltm) {
        // Zwölf Monate, und mehr Umsatz als das laufende Halbjahr allein
        expect(ltm.months, c.name).toBe(12);
        expect(ltm.revenue, c.name).toBeGreaterThan(current.revenue);
        expect(ltm.netDebt, c.name).toBeCloseTo(current.netDebt, 9);
      }
    });
    expect(sawLtmColumn + sawLtmYear).toBeGreaterThan(0);
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

  it("hält LTM-Umsatz und ausgewiesene Dreijahres-CAGR exakt ein", () => {
    deals.forEach((d: Any) => {
      const st = dealStatements(d);
      expect(st.periods).toHaveLength(3);
      const ltm = st.periods[2];
      // Der Anker der Karte bleibt unangetastet ...
      expect(ltm.revenue).toBeCloseTo(d.revenue, 9);
      // ... und über drei Wachstumsschritte ergibt sich exakt die CAGR der
      // Karte, egal wie stark die einzelnen Jahre davon abweichen.
      const cagr = (Math.pow(ltm.revenue / st.cagrBase!, 1 / 3) - 1) * 100;
      expect(cagr).toBeCloseTo(d.growth, 8);
    });
  });

  /* Der eigentliche Punkt: Drei exakt gleich wachsende Jahre mit exakt
     derselben Marge gibt es nicht. Die Jahre müssen sich unterscheiden — und
     zwar in der Größenordnung, die das Spiel auch für die Zukunft unterstellt. */
  it("lässt die Jahre schwanken statt gleichförmig zu wachsen", () => {
    const growthRates: number[] = [];
    const marginGaps: number[] = [];
    deals.forEach((d: Any) => {
      const st = dealStatements(d);
      for (let k = 1; k < st.periods.length; k++) {
        growthRates.push((st.periods[k].revenue / st.periods[k - 1].revenue - 1) * 100 - d.growth);
      }
      st.periods.forEach((p) => marginGaps.push((p.adjEbitda / p.revenue) * 100 - d.margin));
    });
    const sd = (a: number[]) => {
      const m = a.reduce((x, y) => x + y, 0) / a.length;
      return Math.sqrt(a.reduce((s2, v) => s2 + (v - m) ** 2, 0) / a.length);
    };
    /* Gemessen rund 2,8 pp beim Wachstum und 0,6 pp bei der Marge. Die
       Schranken fassen beides ein: Nach unten schlagen sie an, wenn die
       Historie wieder glattgezogen wird, nach oben, wenn die Reihe zu
       unruhig wird und nicht mehr die unterliegende Entwicklung zeigt.   */
    expect(sd(growthRates)).toBeGreaterThan(1.5);
    expect(sd(growthRates)).toBeLessThan(4.5);
    expect(sd(marginGaps)).toBeGreaterThan(0.3);
    expect(sd(marginGaps)).toBeLessThan(1.5);
    expect(Math.max(...growthRates.map(Math.abs))).toBeLessThan(20);
    expect(Math.max(...marginGaps.map(Math.abs))).toBeLessThan(5);
  });

  it("zeigt für dieselbe Karte immer dieselbe Historie", () => {
    deals.slice(0, 10).forEach((d: Any) => {
      const a = dealStatements(d), b = dealStatements(d);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
    // ... und für verschiedene Karten verschiedene
    const paths = deals.map((d: Any) => dealStatements(d).periods.map((p) => p.revenue / d.revenue).join(","));
    expect(new Set(paths).size).toBeGreaterThan(deals.length * 0.9);
  });

  it("weist EBITDA und Marge der Karte aus", () => {
    deals.forEach((d: Any) => {
      const ltm = dealStatements(d).periods[2];
      // Die Karte zeigt das bereinigte Ergebnis — genau das steht hier
      expect(ltm.adjEbitda).toBeCloseTo(ebitdaOf(d), 9);
      expect((ltm.adjEbitda / ltm.revenue) * 100).toBeCloseTo(d.margin, 9);
    });
  });

  /* Der Kern der Unterscheidung: Umsatz und Marge zeigen die unterliegende
     Entwicklung, Einmaliges steht daneben. Ein Restrukturierungsprogramm im
     Jahr vor dem Verkauf drückt das berichtete Ergebnis, nicht das
     bereinigte — dieselbe Regel wie während der Halteperiode.              */
  it("hält Einmalaufwendungen aus dem bereinigten EBITDA heraus", () => {
    let yearsWithOneOff = 0, years = 0;
    deals.forEach((d: Any) => {
      dealStatements(d).periods.forEach((p) => {
        years++;
        expect(p.oneOff).toBeGreaterThanOrEqual(0);
        expect(p.repEbitda).toBeCloseTo(p.adjEbitda - p.oneOff, 9);
        if (p.oneOff > 1e-9) {
          yearsWithOneOff++;
          // Normalisierungen in der Größenordnung des Maßnahmenkatalogs,
          // nicht in beliebiger Höhe
          expect(p.oneOff / p.adjEbitda).toBeLessThan(0.5);
        }
      });
    });
    /* Nicht jedes Jahr, aber regelmäßig — sonst wäre die Zeile totes Beiwerk.
       Gemessen rund jedes vierte Jahr (ONEOFF_P), die Schranken lassen Luft. */
    expect(yearsWithOneOff).toBeGreaterThan(years * 0.12);
    expect(yearsWithOneOff).toBeLessThan(years * 0.45);
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

  /* Die Kapitalbindung folgt der Quote der Karte — angewandt auf die
     tatsächliche Umsatzbewegung des jeweiligen Jahres, nicht auf eine
     hochgerechnete. Die Karte selbst zeigt daneben eine Vorausschau
     (nwcPct × Umsatz × Wachstum); beide kommen aus derselben Quote.        */
  it("bindet Working Capital mit der Quote der Karte auf dem tatsächlichen Zuwachs", () => {
    deals.forEach((d: Any) => {
      const st = dealStatements(d);
      const [, y1, ltm] = st.periods;
      expect(ltm.dNwc).toBeCloseTo((d.nwcPct / 100) * (ltm.revenue - y1.revenue), 9);
      expect(ltm.nwc).toBeCloseTo((d.nwcPct / 100) * d.revenue, 9);
    });
  });

  it("gibt für das LTM-Jahr die Capex-Quote der Karte", () => {
    deals.forEach((d: Any) => {
      const ltm = dealStatements(d).periods[2];
      expect(ltm.capex).toBeCloseTo((d.revenue * d.capexPct) / 100, 9);
      expect(ltm.adjEbitda).toBeCloseTo(ebitdaOf(d), 9);
    });
  });
});
