import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  SECTORS, SECNAMES, ARCHES, CAPITAL, PERIODS, DEFAULT_HUMAN_ATTRS,
  FUND_BRIDGE_PARTS, FUND_BRIDGE_GROUPS, fundBridge, fundBridgeStep,
  tvpiOf, irrOf, scoreOf, navOf, liquidateHoldings, tailEndOf,
  buildInit, initDurationOf, initById, initDur, effSkill, repeatMalus, initRuns, INITS,
} from "../engine";
import { runQuarter, bootstrapInitialDeals, computeFinalRanking } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Zwei Fragen, die dieselbe Stelle betreffen und beide aus einer Testpartie
   kamen: Stimmt die Endabrechnung wirklich mit "Halbjahr 20 plus Verwertung
   des Restbestands" überein, und stimmt die angezeigte Restlaufzeit einer
   Maßnahme mit dem Zeitpunkt überein, an dem sie liefert?

   Die Antwort auf beide steht seit dem 15.09.2026 in je einer Funktion
   (liquidateHoldings/tailEndOf, initDurationOf), damit Ansicht, Übungsmodus
   und Auswertung gar nicht auseinanderlaufen können. Dieser Test hält das
   fest — er prüft nicht Sollwerte, sondern dass alle Wege dieselbe Zahl
   ergeben.                                                                  */

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
  const archKeys = ["sourcing", "ops", "fin", "all"];
  return {
    market,
    funds: [initialFund(0, false, null), ...archKeys.map((k, i) => initialFund(i + 1, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
}

/* Eine Spielweise, die bewusst in die Tail-End-Verwertung läuft: kaufen,
   Maßnahmen aufsetzen, nie verkaufen. Genau der Fall, in dem die
   Endabrechnung von dem abweicht, was in Halbjahr 20 auf dem Bildschirm
   stand — und in dem der Value Bridge am meisten zu erklären bleibt. */
function decide(state: RuntimeState, hy: number): TurnDecisions {
  const me = state.funds[0] as Any;
  const d: TurnDecisions = {};
  if (me.holdings.length < 6 && state.deals.length) {
    const x = (state.deals as Any[])[0];
    d.bids = [{ dealId: x.id, multiple: x.askMult, leverage: x.levCap * 0.8 }];
    d.dueDiligence = [x.id];
  }
  const free = (me.holdings as Any[]).find((h) => !h.initA);
  if (free) d.initiatives = [{ holdingUid: free.uid, dim: "acc", id: hy % 2 ? "ma" : "pen" } as Any];
  return d;
}

function play(seed: number, until = PERIODS) {
  const rng = createRng(seed);
  let state = baseState();
  const { deals, landmark } = bootstrapInitialDeals(rng, state.market, state.funds);
  state = { ...state, deals, landmark };
  const snaps: RuntimeState[] = [];
  for (let hy = 1; hy <= until; hy++) {
    state = runQuarter({ state, halfYear: hy, decisionsBySlot: { 0: decide(state, hy) }, rng } as Any).state;
    snaps.push(state);
  }
  return snaps;
}

const SEEDS = [1, 7, 4242, 20260817, 314159];

describe("Tail-End-Verwertung und Endabrechnung", () => {
  it("die Vorschau rechnet exakt das, was am Laufzeitende passiert", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const snaps = play(seed, PERIODS - 1);
      const state = snaps[snaps.length - 1];
      for (const f of state.funds as Any[]) {
        if (!f.holdings.length) continue;
        const q = PERIODS - 1;
        const preview = tailEndOf(f, state.market, q);

        // 1 — dieselbe Rechnung von Hand: Kopie, liquidieren, messen
        const copy = {
          ...f, holdings: f.holdings.map((c: Any) => ({ ...c })),
          realized: [...f.realized], calls: [...f.calls], dists: [...f.dists],
        };
        liquidateHoldings(copy, state.market, q);
        expect(preview.tvpi, `${seed}: TVPI der Vorschau`).toBeCloseTo(tvpiOf(copy, state.market, q), 12);
        expect(preview.irr, `${seed}: IRR der Vorschau`).toBeCloseTo(irrOf(copy, state.market, q), 12);
        expect(preview.score, `${seed}: Wertung der Vorschau`).toBeCloseTo(scoreOf(copy, state.market, q), 12);

        // 2 — und sie fasst den Fonds dabei nicht an
        expect(f.holdings.length, `${seed}: Bestand unverändert`).toBeGreaterThan(0);
        expect(navOf(f, state.market), `${seed}: NAV unverändert`).toBeGreaterThan(0);

        /* 3 — der Zwangsabschlag geht immer zu Lasten des Fonds. Genau das
           ist der Unterschied, den die Kopfleiste vorher verschwieg: Die
           Bewertung des Bestands läuft über markMultiple() und kennt den
           Abschlag nicht. */
        expect(preview.tvpi, `${seed}: Verwertung kostet TVPI`)
          .toBeLessThanOrEqual(tvpiOf(f, state.market, q) + 1e-9);
        expect(preview.haircut, `${seed}: Abschlag positiv`).toBeGreaterThan(0);
        checked++;
      }
    }
    expect(checked, "kein Fonds mit Restbestand geprüft").toBeGreaterThan(5);
  });

  it("die Endabrechnung geht auf den TVPI auf, nach dem gewertet wird", () => {
    for (const seed of SEEDS) {
      const snaps = play(seed);
      const state = snaps[snaps.length - 1];
      const rank = computeFinalRanking(state, PERIODS);
      for (const f of state.funds as Any[]) {
        const where = `${seed}/Fonds ${f.slot}`;
        const b = fundBridge(f, state.market, PERIODS);
        const r = rank.find((z) => z.slot === f.slot)!;

        // Nach der Verwertung steht nichts mehr im Portfolio …
        expect(f.holdings.length, `${where}: Bestand leer`).toBe(0);
        // … und der unrealisierte Block ist deshalb null.
        expect(b.uEbitda + b.uMult + b.uDelev, `${where}: unrealisiert`).toBeCloseTo(0, 9);

        // Die Posten erklären den Gewinn, und der führt auf die Wertungsgröße
        expect(FUND_BRIDGE_PARTS.reduce((s, k) => s + b[k], 0), `${where}: Posten`).toBeCloseTo(b.gain, 6);
        expect(FUND_BRIDGE_GROUPS.reduce((s, g) => s + g.parts.reduce((a, k) => a + b[k], 0), 0),
          `${where}: Gruppen`).toBeCloseTo(b.gain, 6);
        expect(b.drawn + b.gain, `${where}: Überleitung`).toBeCloseTo(b.value, 6);
        expect(b.tvpi, `${where}: TVPI der Aufstellung`).toBeCloseTo(r.tvpi, 9);
        expect(tvpiOf(f, state.market, PERIODS), `${where}: TVPI der Kennzahl`).toBeCloseTo(r.tvpi, 9);

        /* Jeder Tail-End-Deal bringt seine Zerlegung mit. Ohne sie fiele sein
           gesamter Wertbeitrag in den Restposten "Transaktionskosten" —
           genau das tat der Übungsmodus bis zum 15.09.2026. */
        expect((f.realized as Any[]).length, `${where}: keine realisierte Beteiligung`).toBeGreaterThan(0);
        for (const rz of f.realized as Any[]) {
          expect(rz.bridge, `${where}: ${rz.name} ohne Value Bridge`).toBeTruthy();
        }
      }
    }
  });

  it("die Spalte 'letztes Halbjahr' erklärt genau den Sprung der Endabrechnung", () => {
    for (const seed of SEEDS) {
      const snaps = play(seed);
      const end = snaps[snaps.length - 1], before = snaps[snaps.length - 2];
      for (const f of end.funds as Any[]) {
        const p = (before.funds as Any[]).find((z) => z.slot === f.slot)!;
        const where = `${seed}/Fonds ${f.slot}`;
        const now = fundBridge(f, end.market, PERIODS);
        const was = fundBridge(p, before.market, PERIODS - 1);
        const step = fundBridgeStep(now, was)!;
        // Die Posten der Spalte addieren sich auf ihren Gewinn …
        expect(FUND_BRIDGE_PARTS.reduce((s, k) => s + step[k], 0), `${where}: Posten HJ`).toBeCloseTo(step.gain, 6);
        // … und der Gewinn plus Kapitalabruf auf die Wertveränderung.
        expect(step.drawn + step.gain, `${where}: Überleitung HJ`).toBeCloseTo(step.value, 6);
        expect(now.value - was.value, `${where}: Wertveränderung`).toBeCloseTo(step.value, 6);
      }
    }
  });
});

describe("Laufzeit einer Maßnahme", () => {
  /* Die Zahl, die im Katalog steht, in der Vormerkung der Mehrspielerpartie
     gerechnet wird und die Karte danach herunterzählt, muss dieselbe sein wie
     die, mit der buildInit() doneQ setzt. Vorher rechnete die Vormerkung
     `initDur(E)` allein — ohne den Dauerzuschlag der Maßnahme (beim Add-on
     +1) und ohne den Wiederholungsmalus. */
  it("initDurationOf ist die Dauer, die buildInit dann auch setzt", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const snaps = play(seed, 12);
      const state = snaps[snaps.length - 1];
      for (const f of state.funds as Any[]) {
        for (const c of f.holdings as Any[]) {
          for (const dim of ["plat", "acc"]) {
            for (const spec of (INITS as Any)[dim]) {
              const expected = initDurationOf(c, dim, spec.id);
              const B = buildInit(createRng(99), c, dim, spec.id, state.market, 7) as Any;
              if (!B || B.blocked) continue;
              expect(B.init.doneQ, `${seed}: ${spec.id} doneQ`).toBe(7 + expected);
              expect(B.dur, `${seed}: ${spec.id} dur`).toBe(expected);
              checked++;
            }
          }
        }
      }
    }
    expect(checked, "keine Maßnahme geprüft").toBeGreaterThan(20);
  });

  it("der Dauerzuschlag einer Maßnahme steckt in initDurationOf", () => {
    const snaps = play(4242, 8);
    const state = snaps[snaps.length - 1];
    const c = (state.funds as Any[]).flatMap((f) => f.holdings as Any[])[0];
    expect(c, "keine Beteiligung im Test").toBeTruthy();
    const E = effSkill(c, "r3") * (c.onboard > 0 ? 0.7 : 1);
    // Add-on: dm = 1. Die alte Vormerkung rechnete genau diesen Zuschlag nicht mit.
    expect((initById("acc", "ma") as Any).dm).toBe(1);
    expect(initDurationOf(c, "acc", "ma"))
      .toBe(Math.max(1, initDur(E) + 1 + repeatMalus(initRuns(c, "ma")).dm));
    expect(initDurationOf(c, "acc", "ma")).toBeGreaterThan(initDur(E) - 1 + 1);
  });
});
