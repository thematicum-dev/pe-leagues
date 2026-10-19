import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  SECTORS, SECNAMES, ARCHES, CAPITAL, PERIODS, DEFAULT_HUMAN_ATTRS, ENTRY_FEE, TICKET_MAX,
  newDeal, newLandmark, announceLandmark, landmarkAsk, cardTicket, ebitdaOf, investableOf,
} from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Ein Fonds muss mindestens vier Transaktionen machen, um ausinvestiert zu
   sein. Vorher band ein einzelnes Ziel zum Angebotspreis bis über 400 Mio. €,
   das Trophy Asset im Median rund 365 Mio. € — zwei Deals, und der Fonds war
   voll. Geprüft wird die Größe dort, wo sie entsteht (newDeal, die
   Ankündigung des Trophy Assets), und dort, wo sie zählt: am Eigenkapital,
   das die Fonds in ganzen Partien tatsächlich einsetzen.                  */

const QUARTER = CAPITAL / 4;
const ticket = (d: Any, mult: number, lev: number) => ebitdaOf(d) * (mult * (1 + ENTRY_FEE) - lev);
// Vom kalten bis zum heißesten Markt, den runQuarter zulässt (0,55× bis 1,5×)
const HEATS = [0.55, 0.8, 1.0, 1.25, 1.5];
const marketAt = (heat: number) => Object.fromEntries(SECNAMES.map((s) => [s, SECTORS[s].m * heat]));

describe("Zielgröße und Fondsvolumen", () => {
  it("kappt das Equity Ticket jedes Ziels, auch bei einem aggressiven Gebot", () => {
    for (const heat of HEATS) {
      const rng = createRng(4242);
      const market = marketAt(heat);
      for (let i = 0; i < 5000; i++) {
        const d = newDeal(rng, i % 3 ? "process" : "prop", market, 1 + (i % 5));
        expect(cardTicket(d)).toBeLessThanOrEqual(TICKET_MAX + 1e-9);
        // So bieten die KI-Fonds im Mittel aufwendig: 15 % über dem Angebot, 85 % des Leverage-Rahmens
        expect(ticket(d, d.askMult * 1.15, d.levCap * 0.85)).toBeLessThan(QUARTER);
      }
    }
  });

  it("lässt kleine Ziele praktisch unverändert", () => {
    const rng = createRng(7), legacy = createRng(7);
    const market = marketAt(1);
    for (let i = 0; i < 2000; i++) {
      const d = newDeal(rng, "process", market);
      const raw = newDeal(legacy, "process", market, 2, { legacyDealSize: true });
      // Die Kappung zieht keine Zufallszahl: Beide Ströme bleiben im Gleichschritt
      expect(d.name).toBe(raw.name);
      if (cardTicket(raw) < 0.4 * TICKET_MAX) expect(d.revenue / raw.revenue).toBeGreaterThan(0.97);
      expect(d.revenue).toBeLessThanOrEqual(raw.revenue);
    }
  });

  it("kappt das Trophy Asset bei der Ankündigung auf den Preis, zu dem es kommt", () => {
    for (const heat of HEATS) {
      const rng = createRng(99);
      for (let i = 0; i < 500; i++) {
        const lm = announceLandmark(newLandmark(rng, marketAt(1)), marketAt(heat));
        const d = { ...lm, askMult: landmarkAsk(lm, marketAt(heat)) };
        expect(cardTicket(d)).toBeLessThanOrEqual(TICKET_MAX + 1e-9);
        expect(ticket(d, d.askMult * 1.15, d.levCap * 0.85)).toBeLessThan(QUARTER);
      }
    }
  });

  it("drei Deals reichen in ganzen Partien nie, um den Fonds auszuinvestieren", () => {
    let worst = 0, bought = 0;
    for (const seed of [1, 7, 4242, 20260817, 99991, 314159]) {
      const rng = createRng(seed);
      let state = baseState();
      const boot = bootstrapInitialDeals(rng, state.market, state.funds);
      state = { ...state, deals: boot.deals, landmark: boot.landmark };
      // Drei Tickets an der Obergrenze bleiben unter dem, was ein frischer Fonds investieren kann
      expect(3 * QUARTER).toBeLessThan(investableOf(state.funds[0], 1));
      const seen = new Set<string>();
      for (let hy = 1; hy <= PERIODS; hy++) {
        const me = state.funds[0] as Any;
        const d: TurnDecisions = {};
        // Der Mensch bietet auf alles, auch das Trophy Asset, und aggressiv: 20 % über dem Angebot
        if (me.holdings.length < 6) {
          d.bids = (state.deals as Any[]).map((x) => ({ dealId: x.id, multiple: x.askMult * 1.2, leverage: x.levCap * 0.8 }));
        }
        state = runQuarter({ state, halfYear: hy, decisionsBySlot: { 0: d }, rng } as Any).state;
        for (const f of state.funds as Any[]) {
          for (const c of f.holdings) {
            const key = f.slot + "/" + c.uid;
            if (seen.has(key)) continue;
            seen.add(key);
            // Eigenkapital beim Closing, wie es entryEquity am Tag des Kaufs trägt
            const h = c.hist[0];
            worst = Math.max(worst, h.eq + h.eb * h.mult * ENTRY_FEE);
            bought++;
          }
        }
      }
    }
    expect(bought).toBeGreaterThan(60);
    expect(worst).toBeLessThan(QUARTER);
  });
});

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
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  return {
    market,
    funds: [initialFund(0, false, null), ...["sourcing", "ops", "fin", "all"].map((k, i) => initialFund(i + 1, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
}
