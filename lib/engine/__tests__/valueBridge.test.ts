import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { SECTORS, SECNAMES, ARCHES, CAPITAL, PERIODS, DEFAULT_HUMAN_ATTRS,
  fundBridge, fundBridgeStep, FUND_BRIDGE_PARTS, FUND_BRIDGE_GROUPS, bridgeStep,
  tvpiOf, irrOf, cashflowsOf, IRR_FLOOR } from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Die Value Bridge des Abschlussbildschirms muss auf dieselbe Größe schließen,
   aus der TVPI und Wertung gerechnet werden. Vorher tat sie das nicht: Nur der
   Schlussverkauf und die Tail-End-Verwertung schrieben eine Zerlegung mit,
   Covenant Breach, Börsengang und Teilexit nicht — und die Kosten oberhalb der
   Beteiligungen (Management Fee, Due Diligence) kannte die Aufstellung
   überhaupt nicht. Eine Partie konnte dort mit +36,6 Mio. € stehen, während
   TVPI 0,89× und IRR −1,4 % auswiesen. */

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

const HUMAN_SLOT = 0;

/* Aggressiv finanziert und über alle Ausstiegswege verteilt: So laufen genug
   Beteiligungen in einen Covenant Breach und genug in Teilexit, Börsengang und
   Restplatzierung, dass jeder Zweig der Buchung wirklich vorkommt. */
function decideForHuman(
  state: RuntimeState, halfYear: number, myExitQueue: RuntimeState["exitQueue"][string],
  lev?: number,
): TurnDecisions {
  const me = state.funds[HUMAN_SLOT];
  const holdings = me.holdings as Any[];
  const decisions: TurnDecisions = {};

  if (holdings.length < 6 && state.deals.length) {
    const d = state.deals[0] as Any;
    decisions.bids = [{ dealId: d.id, multiple: d.askMult * 1.02, leverage: lev ?? d.levCap }];
  }
  const free = holdings.find((h) => !h.initP);
  if (free) decisions.initiatives = [{ holdingUid: free.uid, dim: "plat", id: "opex" }];
  if (myExitQueue && myExitQueue.length) {
    decisions.offerDecisions = myExitQueue.map((it) => ({ holdingUid: it.holdingUid, choice: "accept" as const, offerIndex: 0 }));
  }
  const mature = holdings.filter((h) => h.holdQ >= 6 && !h.proc && !h.lockUntil && !h.cv);
  if (mature.length) {
    const action = halfYear % 3 === 0 ? "cv" : halfYear % 3 === 1 ? "ipo" : "process";
    decisions.exitStarts = [{ holdingUid: mature[0].uid, action, keepPct: 0.3 } as Any];
  }
  return decisions;
}

function playSeason(seed: number, until: number = PERIODS, lev?: number) {
  const rng = createRng(seed);
  let state = baseState();
  const { deals, landmark } = bootstrapInitialDeals(rng, state.market, state.funds);
  state = { ...state, deals, landmark };
  for (let hy = 1; hy <= until; hy++) {
    const decisions = decideForHuman(state, hy, state.exitQueue[String(HUMAN_SLOT)], lev);
    state = runQuarter({ state, halfYear: hy, decisionsBySlot: { [HUMAN_SLOT]: decisions }, rng }).state;
  }
  return state;
}

const SEEDS = [20260817, 7, 4242, 99991];

// Summiert über die ausgewiesene Postenliste, nicht über eine zweite Abschrift
// davon — kommt ein Posten dazu, fällt er hier auf statt still zu verschwinden.
const sumParts = (b: Any) => FUND_BRIDGE_PARTS.reduce((s: number, k: string) => s + b[k], 0);

describe("Value Bridge des Fonds", () => {
  it("zerlegt jeden realisierten Deal, unabhängig vom Ausstiegsweg", () => {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      for (const f of playSeason(seed).funds) {
        for (const r of (f.realized || []) as Any[]) {
          expect(r.bridge, `${f.name}: ${r.name} ohne Zerlegung`).toBeTruthy();
          const kind = /\(([^)]+)\)$/.exec(r.name);
          seen.add(kind ? kind[1] : "Verkauf");
        }
      }
    }
    // Der Test ist nur aussagekräftig, wenn die neu gebuchten Wege vorkommen.
    expect(seen.has("Covenant Breach")).toBe(true);
    expect(seen.has("Tail-End")).toBe(true);
  });

  it("schließt auf denselben Gewinn, aus dem der TVPI gerechnet wird", () => {
    for (const seed of SEEDS) {
      const state = playSeason(seed);
      for (const f of state.funds) {
        const b = fundBridge(f as Any, state.market, PERIODS);
        // Die Posten erklären den Gewinn vollständig
        expect(sumParts(b)).toBeCloseTo(b.gain, 6);
        // …und die Überschrift ist der Gewinn hinter dem TVPI
        const tvpi = tvpiOf(f as Any, state.market, PERIODS);
        expect(b.gain / b.drawn).toBeCloseTo(tvpi - 1, 9);
      }
    }
  });

  it("zeigt nie einen Gewinn, wo der TVPI einen Verlust ausweist", () => {
    for (const seed of SEEDS) {
      const state = playSeason(seed);
      for (const f of state.funds) {
        const b = fundBridge(f as Any, state.market, PERIODS);
        const tvpi = tvpiOf(f as Any, state.market, PERIODS);
        expect(Math.sign(Math.round(b.gain * 1e6))).toBe(Math.sign(Math.round((tvpi - 1) * 1e6)));
      }
    }
  });

  /* Derselbe Gewinn steckt im Barwert der Zahlungsreihe bei Zins null. Ein
     Fonds über 1,00× hat damit zwingend einen positiven IRR. Vorher warf eine
     kleine Schlusszahlung — die Management Fee des letzten Halbjahres — den
     IRR auf den Boden, während TVPI und Brücke einen Gewinn auswiesen. */
  it("trägt denselben Gewinn im Barwert der Zahlungsreihe", () => {
    for (const seed of SEEDS) {
      const state = playSeason(seed);
      for (const f of state.funds) {
        const b = fundBridge(f as Any, state.market, PERIODS);
        const cf = cashflowsOf(f as Any, state.market, PERIODS);
        expect(cf.reduce((s2: number, p: Any) => s2 + p.v, 0)).toBeCloseTo(b.gain, 6);
      }
    }
  });

  it("weist keinen Fonds über 1,00× mit negativem IRR aus", () => {
    for (const seed of SEEDS) {
      const state = playSeason(seed);
      for (const f of state.funds) {
        const tvpi = tvpiOf(f as Any, state.market, PERIODS);
        const irr = irrOf(f as Any, state.market, PERIODS);
        expect(Math.sign(irr), `${seed} ${f.name}: TVPI ${tvpi.toFixed(2)}`)
          .toBe(Math.sign(Math.round((tvpi - 1) * 1e9)));
        expect(irr, `${seed} ${f.name}`).toBeGreaterThan(IRR_FLOOR);
      }
    }
  });

  /* Die Ansicht zeigt die Gruppen zugeklappt mit ihrer Summe. Fehlte dort ein
     Posten, wäre diese Summe still falsch — die Gruppen müssen die Postenliste
     also lückenlos und überschneidungsfrei abdecken. */
  it("teilt jeden Posten genau einer Gruppe zu", () => {
    const inGroups = FUND_BRIDGE_GROUPS.flatMap((g) => g.parts);
    expect([...inGroups].sort()).toEqual([...FUND_BRIDGE_PARTS].sort());
    expect(new Set(inGroups).size).toBe(inGroups.length);
    for (const seed of SEEDS) {
      const state = playSeason(seed);
      for (const f of state.funds) {
        const b = fundBridge(f as Any, state.market, PERIODS);
        const byGroup = FUND_BRIDGE_GROUPS.reduce(
          (s2, g) => s2 + g.parts.reduce((a: number, k: string) => a + b[k], 0), 0);
        expect(byGroup).toBeCloseTo(b.gain, 6);
      }
    }
  });

  /* Kapitalrückführungen aus Beteiligungen, die noch gehalten werden, hatten
     in der alten Aufstellung keinen Platz und fielen in den Restposten. */
  it("weist Kapitalrückführungen aus, auch aus dem laufenden Portfolio", () => {
    let openRecaps = 0, seenInBridge = 0;
    for (const seed of SEEDS) {
      const state = playSeason(seed, 16, 1.2);
      for (const f of state.funds) {
        const held = ((f.holdings || []) as Any[]).reduce((s2, c) => s2 + (c.recapOut || 0), 0);
        if (held <= 0.05) continue;
        openRecaps += held;
        seenInBridge += fundBridge(f as Any, state.market, 16).recaps;
      }
    }
    expect(openRecaps).toBeGreaterThan(0);
    expect(seenInBridge).toBeGreaterThanOrEqual(openRecaps - 1e-6);
  });

  /* Die Portfolioansicht zeigt dieselbe Zerlegung über zwei Zeiträume, letztes
     Halbjahr und seit Einstieg. Sie ist nur dann trennscharf, wenn ihre Zeilen
     sich genau auf die Veränderung des Gesamtwerts addieren — vorher stand die
     Wertveränderung zweimal da, einmal ohne und einmal mit den bereits
     entnommenen Beträgen. */
  it("zerlegt jeden Zeitraum einer Halteperiode vollständig", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      // Mitten in der Laufzeit: am Ende ist alles verwertet, das Portfolio leer
      const state = playSeason(seed, 14);
      for (const f of state.funds) {
        for (const c of (f.holdings || []) as Any[]) {
          const h = c.hist || [];
          if (h.length < 2) continue;
          for (const from of [h[h.length - 2], h[0]]) {
            const b = bridgeStep(from, h[h.length - 1])!;
            expect(b.ebitda + b.mult + b.delev + b.dist + b.rest).toBeCloseTo(b.total, 6);
            // Der Gesamtwert ist NAV plus alles, was bereits entnommen wurde
            expect(b.total).toBeCloseTo(h[h.length - 1].eq - from.eq, 6);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  /* Die Aufstellung endet auf der Kennzahl, nach der gewertet wird:
     abgerufenes Kapital plus Gewinn ist der Gesamtwert, Gesamtwert je
     abgerufenem Euro ist der TVPI. */
  it("leitet auf den TVPI über", () => {
    for (const seed of SEEDS) {
      const state = playSeason(seed);
      for (const f of state.funds) {
        const b = fundBridge(f as Any, state.market, PERIODS);
        expect(b.drawn + b.gain).toBeCloseTo(b.value, 6);
        expect(b.tvpi).toBeCloseTo(tvpiOf(f as Any, state.market, PERIODS), 9);
      }
    }
  });

  /* Die Halbjahresspalte ist die Differenz zweier Stände. Weil die Posten an
     beiden Stichtagen exakt aufgehen, tun es ihre Differenzen auch — und der
     Gewinn eines Halbjahres ist die Veränderung des Gesamtwerts abzüglich des
     in dieser Zeit neu abgerufenen Kapitals. */
  it("zerlegt auch ein einzelnes Halbjahr vollständig", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const was = playSeason(seed, 13);
      const now = playSeason(seed, 14);
      for (const f of now.funds) {
        const before = was.funds.find((z) => z.slot === f.slot)!;
        const step = fundBridgeStep(
          fundBridge(f as Any, now.market, 14),
          fundBridge(before as Any, was.market, 13),
        )!;
        expect(sumParts(step)).toBeCloseTo(step.gain, 6);
        expect(step.drawn + step.gain).toBeCloseTo(step.value, 6);
        checked++;
      }
    }
    expect(checked).toBe(SEEDS.length * 5);
  });

  it("hat am Laufzeitende nichts Unrealisiertes mehr", () => {
    const state = playSeason(SEEDS[0]);
    for (const f of state.funds) {
      expect(fundBridge(f as Any, state.market, PERIODS).openCount).toBe(0);
    }
  });
});
