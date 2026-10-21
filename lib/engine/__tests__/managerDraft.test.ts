import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { runQuarter } from "../runQuarter";
import {
  ENTRY_FEE, COV_FLOOR, ARCHES, CAPITAL, COV_HEADROOM, BASE_RATE, SECTORS, SECNAMES, EVENTS, EVENT_P, INITS, LEGACY_COMPAT,
  MANAGER_ARCHES, MGMT_UP, MGMT_K,
  ebitdaOf, seatLoad, newDeal, stepCompany, maturePeople, buildInit, navValueOf, fitOf, initRuns, REPEAT_MAX, initSuccess,
  effSkill, mgmtFx, makeCandidates, chemOf, CHEM, makeSeats, botDraft, sideOf, vacateForSearch, severanceOf, inProbation, revealedNow, viewOf, tierOf, seatFromCand, onboardOf, searchLagOf, seatPay, rateOf, dealMultiple, nwcPctOf, targetMargin,
} from "../engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Manager-Draft: Kompetenzprofile, laufende Wirkung, Deck und Eigenschaften.
   Geprüft wird zweierlei. Erstens, dass alles Alte unverändert rechnet —
   eine Position ohne Profil, eine Beteiligung ohne `mx`, die alte Shortlist
   unter LEGACY_COMPAT. Zweitens, dass das Management den Case tatsächlich
   entscheidet: Bei gleichem Assessment-Score und gleichem Gehalt muss die
   passende Besetzung deutlich vor der Fehlbesetzung liegen. */

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

function holding(over: Any = {}): Any {
  const c: Any = {
    uid: "h", name: "Test", sector: "Industrials", revenue: 100, margin: 12, quality: 55, netDebt: 36, rate: 6,
    holdQ: 2, plat: 2, acc: 2, nwcFix: 0, ltip: false, searches: [], initP: null, initA: null, onboard: 0,
    ceo: { skill: 3 }, cfo: { skill: 2.5 }, r3: { skill: 2 }, benchMargin: 15, benchCapex: 4, benchNwc: 20,
    capexPct: 4, nwcPct: 20, drift: 0, marginDrift: 0, covLimit: 5, st: 1, hist: [{ rev: 100, eb: 12 }],
    ...over,
  };
  c.baseLoad = c.baseLoad ?? seatLoad(c);
  return c;
}

describe("Kompetenzprofile", () => {
  it("rechnet eine Position ohne Profil exakt wie das bisherige Rating", () => {
    const c = holding();
    for (const dim of ["plat", "acc"] as const) {
      const seat = dim === "plat" ? "cfo" : "r3";
      for (const k of INITS[dim]) expect(effSkill(c, seat, k.id)).toBeCloseTo(effSkill(c, seat), 12);
    }
  });

  it("nimmt je Programm die passende Kompetenz, gedeckelt durch die Leadership des CEO", () => {
    const c = holding({
      ceo: { skill: 3, prof: [4, 2, 3] },
      cfo: { skill: 3, prof: [5, 2.5, 1.5] },
    });
    // Cost-out: Performance Improvement 5, gedeckelt bei Leadership 3 + 1,5; halbe Operational Excellence
    expect(effSkill(c, "cfo", "opex")).toBeCloseTo(4.5 + 0.5 * 4, 12);
    expect(effSkill(c, "cfo", "nwc")).toBeCloseTo(2.5 + 0.5 * 4, 12);
    expect(effSkill(c, "cfo", "erp")).toBeCloseTo(1.5 + 0.5 * 4, 12);
    // Growth-Programme nehmen die Growth-Kompetenz des CEO
    expect(effSkill(c, "r3", "pen")).toBeCloseTo(2 + 0.5 * 2, 12);
  });

  it("schaltet KI-Automatisierung über Finance Transformation frei, nicht über den Durchschnitt", () => {
    const ai = INITS.plat.find((k) => k.id === "ai")!;
    const strong = holding({ cfo: { skill: 2.9, prof: [2.2, 2.0, 4.5] } });
    // Höherer Assessment-Score, aber die Lücke genau dort, wo KI sie braucht
    const broad = holding({ cfo: { skill: 3.0, prof: [3.6, 3.4, 2.0] } });
    expect(ai.req!(strong)).toBe(true);
    expect(ai.req!(broad)).toBe(false);
  });
});

describe("Laufende Wirkung", () => {
  it("wirkt nur auf Beteiligungen mit mx", () => {
    const c = holding({ cfo: { skill: 4, prof: [4, 4, 4] } });
    expect(mgmtFx(c)).toEqual({ margin: 0, growth: 0, nwc: 0, rate: 0, capex: 0 });
    expect(mgmtFx({ ...c, mx: true }).nwc).toBeLessThan(0);
  });

  it("senkt die Kapitalbindung mit Cash & Working Capital, gewichtet mit dem Bedarf", () => {
    const hi = holding({ mx: true, nwcPct: 25, cfo: { skill: 3.5, prof: [2.5, 4.0, 2.5] } });
    const lo = holding({ mx: true, nwcPct: 6, cfo: { skill: 3.5, prof: [2.5, 4.0, 2.5] } });
    expect(mgmtFx(hi).nwc).toBeCloseTo(-MGMT_K * 1.5 * fitOf("nwc", hi), 9);
    expect(mgmtFx(hi).nwc).toBeLessThan(mgmtFx(lo).nwc);
    expect(nwcPctOf(hi)).toBeLessThan(nwcPctOf({ ...hi, mx: false }));
  });

  it("deckelt nach oben, aber nicht nach unten", () => {
    const top = holding({ mx: true, cfo: { skill: 5, prof: [5, 5, 5] } });
    const four = holding({ mx: true, cfo: { skill: 4, prof: [4, 4, 4] } });
    expect(mgmtFx(top).nwc).toBeCloseTo(mgmtFx(four).nwc, 12);
    expect(MGMT_UP).toBe(1.5);
    const weak = holding({ mx: true, cfo: { skill: 1, prof: [1, 1, 1] } });
    expect(Math.abs(mgmtFx(weak).nwc)).toBeCloseTo(Math.abs(mgmtFx(four).nwc), 12);
  });

  it("lässt eine vakante Position wie ein Interim unter Marktniveau wirken", () => {
    const vac = holding({ mx: true, cfo: { skill: 0, was: 2.5 } });
    expect(mgmtFx(vac).nwc).toBeGreaterThan(0);
    expect(targetMargin(vac)).toBeLessThan(targetMargin({ ...vac, mx: false }));
  });
});

describe("Shortlist als Deck", () => {
  it("zieht fünf Karten mit allen drei Spezialisten der Position", () => {
    for (const seat of ["ceo", "cfo", "r3"]) {
      for (let s = 1; s <= 50; s++) {
        const deck = makeCandidates(createRng(s), seat);
        expect(deck).toHaveLength(5);
        const keys = deck.map((k) => k.arch);
        for (const a of MANAGER_ARCHES[seat].slice(0, 3)) expect(keys).toContain(a.key);
        for (const k of deck) {
          expect(k.prof).toHaveLength(3);
          expect(k.skill).toBeCloseTo(mean(k.prof!), 12);
          expect(Math.abs(k.shown - mean(k.shownProf!))).toBeLessThan(0.051);
          for (let i = 0; i < 3; i++) expect(Math.abs(k.prof![i] - k.shownProf![i])).toBeLessThanOrEqual(k.span + 1e-9);
        }
      }
    }
  });

  it("mischt Frauen und Männer, ohne dass das Geschlecht die Kompetenzen bewegt", () => {
    const f: number[] = [], m: number[] = [];
    for (let s = 1; s <= 400; s++) for (const k of makeCandidates(createRng(s), "cfo")) (k.g === "f" ? f : m).push(k.skill);
    expect(f.length / (f.length + m.length)).toBeGreaterThan(0.4);
    expect(f.length / (f.length + m.length)).toBeLessThan(0.6);
    expect(Math.abs(mean(f) - mean(m))).toBeLessThan(0.1);
  });

  it("liefert unter LEGACY_COMPAT die alte Shortlist mit denselben Zufallszahlen", () => {
    const old = makeCandidates(createRng(5), "cfo", LEGACY_COMPAT);
    expect(old.map((k) => k.label)).toEqual(["Der Branchenveteran", "Der A-Player aus dem Konzern", "Das Entwicklungsprofil"]);
    const rng = createRng(5);
    const draw = (mid: number, sp: number) => Math.max(1, Math.min(5, mid + (rng.rnd() * 2 - 1) * sp));
    expect(old.map((k) => k.skill)).toEqual([draw(2.5, 0.5), draw(5, 0.5), draw(2, 1.5)]);
  });

  it("macht aus einer alten Karte ein flaches Rating und aus einer neuen ein Profil", () => {
    expect(seatFromCand({ skill: 3.2, dev: false, poach: 1 })).toEqual({ skill: 3.2, dev: false, poach: 1 });
    const k = makeCandidates(createRng(9), "r3")[0];
    const s = seatFromCand(k, 4) as Any;
    expect(s.prof).toEqual(k.prof);
    expect(s.hiredQ).toBe(4);
    expect(s.name).toBe(k.name);
  });
});

describe("Eigenschaften", () => {
  const card = (trait: string, seat = "cfo") => {
    for (let s = 1; s < 5000; s++) {
      const k = makeCandidates(createRng(s), seat).find((x) => x.trait === trait);
      if (k) return k;
    }
    throw new Error("Eigenschaft nie gezogen: " + trait);
  };

  it("Hohe Bindung halbiert, Flight Risk verdoppelt das Abwerbungsrisiko", () => {
    expect(card("bind").poach / (card("bind").arch === "serial" ? 2 : 1)).toBe(0.5);
    expect(card("flight").poach / (card("flight").arch === "serial" ? 2 : 1)).toBe(2);
  });

  it("Day-1-ready braucht keine Einarbeitung, Starkes Netzwerk beschleunigt die Suche", () => {
    expect(onboardOf(card("day1"))).toBe(0);
    expect(onboardOf(card("bind"))).toBe(1);
    const c = holding({ cfo: seatFromCand(card("network"), 1) });
    expect(searchLagOf(c)).toBe(0);
    expect(searchLagOf(holding())).toBe(1);
  });

  it("Co-Investor senkt das Fixum und wirkt wie ein MEP", () => {
    const k = card("coinvest");
    const c = holding({ cfo: seatFromCand(k, 1) });
    const plain = holding({ cfo: { ...seatFromCand(k, 1), trait: "bind", payF: undefined } });
    expect(seatPay(c.cfo, "cfo", 12)).toBeCloseTo(0.9 * seatPay(plain.cfo, "cfo", 12), 12);
    expect(effSkill(c, "cfo", "opex")).toBeCloseTo(effSkill(plain, "cfo", "opex") + 0.5, 12);
  });

  it("Lender-erfahren senkt die Zinsmarge, Sponsor-erfahren hebt das Exit-Multiple", () => {
    const k = card("lender");
    const c = holding({ cfo: seatFromCand(k, 1) });
    expect(rateOf(c, 12)).toBeCloseTo(rateOf({ ...c, cfo: { ...c.cfo, trait: "bind" } }, 12) - 0.25, 12);
    const market = Object.fromEntries(SECNAMES.map((s) => [s, SECTORS[s].m]));
    const sp = holding({ ceo: seatFromCand(card("sponsor", "ceo"), 1) });
    expect(dealMultiple(sp, market, 2)).toBeGreaterThan(dealMultiple({ ...sp, ceo: { ...sp.ceo, trait: "bind" } }, market, 2));
  });

  it("Risk-Taker erhöht die Erfolgsquote marktabhängiger Programme und verteuert den Fehlschlag", () => {
    const market = Object.fromEntries(SECNAMES.map((s) => [s, SECTORS[s].m]));
    const k = card("risk", "r3");
    const c = holding({ r3: seatFromCand(k, 1) });
    const ref = holding({ r3: { ...seatFromCand(k, 1), trait: "bind" } });
    const a: Any = buildInit(createRng(1), c, "acc", "exp", market, 3);
    const b: Any = buildInit(createRng(1), ref, "acc", "exp", market, 3);
    expect(a.p - b.p).toBeCloseTo(Math.min(0.97, b.p + 0.05) - b.p, 12);
    expect(a.init.failMult).toBe(1.5);
    expect(b.init.failMult).toBeUndefined();
  });

  it("Talentförderer beschleunigt die Entwicklung der Step-up-Kandidaten im Team", () => {
    const market = Object.fromEntries(SECNAMES.map((s) => [s, SECTORS[s].m]));
    const step = { skill: 2, dev: true, poach: 0, prof: [2, 2, 2] };
    const run = (trait: string) => {
      const c = holding({ ceo: { skill: 3, prof: [3, 3, 3], trait, poach: 0 }, cfo: { ...step } });
      maturePeople(createRng(3), c, market, 3, false, [], []);
      return c.cfo.prof[0];
    };
    expect(run("mentor") - run("bind")).toBeCloseTo(0.1, 12);
  });
});

/* Der eigentliche Zweck: Management entscheidet den Case. Ein Case, gleicher
   Kaufpreis, fünf Jahre aktiv geführt, Gehälter eingerechnet (die
   Einstiegsmarge enthält ein Team auf Marktniveau). Gemessen mit derselben
   Spielweise wie bei der Kalibrierung: Der Spieler wählt je Werkbank das
   Programm mit dem besten Produkt aus Eignung und Erfolgsquote. */
function playCase(seed: number, team: (c: Any) => Record<string, number[]>, mx = true, sides: string[] = []) {
  const rng = createRng(seed);
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  const d: Any = newDeal(rng, "process", market, 2);
  const eb = ebitdaOf(d), lev = d.levCap * 0.75;
  const entryEquity = eb * d.askMult * (1 + ENTRY_FEE) - eb * lev;
  const c: Any = {
    uid: "c", name: d.name, sector: d.sector, revenue: d.revenue, margin: d.margin, quality: d.quality,
    netDebt: eb * lev, rate: BASE_RATE - 0.5, holdQ: 0, flag: d.flag, plat: 1.2, acc: 1.2, nwcFix: 0,
    addonSize: 0.275, addonComp: 0, ltip: false, searches: [], initP: null, initA: null, onboard: 0, st: 1, breach: 0,
    covLimit: Math.max(COV_FLOOR, lev + COV_HEADROOM + 0.2), capexPct: d.capexPct, nwcPct: d.nwcPct,
    benchMargin: d.benchMargin, benchCapex: d.benchCapex, benchNwc: d.benchNwc, dd: true, drift: d.drift, marginDrift: 0,
    entryEquity, costTotal: entryEquity, cashOut: 0, hist: [{ rev: d.revenue, eb, nd: eb * lev, mg: d.margin, ql: d.quality }], mx,
    ceo: { skill: 2.5 }, cfo: { skill: 2.5 }, r3: { skill: 2.5 },
  };
  c.baseLoad = seatLoad(c);
  const T = team(c);
  const seats = () => ["ceo", "cfo", "r3"].forEach((k, i) => (c[k] = { skill: mean(T[k]), prof: [...T[k]], poach: 0, ...(sides[i] ? { side: sides[i] } : {}) }));
  seats();
  const p = (seat: string, k: Any) => Math.min(0.97, initSuccess(effSkill(c, seat, k.id), k.cls) + (k.sm || 0));
  for (let q = 1; q <= 10; q++) {
    for (const dim of ["plat", "acc"] as const) {
      const slot = dim === "plat" ? "initP" : "initA", seat = dim === "plat" ? "cfo" : "r3";
      if (c[slot]) continue;
      const k = INITS[dim].filter((x: Any) => !x.ma && initRuns(c, x.id) < REPEAT_MAX && (!x.req || x.req(c)))
        .sort((a: Any, b: Any) => fitOf(b.id, c) * p(seat, b) - fitOf(a.id, c) * p(seat, a))[0];
      if (!k) continue;
      const B: Any = buildInit(rng, c, dim, k.id, market, q);
      if (B && !B.blocked) { c.netDebt += B.debt; c[slot] = B.init; }
    }
    stepCompany(rng, c, market, 3);
    if (rng.rnd() < EVENT_P) { const pool = EVENTS.filter((e: Any) => !e.ok || e.ok(c, rng)); if (pool.length) rng.pick(pool).f(c); }
    seats(); maturePeople(rng, c, market, q, false, [], []); seats();
  }
  return (navValueOf(c, market) + (c.cashOut || 0)) / entryEquity;
}
const flat = (v: number) => () => ({ ceo: [v, v, v], cfo: [v, v, v], r3: [v, v, v] });
// Drei Spezialisten mit Assessment-Score 3,0: die Stärke dort, wo der Case sie braucht — oder genau umgekehrt
const specialists = (fit: boolean) => (c: Any) => {
  const at: Record<string, number> = { opex: 0, nwc: 1, erp: 2, pen: 0, exp: 1 };
  const pl = ["opex", "nwc", "erp"].sort((a, b) => fitOf(b, c) - fitOf(a, c));
  const order = fit ? pl : [...pl].reverse();
  const cfo = [0, 0, 0];
  [5, 2.5, 1.5].forEach((v, i) => (cfo[at[order[i]]] = v));
  const ac = ["pen", "exp"].sort((a, b) => fitOf(b, c) - fitOf(a, c));
  const r3 = [0, 0, 0];
  if (fit) { r3[at[ac[0]]] = 5; r3[at[ac[1]]] = 2.5; r3[2] = 1.5; } else { r3[2] = 5; r3[at[ac[1]]] = 2.5; r3[at[ac[0]]] = 1.5; }
  const needOps = (c.benchMargin - c.margin) + 0.5 * (c.nwcPct - 12) / 4 > SECTORS[c.sector].g - 4.5;
  return { ceo: (fit ? needOps : !needOps) ? [4.5, 1.5, 3] : [1.5, 4.5, 3], cfo, r3 };
};

describe("Management entscheidet den Case", () => {
  const N = 250;
  const avg = (team: Any, mx = true) => mean(Array.from({ length: N }, (_, i) => playCase((i + 1) * 7717, team, mx)));

  it("trennt passende und falsche Besetzung bei gleichem Score und Gehalt deutlich", () => {
    const fit = avg(specialists(true)), miss = avg(specialists(false));
    const fitOld = avg(specialists(true), false), missOld = avg(specialists(false), false);
    // Kalibriert auf rund 0,6x; ohne laufende Wirkung waren es rund 0,26x
    expect(fit - miss).toBeGreaterThan(0.45);
    expect(fit - miss).toBeGreaterThan(1.6 * (fitOld - missOld));
  });

  it("ordnet die Teams so, wie ein Investment Committee es erwarten würde", () => {
    const weak = avg(flat(2)), mid = avg(flat(3)), fit = avg(specialists(true)), miss = avg(specialists(false)), top = avg(flat(4.5));
    expect(weak).toBeLessThan(miss);
    expect(miss).toBeLessThan(mid);
    expect(mid).toBeLessThan(fit);
    expect(fit).toBeLessThan(top);
  });
});


/* Chemie im Top-Team: helle und dunkle Charaktere. */
describe("Chemie", () => {
  const team = (a: string, b: string, d: string, over: Any = {}) => holding({
    mx: true, ceo: { skill: 3, side: a }, cfo: { skill: 3, side: b }, r3: { skill: 3, side: d }, ...over,
  });

  it("ist eingespielt, wenn alle drei dieselbe Farbe haben, und sonst neutral, ohne Malus", () => {
    expect(chemOf(team("hell", "hell", "hell"))).toBe(CHEM);
    expect(chemOf(team("dunkel", "dunkel", "dunkel"))).toBe(CHEM);
    expect(chemOf(team("hell", "dunkel", "hell"))).toBe(0);
    // Eine Vakanz: neutral, ob die übrigen gleich sind oder nicht
    expect(chemOf(team("hell", "hell", "hell", { r3: { skill: 0 } }))).toBe(0);
    expect(chemOf(team("hell", "dunkel", "hell", { r3: { skill: 0 } }))).toBe(0);
  });

  it("bleibt neutral ohne mx und mit einer Position ohne Haltung", () => {
    expect(chemOf(team("hell", "dunkel", "hell", { mx: false }))).toBe(0);
    expect(chemOf(team("hell", "dunkel", "hell", { cfo: { skill: 3 } }))).toBe(0);
  });

  it("hebt jede Kompetenz um CHEM, in Programmen und in der laufenden Wirkung; gemischt kostet nichts", () => {
    const on = team("hell", "hell", "hell"), off = team("hell", "dunkel", "hell"), zero = team("hell", "hell", "hell", { cfo: { skill: 3 } });
    // Fachposition plus halbe CEO-Kompetenz der Familie
    expect(effSkill(on, "cfo", "opex") - effSkill(zero, "cfo", "opex")).toBeCloseTo(1.5 * CHEM, 12);
    expect(effSkill(off, "cfo", "opex")).toBeCloseTo(effSkill(zero, "cfo", "opex"), 12);
    expect(mgmtFx(on).nwc).toBeLessThan(mgmtFx(zero).nwc);
    expect(mgmtFx(off).nwc).toBeCloseTo(mgmtFx(zero).nwc, 12);
  });

  it("verteilt die Farben der Altmannschaft unabhängig voneinander", () => {
    // Bis 21.10.2026 hatten CEO und CFO derselben Firma immer verschiedene Farben
    let same = 0, all = 0;
    for (let i = 0; i < 400; i++) {
      const n = "Firma " + i * 7919;
      if (sideOf(n + ":ceo") === sideOf(n + ":cfo")) same++;
      if (sideOf(n + ":ceo") === sideOf(n + ":cfo") && sideOf(n + ":cfo") === sideOf(n + ":r3")) all++;
    }
    expect(same / 400).toBeGreaterThan(0.4);
    expect(same / 400).toBeLessThan(0.6);
    expect(all / 400).toBeGreaterThan(0.17);
    expect(all / 400).toBeLessThan(0.33);
  });

  it("wirkt in der laufenden Wirkung auch oberhalb des Deckels", () => {
    const star = (side: string) => holding({ mx: true, ceo: { skill: 3, side: "hell" }, cfo: { skill: 5, prof: [5, 5, 5], side }, r3: { skill: 3, side: "hell" } });
    expect(mgmtFx(star("hell")).nwc).toBeLessThan(mgmtFx(star("dunkel")).nwc);
  });

  it("gibt Amtsinhabern eine feste Haltung, ohne eine Zufallszahl zu ziehen", () => {
    const a = createRng(5), b = createRng(5);
    const s1: Any = makeSeats(a, { name: "Musterwerk GmbH" });
    const s2: Any = makeSeats(b, { name: "Musterwerk GmbH" });
    expect(s1).toEqual(s2);
    expect(a.rnd()).toBe(b.rnd());
    for (const k of ["ceo", "cfo", "r3"]) if (s1[k].skill > 0) expect(["hell", "dunkel"]).toContain(s1[k].side);
  });

  it("zieht helle und dunkle Karten im Deck und gibt die Haltung an den Amtsinhaber weiter", () => {
    const rng = createRng(11);
    const all = Array.from({ length: 40 }, () => makeCandidates(rng, "cfo")).flat();
    const dark = all.filter((k) => k.side === "dunkel").length / all.length;
    expect(dark).toBeGreaterThan(0.35);
    expect(dark).toBeLessThan(0.65);
    expect((seatFromCand(all[0]) as Any).side).toBe(all[0].side);
  });

  it("lässt die KI-Fonds bei gleicher Karte die passende Haltung wählen", () => {
    const c = team("dunkel", "dunkel", "dunkel", { cfo: { skill: 0 } });
    const picks = Array.from({ length: 60 }, (_, i) => botDraft(createRng(i + 1), "all", "cfo", 3.6, c));
    const ref = Array.from({ length: 60 }, (_, i) => botDraft(createRng(i + 1), "all", "cfo", 3.6));
    const share = (xs: Any[]) => xs.filter((k) => k.side === "dunkel").length / xs.length;
    expect(share(picks)).toBeGreaterThan(share(ref) + 0.15);
  });

  it("trennt eingespielte von gemischten Teams spürbar, ohne die passende Besetzung zu überholen", () => {
    const N = 250;
    const avg = (t: Any, sides: string[]) => mean(Array.from({ length: N }, (_, i) => playCase((i + 1) * 7717, t, true, sides)));
    const same = ["hell", "hell", "hell"], mixed = ["hell", "dunkel", "hell"];
    const fitOn = avg(specialists(true), same), fitOff = avg(specialists(true), mixed);
    const missOn = avg(specialists(false), same);
    // Bonus 0,4 ohne Malus: rund 0,2x beim passgenauen Team
    expect(fitOn - fitOff).toBeGreaterThan(0.15);
    expect(fitOn - fitOff).toBeLessThan(0.4);
    expect(fitOff).toBeGreaterThan(missOn);
  });
});

/* Probezeit und Seltenheit: reine Ansicht, die Rechnung bleibt beim wahren Profil. */
describe("Probezeit", () => {
  const card: Any = { ...makeCandidates(createRng(3), "cfo")[0] };
  const seat: Any = seatFromCand(card, 6);

  it("zeigt bis zum Halbjahr nach der Verpflichtung das Assessment und deckt danach auf", () => {
    expect(inProbation(seat, 6)).toBe(true);
    expect(inProbation(seat, 7)).toBe(true);
    expect(inProbation(seat, 8)).toBe(false);
    expect(revealedNow(seat, 8)).toBe(true);
    expect(revealedNow(seat, 9)).toBe(false);
  });

  it("tauscht in der Ansicht das wahre gegen das gezeigte Profil, ohne die Beteiligung zu ändern", () => {
    const c = holding({ mx: true, cfo: seat });
    const v = viewOf(c, 7);
    expect(v.cfo.prof).toEqual(seat.shownProf);
    expect(c.cfo.prof).toEqual(seat.prof);
    expect(viewOf(c, 8)).toBe(c);
    // Amtsinhaber und alte Karten ohne Profil haben keine Probezeit
    expect(viewOf(holding(), 7)).toEqual(holding());
  });

  it("stuft nach Assessment-Score in Bronze, Silber und Gold ein", () => {
    expect([2.4, 2.5, 3.49, 3.5, 4.49, 4.9].map(tierOf)).toEqual(["bronze", "silber", "silber", "gold", "gold", "gold"]);
  });
});

/* Vakanzen und Ersatz: Ein vakanter CEO führt kommissarisch, und wer einen
   Ersatz sucht, verliert die bisherige Person sofort. */
describe("Vakanz und Ersatz", () => {
  it("lässt einen vakanten CEO mit mx als Interim auf 2,0 führen statt die Fachpositionen auf 1,5 zu deckeln", () => {
    const base = { ceo: { skill: 0 }, cfo: { skill: 4, prof: [4, 4, 4] }, r3: { skill: 3 } };
    const neu = holding({ ...base, mx: true }), alt = holding(base);
    // min(4, 2,0 + 1,5) + 0,5 × 2,0 gegen min(4, 0 + 1,5) + 0
    expect(effSkill(neu, "cfo", "opex")).toBeCloseTo(3.5 + 1.0, 12);
    expect(effSkill(alt, "cfo", "opex")).toBeCloseTo(1.5, 12);
  });

  it("macht die Position beim Suchstart frei und gibt die Abfindung zurück", () => {
    const c = holding({ mx: true, cfo: { skill: 3.2, side: "hell" } });
    const sev = vacateForSearch(c, "cfo");
    expect(sev).toBeCloseTo(severanceOf("cfo", 3.2, ebitdaOf(c)), 12);
    expect(c.cfo.skill).toBe(0);
    // Eine vakante Position kostet nichts
    expect(vacateForSearch(c, "cfo")).toBe(0);
  });
});

describe("Ersatz in der Auswertung", () => {
  const fund = (slot: number, ai: string | null): Any => {
    const a = ai ? ARCHES.find((x) => x.key === ai)! : null;
    return { slot, profileId: ai ? null : "p" + slot, isAi: !!ai, archetype: ai, name: a ? a.name : "Fonds",
      attrs: a ? a.attrs : { sourcing: 3, analysis: 3, negotiation: 2, operations: 2, financing: 2 },
      cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
      undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [] };
  };
  // Spielt, bis der Spieler eine Beteiligung mit besetztem CEO hält
  function withHolding() {
    const rng = createRng(77);
    const market: Record<string, number> = {};
    SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
    let state: Any = { market, funds: [fund(0, null), fund(1, "ops")], feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {} };
    for (let i = 0; i < 4; i++) state.deals.push(newDeal(rng, "process", market));
    for (let hy = 1; hy <= 6; hy++) {
      const c = state.funds[0].holdings.find((h: Any) => h.ceo.skill > 0 && !(h.searches || []).length);
      if (c) return { state, rng, hy, c };
      const d = state.deals[0];
      state = runQuarter({ state, halfYear: hy, rng, decisionsBySlot: { 0: { bids: [{ dealId: d.id, multiple: d.askMult * 1.2, leverage: Math.min(d.levCap, 2.8) }] } } }).state;
    }
    throw new Error("keine Beteiligung");
  }

  it("lässt die bisherige Person beim Suchstart gehen und bucht die Abfindung sofort", () => {
    const { state, rng, hy, c } = withHolding();
    const out = runQuarter({ state, halfYear: hy, rng, decisionsBySlot: { 0: { searches: [{ holdingUid: c.uid, seat: "ceo" }] } } }).state;
    const h: Any = (out.funds[0].holdings as Any[]).find((x: Any) => x.uid === c.uid);
    expect(h.ceo.skill).toBe(0);
    expect(h.searches.some((x: Any) => x.seat === "ceo")).toBe(true);
    expect(out.feed.some((f: Any) => f.slot === 0 && /Der bisherige CEO geht/.test(f.text))).toBe(true);
  });

  it("behält unter LEGACY_COMPAT den Amtsinhaber bis zur Verpflichtung", () => {
    const { state, rng, hy, c } = withHolding();
    const sk = c.ceo.skill;
    const out = runQuarter({ state, halfYear: hy, rng, compat: LEGACY_COMPAT, decisionsBySlot: { 0: { searches: [{ holdingUid: c.uid, seat: "ceo" }] } } }).state;
    const h: Any = (out.funds[0].holdings as Any[]).find((x: Any) => x.uid === c.uid);
    expect(h.ceo.skill).toBeGreaterThan(0);
    expect(h.ceo.skill).toBeCloseTo(sk, 0);
  });
});
