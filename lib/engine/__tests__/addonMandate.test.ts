import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  ARCHES, CAPITAL, DEFAULT_HUMAN_ATTRS, PERIODS, SECNAMES, SECTORS,
  ADDON_FAIL_BASE, ADDON_MAX_SHARE, ADDON_REF_SHARE, ADDON_REF_PLAT, ADDON_REF_SKILL, ADDON_REF_LEV,
  addonAsk, addonCheck, addonMandate, addonMaxEb, buildInit, ebitdaOf, effSkill, markMultiple,
} from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const market: Record<string, number> = {};
SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));

/* Eine Plattform genau auf der Referenz, auf die das Scheiterungsrisiko
   kalibriert ist: Prozessreife und effektives Rating der Fachrolle auf
   ADDON_REF_*, Leverage auf ADDON_REF_LEV. Die Ratings werden so gesetzt, dass
   effSkill() (gedeckelte Fachrolle + halber CEO) genau ADDON_REF_SKILL
   ergibt. */
function refPlatform(over: Any = {}): Any {
  const c: Any = {
    uid: "ref", name: "Referenzwerk", sector: "Industrials",
    revenue: 100, margin: 12, quality: 55, netDebt: 0, rate: 6,
    holdQ: 4, plat: ADDON_REF_PLAT, acc: 2, nwcFix: 0,
    ceo: { skill: 2 }, cfo: { skill: 2 }, r3: { skill: 1 },
    ltip: false, searches: [], initP: null, initA: null, onboard: 0,
    st: 1, proc: null, block: 0, lockUntil: null, cv: false, breach: 0, covLimit: 12,
    capexPct: 3, nwcPct: 20, benchMargin: 12, benchCapex: 3, benchNwc: 20,
    dd: true, drift: 0, marginDrift: 0, done: [], addonComp: 0,
    entryMult: 8, entryEbitda: 12, entryDebt: 0, entryEV: 96,
    entryEquity: 96, costTotal: 96, costLeft: 96, cashOut: 0, recapOut: 0, entryQ: 0, hist: [],
    ...over,
  };
  c.netDebt = ADDON_REF_LEV * ebitdaOf(c);
  return c;
}

describe("Zukaufsmandat", () => {
  it("steht auf der Referenz genau auf dem kalibrierten Risiko", () => {
    const c = refPlatform();
    // Testaufbau: die Referenzplattform muss die Referenz auch treffen
    expect(effSkill(c, "r3"), "effektives Rating der Fachrolle").toBeCloseTo(ADDON_REF_SKILL, 9);
    expect(c.plat).toBe(ADDON_REF_PLAT);
    expect(c.netDebt / ebitdaOf(c)).toBeCloseTo(ADDON_REF_LEV, 9);

    const m = addonMandate(c, market);
    expect(m.addEb / ebitdaOf(c), "Referenzgröße").toBeCloseTo(ADDON_REF_SHARE, 9);
    expect(m.mult, "voller Preis").toBeCloseTo(addonAsk(c, market, m.addEb), 9);
    expect(addonCheck(c, market, m).fail, "Risiko im Referenzfall").toBeCloseTo(ADDON_FAIL_BASE, 9);
  });

  it("steigt mit der Zielgröße und mit dem Abschlag auf den Preis", () => {
    const c = refPlatform();
    const eb = ebitdaOf(c);
    const risk = (share: number, under: number) => {
      const addEb = eb * share;
      return addonCheck(c, market, { addEb, mult: addonAsk(c, market, addEb) - under }).fail;
    };
    // Größe: monoton steigend
    const bySize = [0.10, 0.20, 0.30, 0.40, 0.50].map((s) => risk(s, 0));
    for (let i = 1; i < bySize.length; i++) expect(bySize[i]).toBeGreaterThan(bySize[i - 1]);
    // … und ein kleiner Bissen liegt unter dem Referenzfall
    expect(risk(0.10, 0)).toBeLessThan(ADDON_FAIL_BASE);
    expect(risk(0.50, 0)).toBeGreaterThan(ADDON_FAIL_BASE);

    // Gebot: monoton steigend, je weiter unter der Preisvorstellung
    const byPrice = [0, 0.5, 1, 2].map((u) => risk(ADDON_REF_SHARE, u));
    for (let i = 1; i < byPrice.length; i++) expect(byPrice[i]).toBeGreaterThan(byPrice[i - 1]);
  });

  it("behandelt das Höchstgebot als Obergrenze, nicht als Preis", () => {
    const c = refPlatform();
    const addEb = ebitdaOf(c) * ADDON_REF_SHARE;
    const ask = addonAsk(c, market, addEb);
    const voll = addonCheck(c, market, { addEb, mult: ask });
    const drueber = addonCheck(c, market, { addEb, mult: ask + 5 });
    // Über der Preisvorstellung zahlt niemand — und es kauft auch kein Risiko ab
    expect(drueber.mult).toBeCloseTo(ask, 9);
    expect(drueber.price).toBeCloseTo(voll.price, 9);
    expect(drueber.fail).toBeCloseTo(voll.fail, 9);
    // Darunter wird es billiger und riskanter zugleich — das ist der Trade-off
    const drunter = addonCheck(c, market, { addEb, mult: ask - 1 });
    expect(drunter.price).toBeLessThan(voll.price);
    expect(drunter.fail).toBeGreaterThan(voll.fail);
    expect(drunter.price).toBeCloseTo(addEb * (ask - 1), 9);
  });

  it("verlangt für ein größeres Ziel relativ mehr — die Arbitrage schrumpft", () => {
    const c = refPlatform();
    const eb = ebitdaOf(c);
    const plat = markMultiple(c, market);
    const klein = plat - addonAsk(c, market, eb * 0.10);
    const gross = plat - addonAsk(c, market, eb * 0.50);
    expect(klein, "Größenabschlag beim kleinen Ziel").toBeGreaterThan(gross);
    expect(gross, "auch das große Ziel ist nicht teurer als die Plattform").toBeGreaterThanOrEqual(0);
  });

  it("gibt dem Vorgang genau das Mandat mit, das entschieden wurde", () => {
    const c = refPlatform();
    const addEb = ebitdaOf(c) * 0.35;
    const ask = addonAsk(c, market, addEb);
    const B = buildInit(createRng(5), c, "acc", "ma", market, 3, {}, { addEb, mult: ask - 0.5 }) as Any;
    expect(B.blocked).toBeUndefined();
    expect(B.init.addEb).toBeCloseTo(addEb, 9);
    expect(B.init.mult).toBeCloseTo(ask - 0.5, 9);
    expect(B.init.price).toBeCloseTo(addEb * (ask - 0.5), 9);
    expect(B.init.addDebt).toBeCloseTo(B.init.price, 9);
    // Erfolgswahrscheinlichkeit ist die Gegenseite des ausgewiesenen Risikos
    expect(B.p).toBeCloseTo(1 - B.init.fail, 9);
  });
});

/* ---------------------------------------------------------------- */

function initialFund(slot: number, isAi: boolean, archetype: string | null): RuntimeFund {
  const arch = archetype ? ARCHES.find((a) => a.key === archetype)! : null;
  return {
    slot, profileId: isAi ? null : "player-" + slot, isAi, archetype,
    name: isAi ? arch!.name : "Fonds " + slot,
    attrs: isAi ? arch!.attrs : { ...DEFAULT_HUMAN_ATTRS },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  } as Any;
}

function baseState(): RuntimeState {
  const m: Record<string, number> = {};
  SECNAMES.forEach((s) => (m[s] = SECTORS[s].m));
  return {
    market: m,
    funds: [initialFund(0, false, null), ...["sourcing", "ops", "fin", "all"].map((k, i) => initialFund(i + 1, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
}

/* Spielt Partien, in denen der Spieler jede freie Beteiligung mit demselben
   Mandat zukauft, und zählt, wie oft die Integration tatsächlich scheitert. */
function playAddons(share: number, under: number, seeds: number) {
  let ok = 0, failed = 0, capped = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const rng = createRng(seed * 7919);
    let state = baseState();
    const boot = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals: boot.deals, landmark: boot.landmark };
    const seen = new Set<string>();
    for (let hy = 1; hy <= PERIODS; hy++) {
      const me = state.funds[0] as Any;
      const d: TurnDecisions = {};
      if (me.holdings.length < 6 && state.deals.length) {
        const deal = (state.deals as Any[])[0];
        d.bids = [{ dealId: deal.id, multiple: deal.askMult, leverage: deal.levCap * 0.8 }];
        d.dueDiligence = [deal.id];
      }
      const free = (me.holdings as Any[]).find((h) => !h.initA);
      if (free) {
        const addEb = Math.min(ebitdaOf(free) * share, addonMaxEb(free));
        if (ebitdaOf(free) * share > addonMaxEb(free) + 1e-9) capped++;
        d.initiatives = [{
          holdingUid: free.uid, dim: "acc", id: "ma",
          addEb, maxMult: addonAsk(free, state.market, addEb) - under,
        } as Any];
      }
      state = runQuarter({ state, halfYear: hy, decisionsBySlot: { 0: d }, rng } as Any).state;
      for (const c of state.funds[0].holdings as Any[]) {
        for (const a of (c.addons || []) as Any[]) {
          const key = c.uid + ":" + a.q;
          if (seen.has(key)) continue;
          seen.add(key);
          if (a.ok) ok++; else failed++;
        }
      }
    }
  }
  return { ok, failed, capped, rate: failed / Math.max(1, ok + failed) };
}

describe("Kalibrierung des Zukaufs", () => {
  /* Die Vorgabe: Bei der Größenordnung der alten Logik — 20 bis 30 % des
     Konzern-EBITDA — und zum Marktpreis soll die Integration in rund einem
     Zehntel der Fälle scheitern. Vorher war es knapp die Hälfte, weil das
     Risiko aus Zahlen kam, die der Spieler nicht gesetzt hatte. */
  it("scheitert bei 20–30 % Zielgröße und vollem Preis in rund 10 % der Fälle", () => {
    const klein = playAddons(0.20, 0, 25);
    const gross = playAddons(0.30, 0, 25);
    const n = klein.ok + klein.failed + gross.ok + gross.failed;
    const rate = (klein.failed + gross.failed) / n;
    expect(n, "zu wenige Zukäufe für eine Aussage").toBeGreaterThan(80);
    expect(rate, `Scheiterungsquote ${(rate * 100).toFixed(1)} % im Band 20–30 %`)
      .toBeGreaterThan(0.04);
    expect(rate, `Scheiterungsquote ${(rate * 100).toFixed(1)} % im Band 20–30 %`)
      .toBeLessThan(0.17);
  });

  it("straft den großen Bissen und das niedrige Gebot messbar ab", () => {
    const ref = playAddons(ADDON_REF_SHARE, 0, 20);
    const gross = playAddons(ADDON_MAX_SHARE, 0, 20);
    const billig = playAddons(ADDON_REF_SHARE, 2, 20);
    expect(gross.rate, "großer Bissen").toBeGreaterThan(ref.rate + 0.10);
    expect(billig.rate, "zwei Turns unter der Preisvorstellung").toBeGreaterThan(ref.rate + 0.20);
  });

  it("kappt ein überzogenes Mandat serverseitig statt es zu übernehmen", () => {
    const rng = createRng(4242);
    let state = baseState();
    const boot = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals: boot.deals, landmark: boot.landmark };
    // Erst eine Beteiligung kaufen
    for (let hy = 1; hy <= 3 && !(state.funds[0].holdings as Any[]).length; hy++) {
      const deal = (state.deals as Any[])[0];
      state = runQuarter({
        state, halfYear: hy, rng,
        decisionsBySlot: { 0: { bids: [{ dealId: deal.id, multiple: deal.askMult * 1.1, leverage: 2 }] } },
      } as Any).state;
    }
    const c = (state.funds[0].holdings as Any[])[0];
    expect(c, "Testaufbau: eine Beteiligung wird gebraucht").toBeTruthy();
    const cap = addonMaxEb(c);
    // Ein Mandat über das Zwanzigfache der Obergrenze
    const out = runQuarter({
      state, halfYear: 4, rng,
      decisionsBySlot: { 0: { initiatives: [{ holdingUid: c.uid, dim: "acc", id: "ma", addEb: cap * 20 } as Any] } },
    } as Any).state;
    const after = (out.funds[0].holdings as Any[]).find((h) => h.uid === c.uid);
    if (after?.initA) {
      expect(after.initA.addEb, "Zielgröße gekappt").toBeLessThanOrEqual(cap + 1e-9);
      expect(after.initA.addEb / ebitdaOf(c)).toBeLessThanOrEqual(ADDON_MAX_SHARE + 1e-9);
    }
  });
});
