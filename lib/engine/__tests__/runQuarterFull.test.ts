import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { SECTORS, SECNAMES, ARCHES, CAPITAL, PERIODS, newDeal } from "../engine";
import { runQuarter } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

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
    funds: [initialFund(0, false, null), ...archKeys.map((k, i) => initialFund(i + 1, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
}

function bootstrapDeals(rng: ReturnType<typeof createRng>, market: Record<string, number>) {
  const out: unknown[] = [];
  for (let i = 0; i < 4; i++) out.push(newDeal(rng, "process", market));
  out.push(newDeal(rng, "prop", market, 2));
  return out;
}

/* Vollständige Partie mit einem menschlichen Spieler an Platz 0, der über
   die volle Laufzeit hinweg aktiv bietet, Due Diligence beauftragt,
   Maßnahmen startet, Search-Mandate vergibt, Kandidaten einstellt und
   Beteiligungen aktiv verkauft (Prozess, bilateral, Continuation Vehicle) —
   ausschließlich über runQuarter() und TurnDecisions, ohne UI. Der Test
   selbst prüft keinen festen Sollwert (das ist Aufgabe der Server-Pfad-
   Paritätsprüfung), sondern dass eine reich benutzte Partie über alle 20
   Halbjahre hinweg in einem konsistenten Zustand bleibt. */
describe("runQuarter über eine vollständige Partie", () => {
  it("bleibt über 20 Halbjahre mit vielfältigen Entscheidungen konsistent", () => {
    const rng = createRng(2026);
    let state = initialState();
    state.deals = bootstrapDeals(rng, state.market);

    for (let hy = 1; hy <= PERIODS; hy++) {
      const decisions: TurnDecisions = {};
      const me = state.funds[0];
      const holdings = me.holdings as any[];

      // Bieten auf den ersten verfügbaren Deal, solange Platz im Portfolio ist
      if (holdings.length < 6 && state.deals.length) {
        const d = state.deals[0] as any;
        decisions.bids = [{ dealId: d.id, multiple: d.askMult * 0.98, leverage: Math.min(d.levCap, 3.2) }];
        decisions.dueDiligence = [d.id];
      }

      // Auf jeder Beteiligung ohne laufende Plattform-Maßnahme eine starten
      const withoutInitP = holdings.find((h) => !h.initP);
      if (withoutInitP) decisions.initiatives = [{ holdingUid: withoutInitP.uid, dim: "plat", id: "opex" }];

      // Such-Mandat für eine unbesetzte Position vergeben
      const withVacancy = holdings.find((h) => h.cfo.skill <= 0 && !(h.searches || []).some((s: any) => s.seat === "cfo"));
      if (withVacancy) decisions.searches = [{ holdingUid: withVacancy.uid, seat: "cfo" }];

      // Offene Shortlists annehmen (immer den A-Player)
      const myShortlist = state.shortlist[String(me.slot)] || [];
      if (myShortlist.length) {
        decisions.hires = myShortlist.map((it) => ({ holdingUid: it.holdingUid, seat: it.seat, choice: "aplayer" as const }));
      }

      // Offene Verkaufsangebote annehmen
      const myQueue = state.exitQueue[String(me.slot)] || [];
      if (myQueue.length) {
        decisions.offerDecisions = myQueue.map((it) => ({ holdingUid: it.holdingUid, choice: "accept" as const, offerIndex: 0 }));
      }

      // Ab Halbjahr 8 eine reife Beteiligung bilateral verkaufen, ab Halbjahr 12 einen Prozess starten
      const mature = holdings.find((h) => h.holdQ >= 6 && !h.proc && !h.lockUntil);
      if (mature) {
        decisions.exitStarts = [{ holdingUid: mature.uid, action: hy % 2 === 0 ? "bilateral" : "process", keepPct: 0.3 }];
      }

      const out = runQuarter({ state, halfYear: hy, decisionsBySlot: { [me.slot]: decisions }, rng });
      state = out.state;

      // Invarianten, die in jedem Halbjahr gelten müssen
      state.funds.forEach((f) => {
        expect(Number.isFinite(f.cash), `fund ${f.slot} cash finite in hy ${hy}`).toBe(true);
        expect(Number.isFinite(f.undrawn), `fund ${f.slot} undrawn finite in hy ${hy}`).toBe(true);
        expect(Number.isFinite(f.drawn), `fund ${f.slot} drawn finite in hy ${hy}`).toBe(true);
        (f.holdings as any[]).forEach((h) => {
          expect(Number.isFinite(h.revenue), `holding revenue finite in hy ${hy}`).toBe(true);
          expect(Number.isFinite(h.netDebt), `holding netDebt finite in hy ${hy}`).toBe(true);
        });
      });
    }

    expect(state.funds).toHaveLength(5);
    // Nach 20 Halbjahren wurde liquidiert: keine offenen Beteiligungen mehr.
    state.funds.forEach((f) => expect((f.holdings as any[]).length).toBe(0));
  });
});
