import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { SECTORS, SECNAMES, ARCHES, CAPITAL, PERIODS } from "../engine";
import { runQuarter, bootstrapInitialDeals, computeFinalRanking } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Beweis, dass die Verlagerung der Rundenauswertung auf den Server nichts am
   Spielergebnis ändert (Erweiterung des Tests aus lib/engine/__tests__/fullGame.test.ts,
   der ursprünglich die Extraktion der Spiellogik in lib/engine bewiesen
   hat — siehe PR "Spiellogik aus PeLeagues.tsx in lib/engine/
   extrahieren"). Diesmal wird derselbe Spielverlauf zweimal durchgespielt:

   - "direkt": runQuarter() wird für alle 20 Halbjahre in einer Schleife im
     Prozess aufgerufen, mit einer einzigen langlebigen Rng-Instanz — das
     entspricht, wie der Übungsmodus die Engine benutzt.
   - "Server-Pfad": jedes Halbjahr wird für sich behandelt wie ein
     eigenständiger Aufruf der Auswertungsfunktion (siehe
     supabase/functions/evaluate-seasons): der Zustand wird zwischen den
     Halbjahren über JSON serialisiert/deserialisiert (wie season_state als
     jsonb), die Entscheidungen jedes Spielers ebenso (wie
     turn_submissions.payload), und die Rng-Instanz wird JEDES Mal frisch aus
     der gespeicherten Position (seed) neu aufgebaut, nie wiederverwendet —
     exakt das Modell "lädt den Zufallsgenerator mit dem Startwert und der
     gespeicherten Position der Partie" aus der Aufgabenstellung.

   Beide Pfade benutzen dieselben Entscheidungen für denselben Fondsplatz.
   Der Test ist nur dann aussagekräftig, wenn beide Pfade exakt denselben
   Endzustand liefern — inklusive der finalen IRR/TVPI/Score-Rangliste. */

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

function baseState(): RuntimeState {
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  const archKeys = ["sourcing", "ops", "fin", "all"];
  return {
    market,
    funds: [initialFund(0, false, null), ...archKeys.map((k, i) => initialFund(i + 1, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
}

const SEASON_SEED = 20260817;
const HUMAN_SLOT = 0;

/* Deterministisches, aber vielfältiges Entscheidungsskript für den
   menschlichen Fondsplatz: bietet, beauftragt Due Diligence, startet
   Maßnahmen, vergibt Search-Mandate, stellt ein, verkauft aktiv (Prozess und
   bilateral) und nimmt Verkaufsangebote an. Ist reine Funktion von
   (state, exitQueue, shortlist) für diesen Slot — dieselbe Funktion liefert
   in beiden Pfaden dieselben Entscheidungen für denselben Zustand. */
function decideForHuman(
  state: RuntimeState, halfYear: number, myExitQueue: RuntimeState["exitQueue"][string],
  myShortlist: RuntimeState["shortlist"][string],
): TurnDecisions {
  const me = state.funds[HUMAN_SLOT];
  const holdings = me.holdings as Any[];
  const decisions: TurnDecisions = {};

  if (holdings.length < 6 && state.deals.length) {
    const d = state.deals[0] as Any;
    decisions.bids = [{ dealId: d.id, multiple: d.askMult * 0.98, leverage: Math.min(d.levCap, 3.2) }];
    decisions.dueDiligence = [d.id];
  }
  const withoutInitP = holdings.find((h) => !h.initP);
  if (withoutInitP) decisions.initiatives = [{ holdingUid: withoutInitP.uid, dim: "plat", id: "opex" }];

  const withVacancy = holdings.find((h) => h.cfo.skill <= 0 && !(h.searches || []).some((s: Any) => s.seat === "cfo"));
  if (withVacancy) decisions.searches = [{ holdingUid: withVacancy.uid, seat: "cfo" }];

  if (myShortlist && myShortlist.length) {
    decisions.hires = myShortlist.map((it) => ({ holdingUid: it.holdingUid, seat: it.seat, choice: "aplayer" as const }));
  }
  if (myExitQueue && myExitQueue.length) {
    decisions.offerDecisions = myExitQueue.map((it) => ({ holdingUid: it.holdingUid, choice: "accept" as const, offerIndex: 0 }));
  }
  const mature = holdings.find((h) => h.holdQ >= 6 && !h.proc && !h.lockUntil);
  if (mature) {
    decisions.exitStarts = [{ holdingUid: mature.uid, action: halfYear % 2 === 0 ? "bilateral" : "process", keepPct: 0.3 }];
  }
  return decisions;
}

function jsonRoundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function playDirect() {
  const rng = createRng(SEASON_SEED);
  let state = baseState();
  const { deals, landmark } = bootstrapInitialDeals(rng, state.market);
  state = { ...state, deals, landmark };

  for (let hy = 1; hy <= PERIODS; hy++) {
    const decisions = decideForHuman(
      state, hy, state.exitQueue[String(HUMAN_SLOT)], state.shortlist[String(HUMAN_SLOT)],
    );
    const out = runQuarter({ state, halfYear: hy, decisionsBySlot: { [HUMAN_SLOT]: decisions }, rng });
    state = out.state;
  }
  return { state, finalRngPosition: rng.seed, ranking: computeFinalRanking(state, PERIODS) };
}

function playServerPath() {
  // "Datenbank": alles, was zwischen zwei Aufrufen der Auswertungsfunktion
  // persistiert werden müsste, liegt hier ausschließlich als serialisierter
  // String vor -- exakt der Zustand, den season_state/seasons.seed über
  // zwei getrennte Edge-Function-Aufrufe hinweg tatsächlich hätten.
  let serializedState = JSON.stringify(baseState());
  let seed = SEASON_SEED;

  // --- Bootstrap-Aufruf (entspricht commit_season_bootstrap) ---
  {
    const rng = createRng(seed);
    const state: RuntimeState = JSON.parse(serializedState);
    const { deals, landmark } = bootstrapInitialDeals(rng, state.market);
    const bootstrapped: RuntimeState = { ...state, deals, landmark };
    serializedState = JSON.stringify(bootstrapped);
    seed = rng.seed;
  }

  // --- Ein Aufruf pro Halbjahr (entspricht commit_season_evaluation) ---
  for (let hy = 1; hy <= PERIODS; hy++) {
    const stateForDecisions: RuntimeState = JSON.parse(serializedState);
    const rawDecisions = decideForHuman(
      stateForDecisions, hy,
      stateForDecisions.exitQueue[String(HUMAN_SLOT)], stateForDecisions.shortlist[String(HUMAN_SLOT)],
    );
    // Entspricht dem Weg über turn_submissions.payload (jsonb).
    const submittedPayload = jsonRoundTrip(rawDecisions);

    // Neuer Aufruf, neue Rng-Instanz, ausschließlich aus der gespeicherten
    // Position rekonstruiert -- keine langlebige Instanz über Halbjahre hinweg.
    const rng = createRng(seed);
    const state: RuntimeState = JSON.parse(serializedState);
    const out = runQuarter({ state, halfYear: hy, decisionsBySlot: { [HUMAN_SLOT]: submittedPayload }, rng });

    serializedState = JSON.stringify(out.state);
    seed = rng.seed;
  }

  const state: RuntimeState = JSON.parse(serializedState);
  return { state, finalRngPosition: seed, ranking: computeFinalRanking(state, PERIODS) };
}

describe("Server-Pfad liefert dasselbe Ergebnis wie der direkte Engine-Aufruf", () => {
  it("identischer Endzustand über eine vollständige 20-Halbjahre-Partie", () => {
    const direct = playDirect();
    const server = playServerPath();

    expect(server.finalRngPosition).toEqual(direct.finalRngPosition);
    expect(JSON.parse(JSON.stringify(server.state))).toEqual(JSON.parse(JSON.stringify(direct.state)));
    expect(server.ranking).toEqual(direct.ranking);

    // Nicht nur strukturgleich, sondern auch inhaltlich ein echtes Ergebnis:
    // die Partie muss tatsächlich etwas bewegt haben.
    expect(direct.ranking).toHaveLength(5);
    expect(direct.state.funds.some((f) => (f.realized as unknown[]).length > 0)).toBe(true);
  });
});
