import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  ARCHES, CAPITAL, EVENT_P, LEGACY_COMPAT, SECNAMES, SECTORS, eventPOf, newDeal,
} from "../engine";
import { runQuarter } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function fund(slot: number, isAi: boolean, arch: string | null): RuntimeFund {
  const a = arch ? ARCHES.find((x) => x.key === arch)! : null;
  return {
    slot, profileId: isAi ? null : "p" + slot, isAi, archetype: arch,
    name: isAi ? a!.name : "Fonds " + slot,
    attrs: isAi ? a!.attrs : { sourcing: 3, analysis: 3, negotiation: 2, operations: 2, financing: 2 },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  };
}

/* Spielt ein paar Halbjahre und zählt, wie oft ein Sonderereignis eine
   Beteiligung des eigenen Fonds getroffen hat — gemessen an den Meldungen,
   die die Auswertung dafür schreibt.                                       */
function countEvents(seed: number, compat: Any, halfYears = 12) {
  const rng = createRng(seed);
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  let state: RuntimeState = {
    market,
    funds: [fund(0, false, null), ...["sourcing", "ops", "fin", "all"].map((k, i) => fund(i + 1, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
  const boot: unknown[] = [];
  for (let i = 0; i < 4; i++) boot.push(newDeal(rng, "process", market));
  state = { ...state, deals: boot };

  let events = 0, holdingHalves = 0;
  for (let hy = 1; hy <= halfYears; hy++) {
    const holdings = state.funds[0].holdings as Any[];
    const decisions: TurnDecisions = {};
    if (holdings.length < 5 && state.deals.length) {
      const d = state.deals[0] as Any;
      decisions.bids = [{ dealId: d.id, multiple: d.askMult * 1.05, leverage: Math.min(d.levCap, 2.8) }];
    }
    const before = state.feed.length;
    const out = runQuarter({ state, halfYear: hy, decisionsBySlot: { 0: decisions }, rng, compat });
    events += out.state.feed.slice(before)
      .filter((f: Any) => f.slot === 0 && ["🔻", "🔺", "🚪"].includes(f.emoji)).length;
    holdingHalves += holdings.length;
    state = out.state;
  }
  return { events, holdingHalves };
}

describe("Zufallsereignisse während der Halteperiode", () => {
  it("benutzt die Konstante, nicht eine eingebaute Zahl", () => {
    expect(eventPOf()).toBe(EVENT_P);
    // Der Altstand bleibt erreichbar, damit sich ältere Halbjahre weiterhin
    // exakt nachrechnen lassen (siehe lib/engine/replay.ts).
    expect(eventPOf(LEGACY_COMPAT)).toBe(0.15);
    expect(EVENT_P).toBeLessThan(0.15);
  });

  it("trifft eine Beteiligung seltener als nach dem alten Stand", () => {
    let neu = { events: 0, holdingHalves: 0 };
    let alt = { events: 0, holdingHalves: 0 };
    for (let seed = 0; seed < 12; seed++) {
      const a = countEvents(4000 + seed, {});
      const b = countEvents(4000 + seed, LEGACY_COMPAT);
      neu = { events: neu.events + a.events, holdingHalves: neu.holdingHalves + a.holdingHalves };
      alt = { events: alt.events + b.events, holdingHalves: alt.holdingHalves + b.holdingHalves };
    }
    const rateNeu = neu.events / neu.holdingHalves;
    const rateAlt = alt.events / alt.holdingHalves;
    // Stichprobe groß genug, damit die Quote überhaupt aussagekräftig ist
    expect(neu.holdingHalves).toBeGreaterThan(250);
    expect(rateNeu).toBeLessThan(rateAlt);
    /* Die gemessene Quote muss in der Nähe der Konstante liegen — sonst ist
       irgendwo wieder eine eigene Zahl eingezogen. Das Band ist weit genug
       für die Streuung einer Stichprobe dieser Größe.                      */
    expect(rateNeu).toBeGreaterThan(EVENT_P * 0.6);
    expect(rateNeu).toBeLessThan(EVENT_P * 1.6);
  }, 60000);
});
