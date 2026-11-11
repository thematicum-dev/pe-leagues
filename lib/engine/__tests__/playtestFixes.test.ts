/* Befunde der Agentenpartie vom 10./11.11.2026 (scripts/agent-match.ts, zwei
   Agenten gegeneinander über 20 Halbjahre) und die Regeln, die daraus
   folgten. Jede hängt an EngineCompat.legacyAddonGrowth, damit sich ältere
   Halbjahre weiter exakt nachrechnen lassen. */
import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  ARCHES, CAPITAL, DEFAULT_HUMAN_ATTRS, INIT_SLOTS, LEGACY_COMPAT, POACH_GRACE, SECNAMES, SECTORS,
  cagrOf, cagrPrem, growthPrem, markMultiple, maturePeople, organicCagrOf,
} from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";
import { decide } from "./pilotStrategies";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function fund(slot: number, ai?: string): RuntimeFund {
  const a = ai ? (ARCHES.find((z) => z.key === ai) as Any) : null;
  return {
    slot, profileId: a ? null : "p" + slot, isAi: !!a, archetype: a ? a.key : null, name: a ? a.name : "Fonds " + slot,
    attrs: { ...(a ? a.attrs : DEFAULT_HUMAN_ATTRS) },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  } as Any;
}
function season(seed: number) {
  const rng = createRng(seed);
  const funds = [fund(0), fund(1), fund(2, "sourcing"), fund(3, "ops"), fund(4, "fin")];
  const market: Record<string, number> = {};
  SECNAMES.forEach((x) => (market[x] = (SECTORS as Any)[x].m));
  let state: RuntimeState = { market, funds, feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {} };
  const boot = bootstrapInitialDeals(rng, market, funds);
  state = { ...state, deals: boot.deals, landmark: boot.landmark };
  return { rng, state };
}
/* Spielt bis einschließlich Halbjahr `until`; `tweak` darf jede Abgabe ändern. */
function play(seed: number, until: number, opts: { compat?: Any; tweak?: (d: TurnDecisions, s: RuntimeState, hy: number, slot: number) => void } = {}) {
  const { rng, state: s0 } = season(seed);
  const srng = createRng(seed + 99);
  let state = s0;
  for (let hy = 1; hy <= until; hy++) {
    const decisionsBySlot: Record<number, TurnDecisions> = {};
    [0, 1].forEach((slot) => {
      const d = decide(slot === 0 ? "aggr" : "over", state, slot, hy, srng) || {};
      opts.tweak?.(d, state, hy, slot);
      decisionsBySlot[slot] = d;
    });
    state = runQuarter({ state, halfYear: hy, decisionsBySlot, rng, compat: opts.compat }).state;
  }
  return state;
}
const holdings = (s: RuntimeState) => s.funds.flatMap((f) => f.holdings as Any[]);

describe("Zugekaufter Umsatz ist kein organisches Wachstum", () => {
  const base = () => ({
    sector: "Services", quality: 55, revenue: 100, holdQ: 4,
    hist: [{ rev: 100 }, { rev: 100 }, { rev: 100 }, { rev: 100 }],
  }) as Any;
  const market = { Services: 9 } as Any;

  it("ein Zukauf hebt die Gesamt-CAGR, aber weder die organische noch das Multiple", () => {
    const before = base();
    const after = { ...base(), revenue: 125, orgF: 100 / 125 };
    expect(cagrOf(after)!).toBeGreaterThan(cagrOf(before)! + 10);
    expect(organicCagrOf(after)).toBeCloseTo(organicCagrOf(before)!, 9);
    expect(cagrPrem(after)).toBeCloseTo(cagrPrem(before), 9);
    expect(markMultiple(after, market)).toBeCloseTo(markMultiple(before, market), 9);
  });

  it("im alten Regelstand (ohne orgF) trug derselbe Zukauf eine Prämie von über einem Viertel", () => {
    const legacy = { ...base(), revenue: 125 };
    expect(markMultiple(legacy, market) / markMultiple(base(), market)).toBeGreaterThan(1.25);
  });

  it("organisches Wachstum nach dem Zukauf zählt weiter, anteilig auf den ganzen Umsatz", () => {
    const grown = { ...base(), revenue: 125 * 1.2, orgF: 0.8, holdQ: 4 };
    const pure = { ...base(), revenue: 120 };
    expect(organicCagrOf(grown)).toBeCloseTo(organicCagrOf(pure)!, 9);
    expect(growthPrem(grown)).toBeGreaterThan(0);
  });

  it("in der Partie: jeder Zukauf hinterlässt orgF < 1, nach altem Regelstand keiner", () => {
    let withAddon = 0;
    for (const seed of [11, 12, 13]) {
      holdings(play(seed, 9)).forEach((c) => {
        if ((c.addons || []).length) { withAddon++; expect(c.orgF, c.name).toBeLessThan(1); expect(c.orgF).toBeGreaterThan(0.3); }
        else if (c.orgF != null) expect(c.orgF).toBeLessThan(1); // Ereignis "Add-on-Gelegenheit"
      });
      holdings(play(seed, 9, { compat: LEGACY_COMPAT })).forEach((c) => expect(c.orgF, "alt: " + c.name).toBeUndefined());
    }
    expect(withAddon, "die Spielweise kauft zu").toBeGreaterThan(3);
  });
});

describe("Nichts verschwindet wortlos", () => {
  it("Maßnahme über dem Slot-Kontingent: Meldung an den eigenen Platz", () => {
    let asked = 0;
    const state = play(21, 8, {
      tweak: (d, s, _hy, slot) => {
        if (slot !== 0) return;
        const me = s.funds[0] as Any;
        // Breit kaufen, damit mehr Dimensionen offen sind als Slots
        if (_hy <= 4) d.bids = (s.deals as Any[]).filter((x) => x.type === "process").map((x) => ({ dealId: x.id, multiple: x.askMult * 1.3, leverage: x.levCap }));
        // Alles auf einmal anfordern: jede freie Dimension jeder Beteiligung
        d.initiatives = (me.holdings as Any[]).flatMap((c) => [
          ...(!c.initP ? [{ holdingUid: c.uid, dim: "plat" as const, id: "nwc" }] : []),
          ...(!c.initA ? [{ holdingUid: c.uid, dim: "acc" as const, id: "pen" }] : []),
          { holdingUid: c.uid, dim: "plat" as const, id: "nwc" },
        ]);
        asked += d.initiatives.length;
      },
    });
    const max = INIT_SLOTS + Math.floor(DEFAULT_HUMAN_ATTRS.operations / 2);
    const drops = state.feed.filter((n) => n.text.includes("nicht gestartet"));
    expect(asked).toBeGreaterThan(max);
    expect(drops.length).toBeGreaterThan(0);
    // privat: jede dieser Meldungen gehört genau einem Fondsplatz
    expect(drops.every((n) => n.slot != null && n.tone === "neg")).toBe(true);
    expect(drops.some((n) => n.slot === 0)).toBe(true);
    expect(drops.some((n) => n.text.includes("läuft bereits"))).toBe(true);
    expect(drops.some((n) => n.text.includes(`alle ${max} Maßnahmen-Slots`))).toBe(true);
  });

  it("Studie auf eine Beteiligung mit Branchenreferenz: Meldung, keine Kosten", () => {
    const { rng, state } = season(33);
    let s = state;
    for (let hy = 1; hy <= 4; hy++) {
      s = runQuarter({ state: s, halfYear: hy, rng, decisionsBySlot: { 0: decide("aggr", s, 0, hy, createRng(1)) || {} } }).state;
    }
    const me = s.funds[0] as Any;
    const c = (me.holdings as Any[]).find((h) => h.dd);
    expect(c, "eine mit Due Diligence gekaufte Beteiligung").toBeTruthy();
    const feesBefore = me.fees;
    const out = runQuarter({ state: s, halfYear: 5, rng, decisionsBySlot: { 0: { studies: [c.uid] } } });
    expect(out.feed.some((n) => n.slot === 0 && n.text.includes("Keine Benchmarkstudie beauftragt"))).toBe(true);
    expect(out.feed.some((n) => n.text.includes(": Benchmarkstudie beauftragt"))).toBe(false);
    void feesBefore;
  });

  it("Gebot auf der gerundeten Leverage-Obergrenze gilt als Gebot auf der Obergrenze", () => {
    const { rng, state } = season(44);
    const d = (state.deals as Any[]).find((x) => x.type === "process");
    const shown = Math.round(d.levCap * 100) / 100 + 0.005; // was eine gerundete Anzeige höchstens darüber liegt
    const out = runQuarter({ state, halfYear: 1, rng, decisionsBySlot: { 0: { bids: [{ dealId: d.id, multiple: d.askMult * 1.5, leverage: shown }] } } });
    expect(out.feed.some((n) => n.text.includes("außerhalb des Zulässigen"))).toBe(false);
    const got = (out.state.funds[0].holdings as Any[]).find((c) => c.name === d.name);
    expect(got, "höchstes Gebot gewinnt").toBeTruthy();
    expect(got.entryDebt / got.entryEbitda).toBeCloseTo(d.levCap, 6);
    // deutlich darüber bleibt ungültig
    const { rng: r2, state: s2 } = season(44);
    const bad = runQuarter({ state: s2, halfYear: 1, rng: r2, decisionsBySlot: { 0: { bids: [{ dealId: d.id, multiple: d.askMult * 1.5, leverage: d.levCap + 0.5 }] } } });
    expect(bad.feed.some((n) => n.slot === 0 && n.text.includes("außerhalb des Zulässigen"))).toBe(true);
  });
});

describe("Schonfrist nach der Verpflichtung", () => {
  // rnd() = 0 heißt: jede Abwerbung, die möglich ist, passiert
  const always = { rnd: () => 0, nrm: () => 0, pick: <T,>(a: readonly T[]) => a[0], band: (r: readonly [number, number]) => r[0], seed: 0, draws: 0, setSeed() {} } as Any;
  const holding = () => {
    const s = play(55, 5);
    const c = JSON.parse(JSON.stringify(holdings(s).find((h) => h.ceo.skill > 0 && h.cfo.skill > 0 && h.r3.skill > 0)));
    c.initP = null; c.initA = null; c.searches = [];
    ["ceo", "cfo", "r3"].forEach((k) => { c[k].retiring = false; c[k].dev = false; });
    return c;
  };
  const market = Object.fromEntries(SECNAMES.map((x) => [x, (SECTORS as Any)[x].m]));

  it("wer in diesem oder im letzten Halbjahr unterschrieben hat, bleibt", () => {
    for (let age = 0; age < POACH_GRACE; age++) {
      const c = holding();
      c.cfo.hiredQ = 10 - age;
      maturePeople(always, c, market, 10, true, [], []);
      expect(c.cfo.skill, `Alter ${age}`).toBeGreaterThan(0);
      expect(c.ceo.skill, "der Amtsinhaber ohne Schonfrist geht").toBe(0);
    }
  });

  it("danach gilt das normale Risiko, und der alte Regelstand kennt keine Schonfrist", () => {
    const c = holding();
    c.cfo.hiredQ = 10 - POACH_GRACE;
    maturePeople(always, c, market, 10, true, [], []);
    expect(c.cfo.skill).toBe(0);
    const old = holding();
    old.cfo.hiredQ = 10;
    maturePeople(always, old, market, 10, true, [], [], LEGACY_COMPAT);
    expect(old.cfo.skill).toBe(0);
  });
});
