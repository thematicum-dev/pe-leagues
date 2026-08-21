import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { SECTORS, SECNAMES, ARCHES, CAPITAL, INIT_SLOTS } from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function initialFund(slot: number, isAi: boolean, archetype: string | null): RuntimeFund {
  const arch = archetype ? ARCHES.find((a) => a.key === archetype)! : null;
  return {
    slot, profileId: isAi ? null : "player-" + slot, isAi, archetype,
    name: isAi ? arch!.name : "Fonds " + slot,
    // operations: 0 -> maxInitSlots = INIT_SLOTS, ohne Value-Creation-Bonus.
    attrs: isAi ? arch!.attrs : { sourcing: 2, analysis: 3, negotiation: 2, operations: 0, financing: 2 },
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

/* Belegt: die Operating Capacity (höchstens INIT_SLOTS + Bonus gleichzeitig
   laufende Maßnahmen fürs ganze Portfolio) ist nicht mehr nur eine
   deaktivierte Schaltfläche im Client, sondern wird von runQuarter() selbst
   durchgesetzt. Vorher konnte eine eingereichte Entscheidung beliebig viele
   Maßnahmen gleichzeitig anstoßen, unabhängig vom gewählten Fondsprofil. */
describe("Operating Capacity wird serverseitig durchgesetzt", () => {
  it("startet höchstens INIT_SLOTS gleichzeitige Maßnahmen, auch wenn mehr eingereicht werden", () => {
    const rng = createRng(4242);
    let state = initialState();
    const { deals, landmark } = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals, landmark };

    // Über mehrere Halbjahre hinweg mit maximalem Leverage knapp über dem
    // Ask bieten, bis der menschliche Fonds fünf Beteiligungen hält -- mehr,
    // als die Operating Capacity an gleichzeitigen Maßnahmen erlaubt. Muss
    // deutlich vor Halbjahr PERIODS (20) abgeschlossen sein, sonst greift
    // die automatische Schlussliquidation und wirft alle Holdings hinaus.
    let hy = 0;
    while ((state.funds[0].holdings as Any[]).length < 5 && hy < 15) {
      hy++;
      const d = state.deals[0] as Any;
      const decisions: Record<number, TurnDecisions> = d
        ? { 0: { bids: [{ dealId: d.id, multiple: d.askMult * 1.02, leverage: d.levCap }] } }
        : {};
      const out = runQuarter({ state, halfYear: hy, decisionsBySlot: decisions, rng });
      state = out.state;
    }
    expect((state.funds[0].holdings as Any[]).length).toBeGreaterThanOrEqual(5);

    const targets = (state.funds[0].holdings as Any[]).slice(0, 5);
    const initiatives = targets.map((h) => ({ holdingUid: h.uid, dim: "plat" as const, id: "opex" }));

    hy++;
    const out = runQuarter({ state, halfYear: hy, decisionsBySlot: { 0: { initiatives } }, rng });
    const after = out.state.funds[0].holdings as Any[];
    const started = targets.filter((t) => after.find((h) => h.uid === t.uid)?.initP);

    // operations = 0 -> maxInitSlots = INIT_SLOTS: von 5 eingereichten
    // Maßnahmen darf höchstens diese Zahl tatsächlich anlaufen.
    expect(started.length).toBe(INIT_SLOTS);
  });
});
