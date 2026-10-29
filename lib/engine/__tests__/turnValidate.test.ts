/* Testprotokoll Mehrspieler (Pilot, 29.10.2026), Teil Robustheit: Eine
   Abgabe ist beliebiges JSON aus dem Browser. Keine Abgabe darf die
   Auswertung zum Werfen bringen — sie liefe sonst jede Minute erneut gegen
   dieselbe Abgabe und die Partie stünde für alle still. */
import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { CAPITAL, DEFAULT_HUMAN_ATTRS, PERIODS, SECNAMES, SECTORS } from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import { sanitizeDecisions } from "../turnValidate";
import type { RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const fund = (slot: number) => ({
  slot, profileId: "p" + slot, isAi: false, archetype: null, name: "Fonds " + slot, attrs: { ...DEFAULT_HUMAN_ATTRS },
  cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [], undrawn: CAPITAL, drawn: 0,
  recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
}) as Any;

function start(seed: number) {
  const rng = createRng(seed);
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  let state: RuntimeState = { market, funds: [0, 1, 2, 3, 4].map(fund), feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {} };
  const b = bootstrapInitialDeals(rng, market, state.funds);
  state = { ...state, deals: b.deals, landmark: b.landmark };
  return { rng, state };
}

const FIELDS = ["bids", "dueDiligence", "studies", "initiatives", "equityInjections", "ltip", "searches", "hires", "exitStarts", "offerDecisions"];

// Zufälliges JSON, gern mit echten Kennungen aus dem Spielstand darin
function junk(r: ReturnType<typeof createRng>, refs: string[], depth = 0): Any {
  const k = Math.floor(r.rnd() * 9);
  if (depth > 2 || k === 0) return [null, true, false, 0, -1, 1e308, 3.5, "", "x", "c0", "ceo", "acc", "ma", "ipo", "accept"][Math.floor(r.rnd() * 15)];
  if (k <= 2) return refs.length ? refs[Math.floor(r.rnd() * refs.length)] : "x";
  if (k <= 5) return Array.from({ length: Math.floor(r.rnd() * 3) }, () => junk(r, refs, depth + 1));
  const o: Any = {};
  ["dealId", "holdingUid", "multiple", "leverage", "dim", "id", "seat", "choice", "action", "amount", "offerIndex", "keepPct", "equity"]
    .forEach((key) => { if (r.rnd() < 0.5) o[key] = junk(r, refs, depth + 1); });
  return o;
}

describe("Abgaben in beliebiger Form", () => {
  it("bringen die Auswertung nie zum Werfen und nie zu NaN", () => {
    const fails: string[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      const s0 = start(seed);
      const rng = s0.rng;
      let state = s0.state;
      const jr = createRng(seed * 101);
      for (let hy = 1; hy <= PERIODS; hy++) {
        const refs = [...(state.deals as Any[]).map((d) => d.id), ...state.funds.flatMap((f) => (f.holdings as Any[]).map((h) => h.uid))];
        const dec: Record<number, Any> = {};
        // Platz 0 spielt normal, damit es Beteiligungen gibt; die anderen schicken Unsinn
        dec[0] = { bids: (state.deals as Any[]).slice(0, 2).map((d) => ({ dealId: d.id, multiple: d.askMult * 1.1, leverage: d.levCap * 0.8 })) };
        [1, 2, 3, 4].forEach((slot) => {
          const p: Any = {};
          FIELDS.forEach((f) => { if (jr.rnd() < 0.6) p[f] = junk(jr, refs); });
          dec[slot] = jr.rnd() < 0.1 ? junk(jr, refs) : JSON.parse(JSON.stringify(p));
        });
        try {
          state = runQuarter({ state, halfYear: hy, rng, decisionsBySlot: dec }).state;
        } catch (e) {
          fails.push(`Seed ${seed} HJ ${hy}: ${(e as Error).message}`);
          break;
        }
        if (JSON.stringify(state).includes("NaN") || /NaN|Infinity/.test(JSON.stringify(state, (_k, v) => (typeof v === "number" && !Number.isFinite(v) ? "NaN" : v))))
          fails.push(`Seed ${seed} HJ ${hy}: nicht endliche Zahl im Zustand`);
      }
    }
    expect(fails).toEqual([]);
  });

  it("lassen eine Abgabe in der richtigen Form unverändert", () => {
    const d: TurnDecisions = {
      bids: [{ dealId: "d1", multiple: 9.5, leverage: 4 }],
      dueDiligence: ["d1"], studies: ["c1"], ltip: ["c1"],
      initiatives: [{ holdingUid: "c1", dim: "acc", id: "ma", addEb: 3, maxMult: 8, equity: 5 }, { holdingUid: "c1", dim: "plat", id: "opex" }],
      equityInjections: [{ holdingUid: "c1", amount: 12.5 }],
      searches: [{ holdingUid: "c1", seat: "cfo" }],
      hires: [{ holdingUid: "c1", seat: "r3", choice: "c3" }],
      exitStarts: [{ holdingUid: "c1", action: "bilateral", keepPct: 0.3 }, { holdingUid: "c2", action: "process" }],
      offerDecisions: [{ holdingUid: "c1", choice: "reneg", offerIndex: 1, keepPct: 0.5 }, { holdingUid: "c2", choice: "accept" }],
    };
    expect(sanitizeDecisions(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(sanitizeDecisions({})).toEqual({});
  });

  it("verwirft eine Gebotswahl, die keine Position ist, statt ein anderes Gebot anzunehmen", () => {
    const out = sanitizeDecisions({ offerDecisions: [{ holdingUid: "c1", choice: "accept", offerIndex: "1" }, { holdingUid: "c2", choice: "accept", offerIndex: 1.5 }] });
    expect(out.offerDecisions).toBeUndefined();
  });

  it("meldet ein Gebot mit unsinnigen Zahlen dem Bieter, statt es zu verschlucken", () => {
    const { rng, state } = start(3);
    const d = (state.deals as Any[])[0];
    const out = runQuarter({ state, halfYear: 1, rng, decisionsBySlot: { 2: { bids: [{ dealId: d.id, multiple: "viel", leverage: null }] } as Any } });
    expect((out.feed as Any[]).some((n) => n.slot === 2 && n.text.includes(d.name) && /außerhalb des Zulässigen/.test(n.text))).toBe(true);
  });
});
