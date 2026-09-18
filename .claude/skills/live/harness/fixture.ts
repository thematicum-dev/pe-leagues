/* Wegwerf-Harness (siehe .claude/skills/live/SKILL.md). Liegt nur während
   eines Live-Durchlaufs unter app/live-test/ und wird von teardown.sh wieder
   entfernt — er gehört nicht in einen Commit.

   Baut einen echten Spielstand, indem runQuarter() wirklich gespielt wird:
   zwei Menschen auf Platz 0 und 1, drei KI-Fonds daneben, Gebote auf denselben
   Deal (damit die Überboten-Meldung entsteht), Maßnahmen und Exits. */
import { createRng } from "@/lib/engine";
import { ARCHES, CAPITAL, DEFAULT_HUMAN_ATTRS, MAX_SLOTS, SECNAMES, SECTORS } from "@/lib/engine";
import { runQuarter, bootstrapInitialDeals } from "@/lib/engine/runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "@/lib/engine/turnTypes";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const NAMES = ["Thematicum Capital", "Nordkap Partners"];

function fund(slot: number, isAi: boolean, archetype: string | null): RuntimeFund {
  const a = archetype ? ARCHES.find((z) => z.key === archetype)! : null;
  return {
    slot, profileId: isAi ? null : "p" + slot, isAi, archetype,
    name: isAi ? (a as Any).name : NAMES[slot],
    attrs: isAi ? (a as Any).attrs : { ...DEFAULT_HUMAN_ATTRS },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  } as Any;
}

/* `breach`: eine Partie, in der Platz 0 in Halbjahr 13 eine Beteiligung an die
   Kreditgeber verliert. Voll gehebelt gekauft und nur mit Kostenprogrammen
   gefahren — die Startwerte sind gesucht, nicht gestellt: Der Ablauf ist eine
   ganz normale Auswertung. Gebraucht für alles, was ein Totalverlust in den
   Ansichten auslöst (Value Bridge, Meldungen, Wertung).                     */
export function buildFixture(untilHalfYear: number, hold = false, breach = false, seed?: number) {
  const rng = createRng(seed || (breach ? 555 : 4242));
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  let state: RuntimeState = {
    market,
    funds: [fund(0, false, null), fund(1, false, null),
      ...["sourcing", "ops", "fin"].map((k, i) => fund(i + 2, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
  const boot = bootstrapInitialDeals(rng, state.market, state.funds);
  state = { ...state, deals: boot.deals, landmark: boot.landmark };

  const history: { halfYear: number; market: RuntimeState["market"]; funds: RuntimeFund[] }[] = [];
  for (let hy = 1; hy < untilHalfYear; hy++) {
    const dec: Record<number, TurnDecisions> = {};
    [0, 1].forEach((slot) => {
      const me = (state.funds as Any[]).find((f) => f.slot === slot)!;
      const d: TurnDecisions = {};
      /* Im Breach-Modus bietet nur Platz 0, und zwar auf genau ein Unternehmen:
         Sonst überbietet ihn Platz 1 (dessen 6 % Aufschlag gibt es nur, damit
         in der Standardpartie eine Überboten-Meldung entsteht) und das
         Portfolio bliebe leer. */
      const willKaufen = breach
        ? slot === 0 && !(me.holdings as Any[]).length && !(me.realized as Any[]).length
        : (me.holdings as Any[]).length < MAX_SLOTS;
      if (willKaufen && state.deals.length) {
        // Beide auf denselben Deal — nur so entsteht eine Überboten-Meldung
        const x = (state.deals as Any[])[0];
        d.bids = [{ dealId: x.id, multiple: x.askMult * (breach ? 1.1 : slot === 1 ? 1.06 : 1.0),
          leverage: x.levCap * (breach ? 1 : 0.8) }];
        if (slot === 0) d.dueDiligence = [x.id];
      }
      /* Im Breach-Modus genau der gemeldete Ablauf: ein Unternehmen, danach
         nur Zukäufe, bis der Covenant reißt und das Portfolio leer ist. */
      if (breach) {
        const h0 = (me.holdings as Any[])[0];
        if (h0 && !h0.initA) d.initiatives = [{ holdingUid: h0.uid, dim: "acc", id: "ma" }];
      } else {
        const frei = (me.holdings as Any[]).find((h) => !h.initP);
        if (frei) d.initiatives = [{ holdingUid: frei.uid, dim: "plat", id: "opex" }];
      }
      const reif = (me.holdings as Any[]).filter((h) => h.holdQ >= 6 && !h.proc && !h.lockUntil);
      if (reif.length && !hold && !breach) d.exitStarts = [{ holdingUid: reif[0].uid, action: hy % 2 ? "bilateral" : "ipo" } as Any];
      if (state.exitQueue[String(slot)]?.length) {
        d.offerDecisions = state.exitQueue[String(slot)].map((it) => ({
          holdingUid: it.holdingUid, choice: "accept" as const, offerIndex: 0,
        }));
      }
      dec[slot] = d;
    });
    state = runQuarter({ state, halfYear: hy, decisionsBySlot: dec, rng } as Any).state;
    history.push({ halfYear: hy, market: state.market, funds: state.funds });
  }
  return { state, history: history.slice(-6) };
}
