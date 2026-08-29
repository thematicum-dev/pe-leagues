import { describe, expect, it } from "vitest";
import { createRng, LCG_M } from "../rng";
import { SECTORS, SECNAMES, ARCHES, CAPITAL, newDeal } from "../engine";
import { runQuarter } from "../runQuarter";
import { backfillSeason, findStartSeed, needsBackfill, rngStepBack, statesMatch } from "../replay";
import { holdingStatements } from "../financials";
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
    funds: [initialFund(0, false, null), ...archKeys.map((k, i) => initialFund(i + 1, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
}

/* Spielt eine Partie so, wie der Server sie ausgewertet hätte, und gibt genau
   das zurück, was hinterher in der Datenbank stünde: den Spielstand nach jedem
   Halbjahr, die Abgaben je Halbjahr und die Position im Zufallsstrom danach.
   Zwei menschliche Fondsplätze, damit auch die Abgaben mehrerer Spieler
   gegeneinander aufgelöst werden.                                            */
function playSeason(seed: number, halfYears: number) {
  const rng = createRng(seed);
  let state = initialState();
  // Bootstrap wie in evaluate-seasons: Dealflow vor Halbjahr 1
  const boot: unknown[] = [];
  for (let i = 0; i < 4; i++) boot.push(newDeal(rng, "process", state.market));
  boot.push(newDeal(rng, "prop", state.market, 2));
  state = { ...state, deals: boot };
  // Platz 1 ist im Testaufbau ebenfalls ein Mensch
  state.funds[1] = { ...initialFund(1, false, null), name: "Fonds 1" };

  const states: { halfYear: number; state: RuntimeState }[] = [{ halfYear: 0, state }];
  const decisionsByHalfYear: Record<number, Record<number, TurnDecisions>> = {};
  const ids = ["opex", "nwc", "erp"];

  for (let hy = 1; hy <= halfYears; hy++) {
    const bySlot: Record<number, TurnDecisions> = {};
    [0, 1].forEach((slot) => {
      const me = state.funds[slot];
      const holdings = me.holdings as Any[];
      const d: TurnDecisions = {};
      if (holdings.length < 3 && state.deals.length) {
        const deal = state.deals[(slot % state.deals.length)] as Any;
        d.bids = [{ dealId: deal.id, multiple: deal.askMult * (slot === 0 ? 1.01 : 0.97), leverage: Math.min(deal.levCap, 3.3) }];
        d.dueDiligence = [deal.id];
      }
      const freeP = holdings.find((h) => !h.initP);
      if (freeP) d.initiatives = [{ holdingUid: freeP.uid, dim: "plat", id: ids[hy % ids.length] as Any }];
      const freeA = holdings.find((h) => !h.initA);
      if (freeA) d.initiatives = [...(d.initiatives || []), { holdingUid: freeA.uid, dim: "acc", id: "pen" }];
      const vac = holdings.find((h) => h.cfo.skill <= 0 && !(h.searches || []).some((s: Any) => s.seat === "cfo"));
      if (vac) d.searches = [{ holdingUid: vac.uid, seat: "cfo" }];
      const list = state.shortlist[String(slot)] || [];
      if (list.length) d.hires = list.map((it) => ({ holdingUid: it.holdingUid, seat: it.seat, choice: "aplayer" as const }));
      const queue = state.exitQueue[String(slot)] || [];
      if (queue.length) d.offerDecisions = queue.map((it) => ({ holdingUid: it.holdingUid, choice: "accept" as const, offerIndex: 0 }));
      const ripe = holdings.find((h) => h.holdQ >= 6 && !h.proc && !h.lockUntil);
      if (ripe && hy % 3 === 0) d.exitStarts = [{ holdingUid: ripe.uid, action: "process" }];
      bySlot[slot] = d;
    });
    decisionsByHalfYear[hy] = bySlot;
    state = runQuarter({ state, halfYear: hy, decisionsBySlot: bySlot, rng }).state;
    states.push({ halfYear: hy, state });
  }
  return { states, decisionsByHalfYear, endSeed: rng.seed };
}

/* Der Zustand, wie ihn eine vor dieser Änderung begonnene Partie in der
   Datenbank hätte: dieselben Zahlen, aber ohne Periodenmitschrift.          */
function stripRecording(value: Any): Any {
  if (Array.isArray(value)) return value.map(stripRecording);
  if (value && typeof value === "object") {
    const out: Any = {};
    Object.keys(value).forEach((k) => {
      if (k === "fin" || k === "per" || k === "off") return;
      out[k] = stripRecording(value[k]);
    });
    return out;
  }
  return value;
}
// Der Weg durch die Datenbank: jsonb kennt kein undefined und keine Klassen.
const throughJson = (v: Any) => JSON.parse(JSON.stringify(v));

describe("Rückrechnung des Zufallsstroms", () => {
  it("dreht jeden Schritt des Generators exakt zurück", () => {
    const rng = createRng(123456789);
    for (let i = 0; i < 500; i++) {
      const before = rng.seed;
      rng.rnd();
      expect(rngStepBack(rng.seed)).toBe(before);
    }
  });

  it("dreht mehrere Schritte auf einmal zurück", () => {
    const rng = createRng(42);
    const start = rng.seed;
    for (let i = 0; i < 137; i++) rng.rnd();
    expect(rngStepBack(rng.seed, 137)).toBe(start);
  });

  it("zählt die Ziehungen mit", () => {
    const rng = createRng(7);
    rng.rnd(); rng.nrm(); rng.pick([1, 2, 3]); rng.band([0, 1]);
    expect(rng.draws).toBe(1 + 4 + 1 + 1);
  });

  it("bleibt für jeden zulässigen Startwert im Wertebereich", () => {
    [0, 1, LCG_M - 1, 2 ** 31, 999999937].forEach((s) => {
      const back = rngStepBack(s, 3);
      expect(Number.isInteger(back)).toBe(true);
      expect(back).toBeGreaterThanOrEqual(0);
      expect(back).toBeLessThan(LCG_M);
      const fwd = createRng(back);
      fwd.rnd(); fwd.rnd(); fwd.rnd();
      expect(fwd.seed).toBe(s);
    });
  });
});

describe("Nachträgliche Periodenmitschrift einer laufenden Partie", () => {
  const played = playSeason(20260829, 9);
  // Die Partie, wie sie ohne Mitschrift in der Datenbank läge
  const stored = played.states.map((r) => ({ halfYear: r.halfYear, state: throughJson(stripRecording(r.state)) }));

  it("erzeugt einen Ausgangszustand, dem die Mitschrift tatsächlich fehlt", () => {
    expect(needsBackfill(stored[stored.length - 1].state)).toBe(true);
    expect(needsBackfill(played.states[played.states.length - 1].state)).toBe(false);
  });

  it("findet die Startposition eines einzelnen Halbjahres wieder", () => {
    const n = stored.length - 1;
    const found = findStartSeed(
      stored[n - 1].state, n, played.decisionsByHalfYear[n], stored[n].state, played.endSeed,
    );
    expect(found).not.toBeNull();
    // Von dieser Position aus ergibt die Wiederholung exakt den Endstand
    const rng = createRng(found!.seed);
    const out = runQuarter({ state: stored[n - 1].state, halfYear: n, decisionsBySlot: played.decisionsByHalfYear[n], rng });
    expect(rng.seed).toBe(played.endSeed);
    expect(statesMatch(out.state, stored[n].state)).toBe(true);
  });

  it("stellt die volle Partie Halbjahr für Halbjahr wieder her", () => {
    const res = backfillSeason({
      states: stored,
      decisionsByHalfYear: played.decisionsByHalfYear,
      endSeed: played.endSeed,
    });
    expect(res.reason).toBeUndefined();
    expect(res.ok).toBe(true);
    expect(res.states).toHaveLength(stored.length - 1);

    // Jeder wiederhergestellte Spielstand ist der gespeicherte — Feld für Feld
    res.states.forEach((row) => {
      expect(statesMatch(row.state, stored[row.halfYear].state),
        `Halbjahr ${row.halfYear} weicht ab`).toBe(true);
    });

    /* Und er trägt jetzt genau die Mitschrift, die die echte Partie erzeugt
       hat — nicht eine ähnliche, sondern dieselbe Zahlenreihe. */
    const rebuilt = res.states[res.states.length - 1].state;
    const truth = played.states[played.states.length - 1].state;
    expect(JSON.stringify(throughJson(rebuilt))).toBe(JSON.stringify(throughJson(truth)));
    expect(needsBackfill(rebuilt)).toBe(false);
  });

  it("liefert danach Abschlüsse ohne eine einzige geschätzte Spalte", () => {
    const res = backfillSeason({
      states: stored,
      decisionsByHalfYear: played.decisionsByHalfYear,
      endSeed: played.endSeed,
    });
    const rebuilt = res.states[res.states.length - 1].state;
    let checked = 0;
    (rebuilt.funds as Any[]).filter((f) => !f.isAi).forEach((f) => {
      (f.holdings as Any[]).forEach((c) => {
        const st = holdingStatements(c)!;
        expect(st.anyEstimated, `${c.name} trägt geschätzte Perioden`).toBe(false);
        st.periods.forEach((p) => {
          expect(Math.abs(p.assets - (p.netDebt + p.equity))).toBeLessThan(1e-6);
          if (p.opening) return;
          expect(Math.abs((p.netDebtOpen - p.fcf + p.distributions) - p.netDebt)).toBeLessThan(1e-6);
        });
        checked++;
      });
    });
    expect(checked).toBeGreaterThan(0);
  });

  it("verweigert die Wiederherstellung, wenn der Endstand nicht passt", () => {
    const res = backfillSeason({
      states: stored,
      decisionsByHalfYear: played.decisionsByHalfYear,
      endSeed: (played.endSeed + 1) % LCG_M,
      maxDraws: 400,
    });
    expect(res.ok).toBe(false);
    expect(res.states).toHaveLength(0);
    expect(res.reason).toMatch(/not_reproducible/);
  });

  it("verweigert die Wiederherstellung bei falschen Abgaben", () => {
    const tampered = { ...played.decisionsByHalfYear, 3: {} };
    const res = backfillSeason({
      states: stored, decisionsByHalfYear: tampered, endSeed: played.endSeed, maxDraws: 400,
    });
    expect(res.ok).toBe(false);
  });
});

function fund(slot: number, isAi: boolean, arch: string | null): RuntimeFund {
  const a = arch ? ARCHES.find((x) => x.key === arch)! : null;
  return { slot, profileId: isAi ? null : "p" + slot, isAi, archetype: arch,
    name: isAi ? a!.name : "Fonds " + slot,
    attrs: isAi ? a!.attrs : { sourcing: 3, analysis: 3, negotiation: 2, operations: 2, financing: 2 },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [] };
}
const strip = (v: Any): Any => Array.isArray(v) ? v.map(strip)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !["fin","per","off"].includes(k)).map(([k, x]) => [k, strip(x)])) : v;
const tj = (v: Any) => JSON.parse(JSON.stringify(v));

/* Der realistische Fall: fünf menschliche Fondsplätze, volle Portfolios,
   Maßnahmen, Besetzungen und Verkaufsprozesse über fünfzehn Halbjahre. Prüft
   zugleich, dass der Aufwand handhabbar bleibt — die Wiederherstellung läuft
   in einer Edge Function neben der regulären Auswertung. */
describe("Wiederherstellung einer vollen Partie mit fünf Spielern", () => {
  it("stellt jedes Halbjahr her und bleibt dabei im Aufwandsrahmen", () => {
    const rng = createRng(777);
    const market: Record<string, number> = {};
    SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
    let state: RuntimeState = { market, funds: [0, 1, 2, 3, 4].map((i) => fund(i, false, null)),
      feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {} };
    const boot: unknown[] = [];
    for (let i = 0; i < 4; i++) boot.push(newDeal(rng, "process", market));
    for (let i = 0; i < 3; i++) boot.push(newDeal(rng, "prop", market, 3));
    state = { ...state, deals: boot };
    const states: Any[] = [{ halfYear: 0, state }];
    const dec: Any = {};
    const ids = ["opex", "nwc", "erp", "ai"];
    const HY = 15;
    for (let hy = 1; hy <= HY; hy++) {
      const bySlot: Record<number, TurnDecisions> = {};
      [0, 1, 2, 3, 4].forEach((slot) => {
        const holdings = state.funds[slot].holdings as Any[];
        const d: TurnDecisions = {};
        if (holdings.length < 6 && state.deals.length) {
          const deal = state.deals[slot % state.deals.length] as Any;
          d.bids = [{ dealId: deal.id, multiple: deal.askMult * (0.95 + slot * 0.02), leverage: Math.min(deal.levCap, 3 + slot * 0.1) }];
          d.dueDiligence = [deal.id];
        }
        const fp = holdings.find((h) => !h.initP);
        if (fp) d.initiatives = [{ holdingUid: fp.uid, dim: "plat", id: ids[hy % ids.length] as Any }];
        const fa = holdings.find((h) => !h.initA);
        if (fa) d.initiatives = [...(d.initiatives || []), { holdingUid: fa.uid, dim: "acc", id: "pen" }];
        const vac = holdings.find((h) => h.cfo.skill <= 0 && !(h.searches || []).some((x: Any) => x.seat === "cfo"));
        if (vac) d.searches = [{ holdingUid: vac.uid, seat: "cfo" }];
        const sl = state.shortlist[String(slot)] || [];
        if (sl.length) d.hires = sl.map((it: Any) => ({ holdingUid: it.holdingUid, seat: it.seat, choice: "aplayer" }));
        const q = state.exitQueue[String(slot)] || [];
        if (q.length) d.offerDecisions = q.map((it: Any) => ({ holdingUid: it.holdingUid, choice: "accept", offerIndex: 0 }));
        const ripe = holdings.find((h) => h.holdQ >= 6 && !h.proc && !h.lockUntil);
        if (ripe && hy % 4 === 0) d.exitStarts = [{ holdingUid: ripe.uid, action: "process" }];
        bySlot[slot] = d;
      });
      dec[hy] = bySlot;
      state = runQuarter({ state, halfYear: hy, decisionsBySlot: bySlot, rng }).state;
      states.push({ halfYear: hy, state });
    }
    const stored = states.map((r: Any) => ({ halfYear: r.halfYear, state: tj(strip(r.state)) }));
    const t = Date.now();
    const res = backfillSeason({ states: stored, decisionsByHalfYear: dec, endSeed: rng.seed });
    const ms = Date.now() - t;
    expect(res.ok, res.reason).toBe(true);
    // Gemessen rund 200 Wiederholungen; die Schranke lässt reichlich Luft und
    // schlägt trotzdem an, falls die Suche je entgleist.
    expect(res.attempts).toBeLessThan(4000);
    expect(ms).toBeLessThan(30000);
    expect(JSON.stringify(tj(res.states[res.states.length - 1].state))).toBe(JSON.stringify(tj(states[HY].state)));
  }, 300000);
});
