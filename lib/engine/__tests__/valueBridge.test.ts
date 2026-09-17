import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { SECTORS, SECNAMES, ARCHES, CAPITAL, PERIODS, DEFAULT_HUMAN_ATTRS, COV_DEFAULT,
  fundBridge, fundBridgeStep, FUND_BRIDGE_PARTS, FUND_BRIDGE_GROUPS, bridgeStep,
  bridgeChain, liveHist, makeBridge, dealMoic, takeUnrealized, navValueOf,
  stepCompany, ebitdaOf, periodFin, resetPeriod,
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
    let checked = 0;
    for (const seed of SEEDS) {
      // Gering verschuldet, damit Beteiligungen in Nettoliquidität laufen und
      // der Cash Sweep überhaupt greift
      const state = playSeason(seed, 16, 1.2);
      for (const f of state.funds) {
        const held = ((f.holdings || []) as Any[]).reduce((s2, c) => s2 + (c.recapOut || 0), 0);
        const sold = ((f.realized || []) as Any[])
          .reduce((s2, r) => s2 + (r.bridge ? r.bridge.dist || 0 : 0), 0);
        // Exakt, nicht "mindestens": Fiele der Anteil aus dem laufenden
        // Portfolio weg, verschöbe er sich still in den Restposten und die
        // Summe stimmte weiter.
        expect(fundBridge(f as Any, state.market, 16).recaps,
          `${seed}/${f.name}`).toBeCloseTo(held + sold, 9);
        if (held > 0.05) checked++;
      }
    }
    expect(checked, "keine Rückführung aus dem laufenden Portfolio getroffen").toBeGreaterThan(0);
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
            /* Alle sechs Posten, nicht fünf: `inj` gehört dazu, sobald der
               Fonds Eigenkapital in die Beteiligung gegeben hat (Equity Cure
               oder Eigenkapitalanteil eines Zukaufs). Die Ansicht führt die
               Zeile "Kapitalzuführung" genau dafür; ohne sie ging die Summe
               in jeder Partie auf, in der nie zugeführt wurde — und nur in
               der. */
            expect(b.ebitda + b.mult + b.delev + b.dist + b.inj + b.rest).toBeCloseTo(b.total, 6);
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

  /* Ein Abgang ist eine Umgliederung, keine Wertentwicklung. Bis zum
     16.09.2026 wies die Halbjahresspalte ihn als beides aus: Die Beteiligung
     verließ den unrealisierten Block (dort erschien ihr bisheriger Beitrag mit
     umgekehrtem Vorzeichen) und tauchte im realisierten wieder auf. Bei einer
     im Covenant Breach verlorenen Beteiligung stand dann "Unrealisiert +78,
     davon Entschuldung +127" — in dem Halbjahr, in dem die Kreditgeber das
     Unternehmen übernahmen.                                                 */
  it("weist einen Abgang nicht als unrealisierte Wertentwicklung aus", () => {
    let geprueft = 0;
    for (const seed of SEEDS) {
      // Partie Halbjahr für Halbjahr mitschreiben, um Stände vergleichen zu können
      const rng = createRng(seed);
      let state = baseState();
      const boot = bootstrapInitialDeals(rng, state.market, state.funds);
      state = { ...state, deals: boot.deals, landmark: boot.landmark };
      const snaps: Any[] = [state];
      for (let hy = 1; hy <= PERIODS; hy++) {
        const decisions = decideForHuman(state, hy, state.exitQueue[String(HUMAN_SLOT)]);
        state = runQuarter({ state, halfYear: hy, decisionsBySlot: { [HUMAN_SLOT]: decisions }, rng }).state;
        snaps.push(state);
      }
      for (let i = 1; i < snaps.length; i++) {
        const was = snaps[i - 1], now = snaps[i];
        for (let slot = 0; slot < now.funds.length; slot++) {
          const fNow = now.funds[slot] as Any, fWas = was.funds[slot] as Any;
          if (!(fNow.drawn > 0) || !(fWas.drawn > 0)) continue;
          if ((fNow.realized || []).length === (fWas.realized || []).length) continue;
          const bNow = fundBridge(fNow, now.market, i), bWas = fundBridge(fWas, was.market, i - 1);
          const step = fundBridgeStep(bNow, bWas)!;
          /* Die Verschiebung zwischen den beiden Blöcken darf die Spalte nicht
             aus der Balance bringen: Sie geht weiter exakt auf den Gewinn des
             Halbjahres auf. Genau das ginge verloren, wenn die Umgliederung
             nur aus einem der beiden Blöcke herausgerechnet würde. */
          expect(FUND_BRIDGE_PARTS.reduce((a: number, k: string) => a + (step[k] || 0), 0),
            `Seed ${seed}/HJ${i}/Fonds ${slot}: Summe der Posten`).toBeCloseTo(step.gain, 6);
          /* Und jeder Abgang bringt eine übernommene Kette mit — ohne sie
             fiele die Aufstellung auf die alte Spanne zurück und die
             Umgliederung stünde wieder in der Spalte. */
          for (const r of (fNow.realized as Any[]).slice((fWas.realized as Any[]).length)) {
            expect(r.uOut, `Seed ${seed}/HJ${i}/Fonds ${slot}: ${r.name} ohne übernommene Kette`)
              .toBeTruthy();
          }
          geprueft++;
        }
      }
    }
    expect(geprueft, "kein Abgang geprüft").toBeGreaterThan(10);
  });

  /* Der gemeldete Fall, ausbuchstabiert: eine Beteiligung, deren Wert über die
     Halteperiode aufgezehrt wurde, geht im Covenant Breach an die Kreditgeber.
     In diesem Halbjahr passiert wirtschaftlich nichts mehr — der Verlust ist
     längst eingetreten und stand Periode für Periode im unrealisierten Block.
     Vorher wies die Spalte ihn trotzdem aus: einmal positiv als "Unrealisiert"
     (die Beteiligung verlässt den Block), einmal negativ als "Realisiert". */
  it("zeigt beim Enforcement einer längst abgeschriebenen Beteiligung keine Bewegung", () => {
    const market: Record<string, number> = {};
    SECNAMES.forEach((s2) => (market[s2] = SECTORS[s2].m));
    const c: Any = {
      uid: "c1", name: "Testwerk", sector: "Industrials",
      revenue: 100, margin: 15, quality: 60, netDebt: 92, rate: 8.5,
      holdQ: 0, plat: 2, acc: 2, nwcFix: 0, nwcBal: 15,
      ceo: { skill: 2 }, cfo: { skill: 0 }, r3: { skill: 0 },
      initP: null, initA: null, onboard: 0, searches: [], done: [],
      st: 1, ltip: false, breach: 0, covLimit: COV_DEFAULT,
      capexPct: 6, nwcPct: 15, benchMargin: 17, benchCapex: 4, benchNwc: 15,
      drift: -4, marginDrift: -2.5, addonSize: 0.25, addonComp: 0,
      entryMult: 11, entryEbitda: 15, entryDebt: 92, entryEV: 165,
      entryEquity: 78, costTotal: 78, costLeft: 78, cashOut: 0, recapOut: 0, equityIn: 0, off: {},
      hist: [{ rev: 100, eb: 15, nd: 92, mg: 15, ql: 60, eq: 73, mult: 11, st: 1, out: 0, ei: 0 }],
    };
    const f: Any = {
      slot: 0, name: "F", isAi: false, attrs: { ...DEFAULT_HUMAN_ATTRS },
      cash: 0, proceeds: 0, investedTotal: 78, fees: 10, holdings: [c], realized: [],
      undrawn: 0, drawn: 90, recyc: 0, recycled: 0, distTotal: 0, accrued: 0,
      calls: [{ q: 1, amt: 90 }], dists: [],
    };
    const rng = createRng(4242);
    for (let k = 0; k < 6; k++) {
      stepCompany(rng, c, market, 2);
      c.hist = [...c.hist, { rev: c.revenue, eb: ebitdaOf(c), nd: c.netDebt, mg: c.margin, ql: c.quality,
        eq: navValueOf(c, market) + (c.cashOut || 0), st: 1, out: c.cashOut || 0,
        ei: c.equityIn || 0, fin: periodFin(c) }];
      resetPeriod(c);
    }
    const kette = bridgeChain(c.hist, liveHist(c, market));
    // Testaufbau: Der Wert muss aufgezehrt und die Kette deutlich negativ sein
    expect(navValueOf(c, market), "Testaufbau: NAV aufgezehrt").toBeLessThan(1);
    expect(kette.ebitda + kette.mult + kette.delev, "Testaufbau: Kette").toBeLessThan(-50);

    const was = fundBridge(f, market, 8);
    // Enforcement wie in runQuarter Abschnitt 3z
    f.realized = [{ name: c.name + " (Covenant Breach)", moic: dealMoic(c, 0),
      bridge: makeBridge(c, 0, 0), uOut: takeUnrealized(c, market, 0) }];
    f.holdings = [];
    const step = fundBridgeStep(fundBridge(f, market, 8), was)!;

    expect(Math.abs(step.uEbitda + step.uMult + step.uDelev + step.uRest), "unrealisiert")
      .toBeLessThan(0.5);
    expect(Math.abs(step.rEbitda + step.rMult + step.rDelev + step.rRest), "realisiert")
      .toBeLessThan(0.5);
    expect(Math.abs(step.gain), "Gewinn des Halbjahres").toBeLessThan(0.5);
  });

  /* Und die Gegenprobe zum ganzen Deal: Was eine total verlorene Beteiligung
     vernichtet hat, steht im realisierten Block — vollständig und an einer
     Stelle. Bis zum 17.09.2026 fiel der Restposten der Kettenzerlegung aus der
     Aufstellung heraus: Der realisierte Block wies −96,7 aus, obwohl der Deal
     76,3 vernichtet hatte, und "Transaktionskosten" stand bei +20,4 — ein
     Fonds, der alles verloren hatte, mit positiven Transaktionskosten. */
  it("zeigt den ganzen Verlust einer total verlorenen Beteiligung als realisiert", () => {
    const market: Record<string, number> = {};
    SECNAMES.forEach((s2) => (market[s2] = SECTORS[s2].m));
    const c: Any = {
      uid: "c1", name: "Testwerk", sector: "Industrials",
      revenue: 100, margin: 15, quality: 60, netDebt: 92, rate: 8.5,
      holdQ: 0, plat: 2, acc: 2, nwcFix: 0, nwcBal: 15,
      ceo: { skill: 2 }, cfo: { skill: 0 }, r3: { skill: 0 },
      initP: null, initA: null, onboard: 0, searches: [], done: [],
      st: 1, ltip: false, breach: 0, covLimit: COV_DEFAULT,
      capexPct: 6, nwcPct: 15, benchMargin: 17, benchCapex: 4, benchNwc: 15,
      drift: -4, marginDrift: -2.5, addonSize: 0.25, addonComp: 0,
      entryMult: 11, entryEbitda: 15, entryDebt: 92, entryEV: 165,
      entryEquity: 76.3, costTotal: 76.3, costLeft: 76.3, cashOut: 0, recapOut: 0, equityIn: 0, off: {},
      hist: [{ rev: 100, eb: 15, nd: 92, mg: 15, ql: 60, eq: 73, mult: 11, st: 1, out: 0, ei: 0 }],
    };
    const f: Any = {
      slot: 0, name: "F", isAi: false, attrs: { ...DEFAULT_HUMAN_ATTRS },
      cash: 0, proceeds: 0, investedTotal: 76.3, fees: 0, holdings: [c], realized: [],
      undrawn: 0, drawn: 76.3, recyc: 0, recycled: 0, distTotal: 0, accrued: 0,
      calls: [{ q: 1, amt: 76.3 }], dists: [],
    };
    const rng = createRng(4242);
    for (let k = 0; k < 8; k++) {
      stepCompany(rng, c, market, 2);
      c.hist = [...c.hist, { rev: c.revenue, eb: ebitdaOf(c), nd: c.netDebt, mg: c.margin, ql: c.quality,
        eq: navValueOf(c, market) + (c.cashOut || 0), st: 1, out: c.cashOut || 0,
        ei: c.equityIn || 0, fin: periodFin(c) }];
      resetPeriod(c);
    }
    const einstiegNav = c.hist[0].eq;
    expect(navValueOf(c, market), "Testaufbau: Totalverlust").toBeLessThan(0.01);

    // Enforcement ohne Erlös, wie in runQuarter Abschnitt 3z
    f.realized = [{ name: c.name + " (Covenant Breach)", moic: dealMoic(c, 0),
      bridge: makeBridge(c, 0, 0), uOut: takeUnrealized(c, market, 0) }];
    f.holdings = [];
    const b = fundBridge(f, market, 9);

    /* Der realisierte Block trägt die vernichtete Wertsubstanz vollständig:
       von der Einstiegsbewertung auf null. Die Einstiegsgebühr ist kein
       Wertbeitrag und steht unter Kosten — dort steht jede Gebühr. */
    const real = b.rEbitda + b.rMult + b.rDelev + b.rRest + b.rExit + b.recaps;
    expect(real, "realisierter Block").toBeCloseTo(-einstiegNav, 6);
    expect(b.uEbitda + b.uMult + b.uDelev + b.uRest, "nichts mehr unrealisiert").toBe(0);
    // Und kein positiver Restposten in einem Fonds, der alles verloren hat
    expect(b.txCost, "Transaktionskosten").toBeLessThanOrEqual(0);
    expect(b.txCost, "Transaktionskosten = Einstiegsgebühr")
      .toBeCloseTo(einstiegNav - c.costTotal, 6);
    // Die Aufstellung erklärt den Gewinn weiterhin vollständig
    expect(sumParts(b), "Posten erklären den Gewinn").toBeCloseTo(b.gain, 6);
    expect(b.gain, "ganzer Verlust").toBeCloseTo(-c.costTotal, 6);
  });

  /* Realisierter und unrealisierter Block beschreiben dieselbe Beteiligung mit
     derselben Zerlegung. Vorher rechnete der eine als Spanne (alles Wachstum
     zum Einstiegsmultiple), der andere als Kette — die Differenz verschwand
     still im Restposten "Transaktionskosten". */
  it("übernimmt beim Abgang genau die Kette, die im Portfolio stand", () => {
    const market: Record<string, number> = {};
    SECNAMES.forEach((s2) => (market[s2] = SECTORS[s2].m));
    const c: Any = {
      uid: "c1", name: "Testwerk", sector: "Industrials",
      revenue: 100, margin: 15, quality: 60, netDebt: 60, rate: 6.5,
      holdQ: 0, plat: 2, acc: 2, nwcFix: 0, nwcBal: 15,
      ceo: { skill: 4 }, cfo: { skill: 4 }, r3: { skill: 4 },
      initP: null, initA: null, onboard: 0, searches: [], done: [],
      st: 1, ltip: false, breach: 0, covLimit: COV_DEFAULT,
      capexPct: 4, nwcPct: 15, benchMargin: 14, benchCapex: 4, benchNwc: 15,
      drift: 1.5, marginDrift: 0, addonSize: 0.25, addonComp: 0,
      entryMult: 9, entryEbitda: 15, entryDebt: 60, entryEV: 135,
      entryEquity: 78, costTotal: 78, costLeft: 78, cashOut: 0, recapOut: 0, equityIn: 0, off: {},
      hist: [{ rev: 100, eb: 15, nd: 60, mg: 15, ql: 60, eq: 75, mult: 9, st: 1, out: 0, ei: 0 }],
    };
    const rng = createRng(4242);
    for (let k = 0; k < 6; k++) {
      stepCompany(rng, c, market, 3);
      c.hist = [...c.hist, { rev: c.revenue, eb: ebitdaOf(c), nd: c.netDebt, mg: c.margin, ql: c.quality,
        eq: navValueOf(c, market) + (c.cashOut || 0), st: 1, out: c.cashOut || 0,
        ei: c.equityIn || 0, fin: periodFin(c) }];
      resetPeriod(c);
    }
    const kette = bridgeChain(c.hist, liveHist(c, market));
    const nav = navValueOf(c, market);
    const net = nav * 0.9;                       // Abschlag gegenüber der Bewertung
    const u = takeUnrealized(c, market, net);
    expect(u.ebitda, "EBITDA").toBeCloseTo(kette.ebitda, 9);
    expect(u.mult, "Multiple").toBeCloseTo(kette.mult, 9);
    expect(u.delev, "Entschuldung").toBeCloseTo(kette.delev, 9);
    // Neu am Abgang ist nur der Erlös gegen die letzte Bewertung
    expect(u.exit, "Exit gegen letzte Bewertung").toBeCloseTo(net - nav, 9);

    const f: Any = {
      slot: 0, name: "F", isAi: false, attrs: { ...DEFAULT_HUMAN_ATTRS },
      cash: 0, proceeds: 0, investedTotal: 78, fees: 0, holdings: [],
      realized: [{ name: c.name, moic: dealMoic(c, net), bridge: makeBridge(c, nav, net), uOut: u }],
      undrawn: 0, drawn: 90, recyc: 0, recycled: 0, distTotal: net, accrued: 0,
      calls: [{ q: 1, amt: 90 }], dists: [{ q: 8, amt: net }],
    };
    const b = fundBridge(f, market, 8);
    expect(b.rEbitda, "realisiert EBITDA").toBeCloseTo(kette.ebitda, 9);
    expect(b.uEbitda + b.uMult + b.uDelev, "nichts mehr unrealisiert").toBe(0);
  });
});
