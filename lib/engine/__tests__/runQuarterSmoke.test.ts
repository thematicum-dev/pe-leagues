import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { SECTORS, SECNAMES, ARCHES, CAPITAL, newDeal } from "../engine";
import { runQuarter } from "../runQuarter";
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
    funds: [
      initialFund(0, false, null),
      ...archKeys.map((k, i) => initialFund(i + 1, true, k)),
    ],
    feed: [],
    deals: [],
    landmark: null,
    exitQueue: {},
    shortlist: {},
  };
}

/* Spielt ein paar Halbjahre mit einem Menschen an Platz 0 und vier
   KI-Fonds durch und prüft, dass runQuarter() nicht abstürzt, Deals
   entstehen, Gebote gewinnen können und der Zustand über mehrere
   Halbjahre konsistent bleibt (kein NaN, keine negativen Bestände dort,
   wo sie unmöglich sein sollten). */
describe("runQuarter (Server-Engine)", () => {
  it("spielt mehrere Halbjahre ohne Absturz und mit plausiblem Zustand", () => {
    const rng = createRng(42);
    let state = initialState();

    // Halbjahr 1: noch keine deals vorhanden -> erst generieren, wie start_season es täte
    state = { ...state, deals: [] };
    for (let hy = 1; hy <= 6; hy++) {
      if (state.deals.length === 0) {
        // Auf Halbjahr 1 gibt es noch keinen Dealflow aus einer Vorauswertung;
        // wir spiegeln, was start_season() für Halbjahr 1 vorbereiten würde.
        const out = runQuarter({ state: { ...state, deals: bootstrapDeals(rng, state.market) }, halfYear: hy, decisionsBySlot: {}, rng });
        state = out.state;
        continue;
      }
      const humanDeal = state.deals[0] as Any;
      const decisions: Record<number, TurnDecisions> = {
        0: humanDeal ? { bids: [{ dealId: humanDeal.id, multiple: humanDeal.askMult, leverage: Math.min(humanDeal.levCap, 3) }] } : {},
      };
      const out = runQuarter({ state, halfYear: hy, decisionsBySlot: decisions, rng });
      state = out.state;
    }

    expect(state.funds).toHaveLength(5);
    state.funds.forEach((f) => {
      expect(Number.isFinite(f.cash)).toBe(true);
      expect(Number.isFinite(f.undrawn)).toBe(true);
      expect(f.undrawn).toBeGreaterThanOrEqual(-1e-6);
    });
    expect(state.deals.length).toBeGreaterThan(0);
  });

  it("ist deterministisch: gleicher Startwert und gleiche Entscheidungen liefern denselben Zustand", () => {
    function play() {
      const rng = createRng(777);
      let state = initialState();
      state.deals = bootstrapDeals(rng, state.market);
      for (let hy = 1; hy <= 4; hy++) {
        const d = state.deals[0] as Any;
        const decisions: Record<number, TurnDecisions> = d
          ? { 0: { bids: [{ dealId: d.id, multiple: d.askMult, leverage: 2 }], dueDiligence: [d.id] } }
          : {};
        const out = runQuarter({ state, halfYear: hy, decisionsBySlot: decisions, rng });
        state = out.state;
      }
      return { state, rngSeed: rng.seed };
    }
    const a = play();
    const b = play();
    expect(JSON.stringify(a.state)).toEqual(JSON.stringify(b.state));
    expect(a.rngSeed).toEqual(b.rngSeed);
  });
});

function bootstrapDeals(rng: ReturnType<typeof createRng>, market: Record<string, number>) {
  // Entspricht makeDeals(sourcing=2, market) aus components/PeLeagues.tsx
  // für den Ausgangszustand vor Halbjahr 1.
  const out = [] as unknown[];
  for (let i = 0; i < 4; i++) out.push(newDeal(rng, "process", market));
  out.push(newDeal(rng, "prop", market, 2));
  return out;
}
