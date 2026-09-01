import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  ENTRY_FEE, COV_FLOOR, COV_HEADROOM, BASE_RATE, CAPITAL, PERIODS, MAX_SLOTS,
  MIN_HOLD, PROC_Q, PROC_FEE, SECTORS, SECNAMES, EVENTS,
  clamp, ebitdaOf, seatLoad, investableOf, spendFund, newDeal, makeSeats,
  stepCompany, maturePeople, buildInit, makeOffers, applyProceeds, navOf,
  tvpiOf, dpiOf, irrOf, scoreOf, carryOf, newLandmark, healthOf, makeBridge,
} from "../engine";

/* Spielt eine vollständige Partie über alle 20 Halbjahre mit einem festen
   Startwert und festgelegten Entscheidungsregeln durch — ausschließlich über
   die extrahierten Engine-Funktionen, ohne React. Das Ergebnis muss exakt dem
   hinterlegten Sollwert entsprechen. Weicht auch nur eine einzige
   Zufallsziehung an irgendeiner Stelle von der Reihenfolge ab, ändert sich die
   Kaskade der Folgeziehungen und der Test schlägt fehl.

   Der Sollwert stammt ursprünglich aus dem Code vor der Extraktion der
   Spiellogik nach lib/engine/ und war seither unverändert. Am 30.08.2026
   wurde er einmal bewusst neu gesetzt, weil zwei Regeln korrigiert wurden:
   Das Working Capital rechnet seither auf dem Bestand statt nur auf dem
   Umsatzzuwachs, und der Kaufpreis eines Add-ons wird gegen die
   Nettoverschuldung gebucht. Die Zahl der Zufallsziehungen ist dabei
   unverändert geblieben (finalRngPosition), es haben sich ausschließlich
   Beträge verschoben — genau das, was die beiden Korrekturen bewirken
   sollten. Jede weitere Abweichung ist unbeabsichtigt.                    */
function runGoldenGame() {
  const rng = createRng(20260803);
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  const attrs = { sourcing: 2, analysis: 3, negotiation: 2, operations: 3, financing: 2 };
  const fund = {
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  };
  let uidCounter = 0;

  function acquire(quarter: number, type: string) {
    const d = newDeal(rng, type, market, attrs.sourcing);
    const eb = ebitdaOf(d);
    const mult = d.askMult;
    const lev = Math.min(d.levCap, d.levCap * 0.75);
    const ev = eb * mult;
    const entryEquity = ev - eb * lev + ev * ENTRY_FEE;
    if (entryEquity > investableOf(fund, quarter)) return null;
    const c = {
      uid: "c" + uidCounter++, name: d.name, sector: d.sector, desc: d.desc,
      revenue: d.revenue, margin: d.margin, quality: d.quality,
      netDebt: eb * lev, rate: BASE_RATE - 0.25 * attrs.financing,
      holdQ: 0, flag: d.flag,
      ...makeSeats(rng, d), plat: 0.6 + rng.rnd() * 1.2, acc: 0.6 + rng.rnd() * 1.2, nwcFix: 0,
      addonSize: 0.20 + rng.rnd() * 0.15,
      addonComp: rng.rnd() < 0.35 ? 0.8 + rng.rnd() * 1.4 : 0,
      ltip: false, searches: [], initP: null, initA: null, onboard: 0,
      st: 1, proc: null, block: 0, lockUntil: null, cv: false, breach: 0,
      covLimit: Math.max(COV_FLOOR, lev + COV_HEADROOM + 0.10 * attrs.financing),
      capexPct: d.capexPct, nwcPct: d.nwcPct,
      benchMargin: d.benchMargin, benchCapex: d.benchCapex, benchNwc: d.benchNwc,
      dd: true, drift: d.drift, marginDrift: rng.nrm(1.2), entryQuality: d.quality,
      entryMult: mult, entryEbitda: eb, entryDebt: eb * lev,
      entryEV: eb * mult, entryFees: eb * mult * ENTRY_FEE,
      entryEquity, costTotal: entryEquity, cashOut: 0, recapOut: 0, costLeft: entryEquity, entryQ: quarter,
      hist: [{ rev: d.revenue, eb, nd: eb * lev, mg: d.margin, ql: d.quality, eq: eb * mult - eb * lev }],
    };
    c.baseLoad = seatLoad(c);
    spendFund(fund, entryEquity, quarter, undefined);
    fund.investedTotal = (fund.investedTotal || 0) + entryEquity;
    fund.holdings.push(c);
    return c;
  }

  for (let q = 1; q <= PERIODS; q++) {
    if (fund.holdings.length < MAX_SLOTS && q % 2 === 1) {
      acquire(q, q % 4 === 1 ? "prop" : "process");
    }

    if (q === 3 && fund.holdings[0]) {
      fund.holdings[0].searches = [...fund.holdings[0].searches, { seat: "cfo", readyQ: q + 1 }];
    }

    fund.holdings.forEach((c) => {
      stepCompany(rng, c, market, attrs.operations);
      /* Eigene Ereignisquote dieses Szenarios, bewusst unabhängig von EVENT_P:
         Der Test bewacht die Rechenfunktionen der Engine, nicht die
         Spielbalance. Sonst erzwänge jede Feinjustierung der Quote ein neues
         Sollergebnis, und der Test verlöre genau die Empfindlichkeit, für die
         er da ist.                                                         */
      if (rng.rnd() < 0.15) {
        const pool = EVENTS.filter((e) => !e.ok || e.ok(c, rng));
        if (pool.length) {
          const e = rng.pick(pool);
          e.f(c);
        }
      }
    });

    const news = [];
    const shortlists = [];
    fund.holdings.forEach((c) => maturePeople(rng, c, market, q, true, news, shortlists));
    shortlists.forEach((sl) => {
      const c = fund.holdings.find((h) => h.uid === sl.uid);
      if (!c) return;
      const cand = sl.cands[0];
      c[sl.seat] = { skill: cand.skill, dev: cand.dev, poach: cand.poach };
      c.onboard = 1;
      c.searches = (c.searches || []).filter((se) => se.seat !== sl.seat);
    });

    if (q % 3 === 0) {
      const c = fund.holdings.find((h) => !h.initP);
      if (c) {
        const B = buildInit(rng, c, "plat", "opex", market, q);
        if (B && !B.blocked) { c.netDebt += B.debt; c.initP = B.init; }
      }
    }
    if (q % 5 === 0) {
      const c = fund.holdings.find((h) => !h.initA);
      if (c) {
        const B = buildInit(rng, c, "acc", "pen", market, q);
        if (B && !B.blocked) { c.netDebt += B.debt; c.initA = B.init; }
      }
    }

    if (q >= 14) {
      const oldest = fund.holdings
        .filter((c) => !c.proc && c.holdQ >= MIN_HOLD)
        .sort((a, b) => a.entryQ - b.entryQ)[0];
      if (oldest) oldest.proc = { resolveQ: q + PROC_Q };
    }
    fund.holdings = fund.holdings.filter((c) => {
      if (c.proc && q >= c.proc.resolveQ) {
        const offers = makeOffers(rng, c, market, [fund], attrs.negotiation, q);
        const best = offers[0];
        const net = best.price * (1 - PROC_FEE);
        applyProceeds(fund, net, c.entryEquity, q, undefined);
        fund.realized.push({ name: c.name, moic: net / c.entryEquity });
        return false;
      }
      return true;
    });

    SECNAMES.forEach((s) => { market[s] = clamp(market[s] * (1 + rng.nrm(0.05)), SECTORS[s].m * 0.65, SECTORS[s].m * 1.4); });
    if (rng.rnd() < 0.18) { const s = rng.pick(SECNAMES); market[s] = clamp(market[s] * 1.18, 0, SECTORS[s].m * 1.5); }
    if (rng.rnd() < 0.14) { const s = rng.pick(SECNAMES); market[s] = clamp(market[s] * 0.84, SECTORS[s].m * 0.55, 99); }
  }

  const lm = newLandmark(rng, market);
  const sample = fund.holdings[0] || null;
  const health = sample ? healthOf(sample, market) : null;
  const bridge = sample ? makeBridge(sample, 100, 90) : null;

  return {
    finalRngPosition: rng.seed,
    holdingsCount: fund.holdings.length,
    realizedCount: fund.realized.length,
    cash: round(fund.cash),
    undrawn: round(fund.undrawn),
    drawn: round(fund.drawn),
    nav: round(navOf(fund, market)),
    tvpi: round(tvpiOf(fund, market, PERIODS)),
    dpi: round(dpiOf(fund, market, PERIODS)),
    irr: round(irrOf(fund, market, PERIODS)),
    score: round(scoreOf(fund, market, PERIODS)),
    carry: round(carryOf(fund, market, PERIODS)),
    landmark: { sector: lm.sector, revenue: round(lm.revenue), margin: round(lm.margin), askMult: round(lm.askMult), name: lm.name },
    healthMoic: health ? round(health.moic) : null,
    healthCount: health ? health.count : null,
    bridge: bridge ? { entry: round(bridge.entry), ebitda: round(bridge.ebitda), mult: round(bridge.mult), delev: round(bridge.delev), exit: round(bridge.exit) } : null,
    marketFinal: Object.fromEntries(SECNAMES.map((s) => [s, round(market[s])])),
    firstHoldingUid: sample ? sample.uid : null,
  };
}

function round(v: number) { return Math.round(v * 1e6) / 1e6; }

/* Sollwert, erzeugt vor dem Umbau durch denselben Spielverlauf gegen den
   damaligen Code (globaler SEED, bare rnd()/nrm()/pick()/band()). */
const GOLDEN_RESULT = {
  finalRngPosition: 939687543,
  holdingsCount: 2,
  realizedCount: 5,
  cash: 40.417132,
  undrawn: 40.417132,
  drawn: 459.582868,
  nav: 195.371067,
  tvpi: 1.558837,
  dpi: 1.168698,
  irr: 0.080391,
  score: 0.657678,
  carry: 64.208005,
  landmark: {
    sector: "Consumer",
    revenue: 250.534344,
    margin: 17.946246,
    askMult: 11.137611,
    name: "Obereck Nutrition Gruppe",
  },
  healthMoic: 1.781943,
  healthCount: 2,
  bridge: {
    entry: 82.956383,
    ebitda: 86.005777,
    mult: -62.123914,
    delev: -4.639328,
    exit: 90,
  },
  marketFinal: {
    Industrials: 8.229613,
    Healthcare: 10.191985,
    Software: 10.948592,
    Services: 10.215668,
    Consumer: 9.397558,
  },
  firstHoldingUid: "c5",
};

describe("vollständige Partie mit festem Startwert", () => {
  it("liefert nach 20 Halbjahren exakt den vor dem Umbau erzeugten Sollwert", () => {
    expect(runGoldenGame()).toEqual(GOLDEN_RESULT);
  });

  it("teilt den Zufallsstrom nicht zwischen zwei parallelen Partien", () => {
    const rngA = createRng(1);
    const rngB = createRng(1);
    const drawsA = [rngA.rnd(), rngA.rnd(), rngA.rnd()];
    // rngB zieht dazwischen — darf rngA in keiner Weise beeinflussen
    rngB.rnd(); rngB.rnd();
    const drawsA2 = [rngA.rnd(), rngA.rnd()];
    const freshA = createRng(1);
    expect([freshA.rnd(), freshA.rnd(), freshA.rnd(), freshA.rnd(), freshA.rnd()]).toEqual([...drawsA, ...drawsA2]);
  });
});
