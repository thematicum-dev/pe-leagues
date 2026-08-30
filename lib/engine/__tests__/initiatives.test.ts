import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  BASE_RATE, LEGACY_COMPAT, SECNAMES, SECTORS,
  addonCheck, buildInit, maturePeople, nwcPctOf, stepCompany,
} from "../engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const market: Record<string, number> = {};
SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));

/* Eine Beteiligung mit reichlich Covenant-Luft, damit Zukauf und Programme
   nicht an der Finanzierung scheitern und der Test misst, was er messen soll. */
function holding(over: Partial<Any> = {}): Any {
  return {
    uid: "t", name: "Testwerk", sector: "Industrials", revenue: 100, margin: 12, quality: 55,
    netDebt: 24, rate: BASE_RATE - 0.5, holdQ: 2, flag: null,
    ceo: { skill: 3 }, cfo: { skill: 3 }, r3: { skill: 2 },
    plat: 2, acc: 2, nwcFix: 0, addonSize: 0.25, addonComp: 0,
    ltip: false, searches: [], initP: null, initA: null, onboard: 0,
    st: 1, proc: null, block: 0, lockUntil: null, cv: false, breach: 0, covLimit: 6.5,
    capexPct: 3, nwcPct: 20, benchMargin: 10.5, benchCapex: 3, benchNwc: 20,
    dd: true, drift: 0, marginDrift: 0, done: [],
    entryMult: 8, entryEbitda: 12, entryDebt: 24, entryEV: 96,
    entryEquity: 74, costTotal: 74, costLeft: 74, cashOut: 0, recapOut: 0, entryQ: 0,
    hist: [{ rev: 100, eb: 12, nd: 24, mg: 12, ql: 55, eq: 72, mult: 8, st: 1, out: 0 }],
    ...over,
  };
}

describe("Add-on: der Zukauf wird bezahlt", () => {
  it("bucht den Kaufpreis gegen die Nettoverschuldung", () => {
    const c = holding();
    const chk = addonCheck(c, market);
    expect(chk.ok, "Testaufbau: der Zukauf muss finanzierbar sein").toBe(true);
    expect(chk.price).toBeGreaterThan(0);

    const B = buildInit(createRng(7), c, "acc", "ma", market, 3);
    expect(B).not.toBeNull();
    expect((B as Any).blocked).toBeUndefined();
    // Die Maßnahme hat keinen eigenen Einmalaufwand, die Schuld ist also
    // genau der Kaufpreis aus der Pro-forma-Rechnung.
    expect((B as Any).debt).toBeCloseTo(chk.price, 9);
  });

  it("lässt ihn im Altverhalten weiterhin ungebucht", () => {
    const c = holding();
    const B = buildInit(createRng(7), c, "acc", "ma", market, 3, LEGACY_COMPAT);
    expect((B as Any).debt).toBe(0);
  });

  it("erhöht damit die Verschuldung, statt EBITDA geschenkt zu bekommen", () => {
    const run = (compat: Any) => {
      const rng = createRng(99);
      const c = holding();
      const B = buildInit(rng, c, "acc", "ma", market, 3, compat);
      c.netDebt += (B as Any).debt;
      c[(B as Any).slot] = (B as Any).init;
      for (let q = 3; q <= 8; q++) {
        stepCompany(rng, c, market, 3, compat);
        maturePeople(rng, c, market, q, false, [], [], compat);
        c.off = null;
      }
      return { nd: c.netDebt, rev: c.revenue };
    };
    const neu = run({}), alt = run(LEGACY_COMPAT);
    // Derselbe Umsatzpfad — der Zukauf kommt in beiden Fällen an ...
    expect(neu.rev).toBeCloseTo(alt.rev, 6);
    // ... aber nur im korrigierten Verhalten steht auch die Schuld dafür.
    expect(neu.nd).toBeGreaterThan(alt.nd);
  });
});

describe("NWC-Programm: die Kapitalbindung sinkt tatsächlich", () => {
  /* Der gemeldete Fehler: Das Working Capital stieg prozentual zum Umsatz,
     statt zu sinken. Ursache war, dass die Quote nur auf den Umsatzzuwachs
     wirkte — der Bestand blieb unberührt. */
  function play(withProgram: boolean, periods = 10) {
    const rng = createRng(2026);
    const c = holding({ plat: 1.2, acc: 1.2, netDebt: 30 });
    for (let q = 1; q <= periods; q++) {
      if (withProgram && !c.initP) {
        const B = buildInit(rng, c, "plat", "nwc", market, q);
        if (B && !(B as Any).blocked) { c.netDebt += (B as Any).debt; c[(B as Any).slot] = (B as Any).init; }
      }
      stepCompany(rng, c, market, 3);
      maturePeople(rng, c, market, q, false, [], []);
      c.off = null;
    }
    return { pct: nwcPctOf(c), bal: c.nwcBal, rev: c.revenue, nd: c.netDebt };
  }

  it("senkt Quote und gebundenes Kapital gegenüber der Beteiligung ohne Programm", () => {
    const ohne = play(false), mit = play(true);
    expect(mit.pct).toBeLessThan(ohne.pct - 3);
    expect(mit.bal / mit.rev).toBeLessThan(ohne.bal / ohne.rev);
  });

  it("setzt dadurch Liquidität frei — die Nettoverschuldung fällt deutlich stärker", () => {
    const ohne = play(false), mit = play(true);
    expect(mit.nd).toBeLessThan(ohne.nd - 5);
  });

  it("führt das Working Capital als Bestand: Quote mal Umsatz", () => {
    const rng = createRng(5);
    const c = holding({ plat: 1.2, acc: 1.2 });
    stepCompany(rng, c, market, 3);
    /* Genau das war vorher nicht so: Der Bestand ergibt sich aus der Quote,
       nicht aus der Summe vergangener Zuwächse. Verglichen wird gegen die
       Quote der Periode aus der Mitschrift — nwcPctOf(c) läse den Stand nach
       dem Reifegradverfall, der erst danach greift.                       */
    expect(c.nwcBal).toBeCloseTo((c.per.nwcPct / 100) * c.revenue, 9);
  });

  it("wirkt im Altverhalten nur auf den Zuwachs", () => {
    const rng = createRng(5);
    const c = holding({ plat: 1.2, acc: 1.2 });
    const rev0 = c.revenue;
    stepCompany(rng, c, market, 3, LEGACY_COMPAT);
    expect(c.per.nwc).toBeCloseTo((c.per.nwcPct / 100) * (c.revenue - rev0), 9);
  });
});
