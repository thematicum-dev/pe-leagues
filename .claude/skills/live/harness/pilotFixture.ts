/* Wegwerf-Harness (siehe .claude/skills/live/SKILL.md), Route /live-test/pilot.

   Spielstand wie in einer echten Mehrspielerpartie: Fondsplätze 1 bis 5 wie
   bei start_season(), drei Menschen mit den Spielweisen des Testprotokolls
   (lib/engine/__tests__/pilotStrategies.ts), zwei KI-Fonds. Gerechnet wird
   mit runQuarter(), wie auf dem Server. */
import { ARCHES, CAPITAL, DEFAULT_HUMAN_ATTRS, SECNAMES, SECTORS, createRng } from "@/lib/engine";
import { runQuarter, bootstrapInitialDeals } from "@/lib/engine/runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "@/lib/engine/turnTypes";
import { decide, type Strategy } from "@/lib/engine/__tests__/pilotStrategies";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const NAMES: Record<number, string> = { 1: "Thematicum Capital", 2: "Nordkap Partners", 3: "Isar Equity" };
export const PILOT_SLOTS: Record<number, Strategy | "ki"> = { 1: "aggr", 2: "over", 3: "kons", 4: "ki", 5: "ki" };

function fund(slot: number): RuntimeFund {
  const k = PILOT_SLOTS[slot];
  const a = k === "ki" ? (ARCHES.find((z) => z.key === (slot === 4 ? "ops" : "fin")) as Any) : null;
  return {
    slot, profileId: a ? null : "p" + slot, isAi: !!a, archetype: a ? a.key : null,
    name: a ? a.name : NAMES[slot], attrs: a ? { ...a.attrs } : { ...DEFAULT_HUMAN_ATTRS },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  } as Any;
}

/* Stand zu Beginn von Halbjahr `untilHalfYear` (ausgewertet sind die davor).
   `idle` lässt einen Platz ab einem Halbjahr nichts mehr abgeben — so bleiben
   für ihn Gebote und Shortlists offen, wie bei einem Spieler, der gerade erst
   wieder hereinschaut. */
export function buildPilotFixture(untilHalfYear: number, seed = 20261029, idle: { slot: number; from: number } | null = null) {
  const rng = createRng(seed);
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  let state: RuntimeState = { market, funds: [1, 2, 3, 4, 5].map(fund), feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {} };
  const boot = bootstrapInitialDeals(rng, state.market, state.funds);
  state = { ...state, deals: boot.deals, landmark: boot.landmark };
  const history: { halfYear: number; market: RuntimeState["market"]; funds: RuntimeFund[] }[] = [];
  const srng: Record<number, ReturnType<typeof createRng>> = { 1: createRng(11), 2: createRng(12), 3: createRng(13) };
  for (let hy = 1; hy < untilHalfYear; hy++) {
    const dec: Record<number, TurnDecisions> = {};
    [1, 2, 3].forEach((slot) => {
      if (idle && idle.slot === slot && hy >= idle.from) return;
      const d = decide(PILOT_SLOTS[slot] as Strategy, state, slot, hy, srng[slot]);
      if (d) dec[slot] = JSON.parse(JSON.stringify(d));
    });
    state = runQuarter({ state, halfYear: hy, decisionsBySlot: dec, rng }).state;
    history.push({ halfYear: hy, market: state.market, funds: state.funds });
  }
  return { state, history: history.slice(-6) };
}
