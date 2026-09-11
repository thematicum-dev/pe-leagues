import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  CAPITAL, CARRY, COV_DEFAULT, HURDLE, INT_BARRIER, INVEST_PERIOD, LTIP_SHARE, MGMT_FEE,
  PERIODS, SECNAMES, SECTORS, TAX_RATE, ARCHES, DEFAULT_HUMAN_ATTRS,
  addonCheck, addonEquityNeeded, bookOff, bridgeStep, carryOf, dealMoic, ebitdaOf, exitNetOf,
  feeReserveOf, fundEquityIn, investableOf, liveHist, makeBridge, maturePeople, mepCut,
  navValueOf, offOf, periodFin, recycleRoom, retentionFactor, stepCompany, taxOf, tvpiOf,
  applyProceeds,
} from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Die Prüfungen aus dem Review eines Corporate-Finance-Praktikers, einzeln
   festgenagelt. Jeder Abschnitt hält genau eine Eigenschaft fest, über die
   sich streiten lässt — damit sie sich nicht unbemerkt wieder verliert.
   Die Reihenfolge folgt docs/reality-checks.md.                            */

const market: Record<string, number> = {};
SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));

function company(over: Any = {}): Any {
  return {
    uid: "c1", name: "Testwerk", sector: "Industrials",
    revenue: 100, margin: 15, quality: 60, netDebt: 45, rate: 6.5,
    holdQ: 4, plat: 2, acc: 2, nwcFix: 0,
    ceo: { skill: 3 }, cfo: { skill: 3 }, r3: { skill: 3 },
    initP: null, initA: null, onboard: 0, searches: [], done: [],
    st: 1, ltip: false, breach: 0, covLimit: COV_DEFAULT,
    capexPct: 4, nwcPct: 15, benchMargin: 14, benchCapex: 4, benchNwc: 15,
    drift: 0, marginDrift: 0, addonSize: 0.25, addonComp: 0,
    entryMult: 8, entryEbitda: 15, entryDebt: 45, entryEV: 120,
    entryEquity: 77.4, costTotal: 77.4, costLeft: 77.4, cashOut: 0, recapOut: 0, equityIn: 0,
    hist: [{ rev: 100, eb: 15, nd: 45, mg: 15, ql: 60, eq: 75, mult: 8, st: 1, out: 0, ei: 0 }],
    ...over,
  };
}

function fund(over: Any = {}): Any {
  return {
    slot: 0, isAi: false, attrs: { ...DEFAULT_HUMAN_ATTRS },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0,
    calls: [], dists: [], ...over,
  };
}

/* ---------- 1 — Covenant auf bereinigtem EBITDA ---------- */
describe("Covenant", () => {
  it("testet auf dem bereinigten EBITDA, nicht auf dem berichteten", () => {
    /* Zwei identische Beteiligungen, eine mit einem hohen Einmalaufwand in
       der Periode. Berichtet läge deren EBITDA deutlich tiefer und der
       Covenant wäre gerissen; bereinigt ist sie so verschuldet wie die
       andere und hält ihn. */
    const rng = () => createRng(4);
    const plain = company({ netDebt: 60, covLimit: 4.5 });
    const withOneOff = company({ netDebt: 60, covLimit: 4.5 });
    // Programmkosten: unterhalb des EBITDA gegen die Nettoverschuldung gebucht
    stepCompany(rng(), plain, market, 2);
    stepCompany(rng(), withOneOff, market, 2);
    const fin = periodFin(withOneOff)!;
    bookOff(withOneOff, "restr", ebitdaOf(withOneOff) * 0.5);
    const off = offOf(withOneOff) as Any;
    const reported = fin.ebH * 2 - off.restr;

    expect(reported).toBeLessThan(ebitdaOf(withOneOff));
    // Auf berichtetem EBITDA wäre der Covenant gerissen …
    expect(withOneOff.netDebt / reported).toBeGreaterThan(4.5);
    // … auf bereinigtem nicht, und genau darauf testet die Engine.
    expect(withOneOff.breach).toBe(0);
    expect(withOneOff.breach).toBe(plain.breach);
  });
});

/* ---------- 2 — IRR: realisiert plus unrealisiert ---------- */
describe("IRR", () => {
  it("führt den verbleibenden NAV als Schlusszahlung — und nur solange er besteht", () => {
    const c = company();
    const f = fund({
      holdings: [c], drawn: 100, undrawn: 400,
      calls: [{ q: 1, amt: 100 }], dists: [], distTotal: 0,
    });
    const nav = navValueOf(c, market);
    expect(nav).toBeGreaterThan(0);
    // Der Gesamtwert je abgerufenem Euro besteht hier ausschließlich aus NAV
    expect(tvpiOf(f, market, 6) * 100).toBeCloseTo(nav, 6);
    // Nach der Verwertung ist der NAV null und der TVPI rein realisiert
    const sold = fund({ drawn: 100, undrawn: 400, calls: [{ q: 1, amt: 100 }],
      dists: [{ q: 6, amt: nav }], distTotal: nav });
    expect(tvpiOf(sold, market, 6)).toBeCloseTo(tvpiOf(f, market, 6), 6);
  });
});

/* ---------- 3 — Cash Sweep in den Brücken ---------- */
describe("Cash Sweep", () => {
  it("bleibt der Beteiligung zugeordnet: Entschuldung und Ausschüttung zählen ihn genau einmal", () => {
    const c = company({ netDebt: 0, cashOut: 0, recapOut: 0 });
    // Die Beteiligung erwirtschaftet 20 und schüttet sie aus
    const before = liveHist(c, market);
    c.netDebt = -20;
    const sweep = -c.netDebt;
    c.netDebt = 0; c.cashOut += sweep; c.recapOut += sweep;
    const after = liveHist(c, market);
    const st = bridgeStep(before, after)!;
    // Die Ausschüttung steht als eigener Posten, die Entschuldung zählt sie nicht mit
    expect(st.dist).toBeCloseTo(sweep, 9);
    expect(st.delev).toBeCloseTo(0, 9);
    // Und die Posten erklären die Gesamtveränderung vollständig
    expect(st.ebitda + st.mult + st.delev + st.dist + st.inj + st.rest).toBeCloseTo(st.total, 9);
  });

  it("geht beim Exit in den Deal-MOIC ein, ohne die Entschuldung doppelt zu zählen", () => {
    const c = company({ netDebt: 20, recapOut: 15, cashOut: 15 });
    const gross = 120, net = 116;
    const b = makeBridge(c, gross, net);
    expect(b.dist).toBeCloseTo(15, 9);
    expect(b.exit).toBeCloseTo(net + 15, 9);
    expect(b.entry + b.ebitda + b.mult + b.delev + b.cost).toBeCloseTo(net, 6);
    expect(dealMoic(c, net)).toBeCloseTo((net + 15) / c.costLeft, 9);
  });

  it("teilt das Management mit, wenn ein MEP aufgesetzt ist", () => {
    expect(mepCut(company({ ltip: true }), 100)).toBeCloseTo(100 * (1 - LTIP_SHARE), 9);
    expect(mepCut(company({ ltip: false }), 100)).toBe(100);
  });
});

/* ---------- 4 — MEP: Bindung steigt mit dem Geld ---------- */
describe("Managementbeteiligung", () => {
  it("bindet stärker, je tiefer sie im Geld steht", () => {
    const low = company({ ltip: true, netDebt: 90 });    // unter Einstand
    const mid = company({ ltip: true, netDebt: 45 });
    const high = company({ ltip: true, netDebt: -30 });  // tief im Geld
    const f = (c: Any) => retentionFactor(c, market);
    expect(f(high)).toBeLessThan(f(mid));
    expect(f(mid)).toBeLessThan(f(low));
    // Ohne MEP bleibt das Abwerberisiko unverändert
    expect(retentionFactor(company({ ltip: false }), market)).toBe(1);
    // Und selbst weit im Geld verschwindet es nie ganz
    expect(f(high)).toBeGreaterThan(0);
  });

  it("zieht ihren Anteil auf jedem Exitweg ab, nicht nur beim Schlussverkauf", () => {
    const c = company({ ltip: true });
    for (const feeRate of [0, 0.015, 0.02, 0.03, 0.04]) {
      expect(exitNetOf(c, 100, feeRate)).toBeCloseTo(100 * (1 - feeRate) * (1 - LTIP_SHARE), 9);
    }
  });
});

/* ---------- 5 — Recycling ---------- */
describe("Recycling", () => {
  it("bleibt auf die Investitionsperiode beschränkt — das ist das LPA, kein Fehler", () => {
    const f = fund({ undrawn: 300, drawn: 200 });
    expect(recycleRoom(f, 100, INVEST_PERIOD)).toBeGreaterThan(0);
    expect(recycleRoom(f, 100, INVEST_PERIOD + 1)).toBe(0);
  });

  it("wirkt auch beim zweiten Exit, solange der Deckel nicht erreicht ist", () => {
    const f = fund({ undrawn: 300, drawn: 200 });
    applyProceeds(f, 120, 0, 4, 1);                  // erster Exit, voll einbehalten
    expect(f.recyc).toBeCloseTo(120, 9);
    expect(f.recycled).toBeCloseTo(120, 9);
    expect(f.distTotal).toBe(0);
    applyProceeds(f, 90, 0, 8, 1);                   // zweiter Exit, ebenso
    expect(f.recyc).toBeCloseTo(210, 9);
    expect(f.distTotal).toBe(0);
  });

  it("deckelt kumuliert bei einem Commitment und schüttet den Rest aus", () => {
    const f = fund({ undrawn: 300, drawn: 200, recycled: CAPITAL - 30, recyc: 0 });
    applyProceeds(f, 100, 0, 4, 1);
    expect(f.recyc).toBeCloseTo(30, 9);              // mehr lässt der Deckel nicht zu
    expect(f.distTotal).toBeCloseTo(70, 9);
  });

  it("stellt einbehaltenes Kapital genau einmal als investierbar bereit", () => {
    const f = fund({ undrawn: 300, drawn: 200 });
    const before = investableOf(f, 6);
    f.recyc = 50;
    expect(investableOf(f, 6)).toBeCloseTo(before + 50, 9);
  });
});

/* ---------- 6 — Fondskapital für Zukäufe ---------- */
describe("Add-on", () => {
  it("lässt sich mit Fondskapital finanzierbar machen", () => {
    // Eine Plattform, die die Akquisitionsschuld nicht mehr trägt
    const c = company({ netDebt: 78, covLimit: 6.0 });
    const ohne = addonCheck(c, market);
    expect(ohne.ok).toBe(false);
    const need = addonEquityNeeded(c, market);
    expect(need).toBeGreaterThan(0);
    const mit = addonCheck(c, market, need);
    expect(mit.ok).toBe(true);
    // Der Kaufpreis bleibt derselbe, nur seine Finanzierung verschiebt sich
    expect(mit.price).toBeCloseTo(ohne.price, 9);
    expect(mit.equity + mit.debt).toBeCloseTo(mit.price, 9);
  });

  it("bucht die Zuführung als Kostenbasis, nicht als Entschuldung", () => {
    const f = fund({ holdings: [] });
    const c = company();
    const cost0 = c.costLeft, nd0 = c.netDebt;
    fundEquityIn(f, c, 20, 4);
    expect(c.netDebt).toBeCloseTo(nd0 - 20, 9);
    expect(c.costLeft).toBeCloseTo(cost0 + 20, 9);
    expect(f.drawn).toBeCloseTo(20, 9);
    // Die Brücke weist die Zuführung nicht als Entschuldung aus
    const b = makeBridge(c, 100, 96);
    expect(b.delev).toBeCloseTo(c.entryDebt - c.netDebt - 20, 9);
    expect(b.entry + b.ebitda + b.mult + b.delev + b.cost).toBeCloseTo(96, 6);
  });

  it("liefert genau das EBITDA, das bezahlt wurde", () => {
    /* Eine Plattform mit einer Ist-Marge deutlich über der Branchenmarge:
       Vorher kam das zugekaufte EBITDA über die Branchenmarge herein und war
       damit rund ein Drittel größer als das bezahlte. */
    const c = company({ margin: 21, benchMargin: 14 });
    const eb0 = ebitdaOf(c);
    const addEb = 3;
    c.initA = { dim: "acc", id: "ma", ma: true, addEb, mult: 7, price: 21, doneQ: 4, ok: true, gain: 0.35 };
    maturePeople(createRng(3), c, market, 4, false, [], []);
    expect(ebitdaOf(c) - eb0).toBeCloseTo(addEb, 6);
  });
});

/* ---------- 7 — Gebühren und Dry Powder ---------- */
describe("Gebühren und investierbares Kapital", () => {
  it("reserviert einbehaltene Erlöse nicht zweimal", () => {
    const a = fund({ undrawn: 200, recyc: 0 });
    const b = fund({ undrawn: 200, recyc: 50 });
    // Die Reserve hängt nur an den künftigen Gebühren, nicht am Topf
    expect(feeReserveOf(b, 6)).toBeCloseTo(feeReserveOf(a, 6), 9);
    // Und der einbehaltene Euro steht genau einmal zur Verfügung
    expect(investableOf(b, 6)).toBeCloseTo(investableOf(a, 6) + 50, 9);
  });

  it("stellt die Gebühr nach der Investitionsperiode ein, wenn alles verkauft ist", () => {
    const f = fund({ holdings: [] });
    // Innerhalb der Investitionsperiode läuft sie auf dem Commitment weiter
    expect(feeReserveOf(f, INVEST_PERIOD - 2)).toBeGreaterThan(0);
    // Danach bemisst sie sich am Einstand des Restportfolios — und der ist null
    expect(feeReserveOf(f, INVEST_PERIOD)).toBe(0);
    // Ohne Beteiligungen und ohne Gebühren ist Dry Powder genau das offene Commitment
    expect(investableOf(f, INVEST_PERIOD)).toBeCloseTo(f.undrawn, 9);
  });

  it("hält die Reserve deckungsgleich mit den Gebühren, die noch anfallen", () => {
    const f = fund({ holdings: [] });
    const q = INVEST_PERIOD - 4;
    const erwartet = (INVEST_PERIOD - q) * (CAPITAL * MGMT_FEE) / 2;
    expect(feeReserveOf(f, q)).toBeCloseTo(erwartet, 9);
  });
});

/* ---------- 8 — Carry-Wasserfall ---------- */
describe("Carried Interest", () => {
  const waterfall = (gain: number) => {
    const drawn = 100;
    const f = fund({
      drawn, undrawn: CAPITAL - drawn, holdings: [],
      calls: [{ q: 0, amt: drawn }],
      dists: [{ q: PERIODS, amt: drawn + gain }], distTotal: drawn + gain,
    });
    return { carry: carryOf(f, market, PERIODS), tvpi: tvpiOf(f, market, PERIODS) };
  };

  it("hat keine Sprungstelle an der Hurdle", () => {
    const pref = 100 * (Math.pow(1 + HURDLE, PERIODS / 2) - 1);
    const knapp = waterfall(pref - 0.01), drueber = waterfall(pref + 0.01);
    expect(knapp.carry).toBe(0);
    expect(drueber.carry).toBeLessThan(0.02);            // vorher: 20 % des Gewinns
    expect(drueber.tvpi).toBeGreaterThan(knapp.tvpi);
  });

  it("lässt den Netto-TVPI über den ganzen Verlauf monoton steigen", () => {
    let prev = -Infinity;
    for (let gain = 0; gain <= 400; gain += 2) {
      const w = waterfall(gain);
      expect(w.tvpi, `Gewinn ${gain}`).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = w.tvpi;
    }
  });

  it("deckelt den Carry bei 20 % des Gewinns", () => {
    const w = waterfall(400);
    expect(w.carry).toBeCloseTo(CARRY * 400, 6);
  });
});

/* ---------- 9 — Zinsschranke ---------- */
describe("Zinsschranke", () => {
  it("begrenzt den Zinsabzug auf 30 % des EBITDA", () => {
    const ebH = 10, capex = 2;
    // Unterhalb der Grenze: voller Abzug
    expect(taxOf(ebH, 2, capex)).toBeCloseTo(TAX_RATE * (ebH - 2 - capex), 9);
    // Darüber: nur 30 % des EBITDA mindern die Bemessungsgrundlage
    expect(taxOf(ebH, 6, capex)).toBeCloseTo(TAX_RATE * (ebH - INT_BARRIER * ebH - capex), 9);
    // Im Altverhalten gibt es die Grenze nicht
    expect(taxOf(ebH, 6, capex, { legacyNoIntBarrier: true }))
      .toBeCloseTo(TAX_RATE * (ebH - 6 - capex), 9);
  });

  it("macht hohen Leverage teurer statt billiger", () => {
    const run = (lev: number, compat: Any) => {
      const c = company({ netDebt: 15 * lev });
      const rng = createRng(11);
      for (let q = 0; q < 6; q++) stepCompany(rng, c, market, 2, compat);
      return c.netDebt / Math.max(0.5, ebitdaOf(c));
    };
    // Bei moderatem Leverage greift die Schranke nicht
    expect(run(3, {})).toBeCloseTo(run(3, { legacyNoIntBarrier: true }), 6);
    // Bei hohem schon: die Entschuldung läuft langsamer als im Altverhalten
    expect(run(5.5, {})).toBeGreaterThan(run(5.5, { legacyNoIntBarrier: true }));
  });
});

/* ---------- 10 — Über eine ganze Partie ---------- */
describe("über eine ganze Partie", () => {
  function initialFund(slot: number, isAi: boolean, archetype: string | null): RuntimeFund {
    const arch = archetype ? ARCHES.find((a) => a.key === archetype)! : null;
    return {
      slot, profileId: isAi ? null : "p", isAi, archetype,
      name: isAi ? arch!.name : "Fonds", attrs: isAi ? arch!.attrs : { ...DEFAULT_HUMAN_ATTRS },
      cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
      undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
    } as Any;
  }

  it("ruft nie mehr ab, als zugesagt ist — auch mit Zuführungen und Recycling", () => {
    const rng = createRng(20260911);
    const m: Record<string, number> = {};
    SECNAMES.forEach((s) => (m[s] = SECTORS[s].m));
    let state: RuntimeState = {
      market: m,
      funds: [initialFund(0, false, null), ...["sourcing", "ops", "fin", "all"].map((k, i) => initialFund(i + 1, true, k))],
      feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
    };
    const boot = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals: boot.deals, landmark: boot.landmark };

    for (let hy = 1; hy <= PERIODS; hy++) {
      const me = state.funds[0] as Any;
      const d: TurnDecisions = {};
      if (me.holdings.length < 4 && state.deals.length) {
        const deal = state.deals[0] as Any;
        d.bids = [{ dealId: deal.id, multiple: deal.askMult, leverage: deal.levCap * 0.8 }];
      }
      // Jedes Halbjahr Kapital nachschießen und einen Zukauf mit Fondskapital
      const holdings = me.holdings as Any[];
      if (holdings.length) {
        d.equityInjections = [{ holdingUid: holdings[0].uid, amount: 15 }];
        if (!holdings[0].initA) {
          d.initiatives = [{ holdingUid: holdings[0].uid, dim: "acc", id: "ma", equity: 10 }];
        }
      }
      if (state.exitQueue["0"]?.length) {
        d.offerDecisions = state.exitQueue["0"].map((it) => ({
          holdingUid: it.holdingUid, choice: "accept" as const, offerIndex: 0, keepPct: 1,
        }));
      }
      state = runQuarter({ state, halfYear: hy, decisionsBySlot: { 0: d }, rng }).state;

      for (const f of state.funds as Any[]) {
        expect(f.undrawn, `HJ${hy}/${f.name}: offenes Commitment`).toBeGreaterThanOrEqual(-1e-9);
        expect(f.drawn, `HJ${hy}/${f.name}: abgerufen`).toBeLessThanOrEqual(CAPITAL + 1e-6);
        expect((f.recycled || 0), `HJ${hy}/${f.name}: recycelt`).toBeLessThanOrEqual(CAPITAL + 1e-6);
        for (const c of f.holdings as Any[]) {
          expect(c.costLeft, `HJ${hy}/${c.name}: Kostenbasis`).toBeGreaterThan(0);
        }
      }
    }
  });
});
