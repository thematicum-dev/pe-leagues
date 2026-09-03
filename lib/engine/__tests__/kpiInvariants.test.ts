import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  SECTORS, SECNAMES, ARCHES, CAPITAL, PERIODS, DEFAULT_HUMAN_ATTRS, INVEST_PERIOD,
  fundBridge, fundBridgeStep, FUND_BRIDGE_PARTS, FUND_BRIDGE_GROUPS, bridgeStep,
  tvpiOf, dpiOf, irrOf, scoreOf, cashflowsOf, navOf, totalValueOf, carryOf,
  eqvOf, markMultiple,
  IRR_FLOOR, IRR_CAP, TVPI_BENCH, IRR_BENCH, clamp,
} from "../engine";
import { runQuarter, bootstrapInitialDeals, computeFinalRanking } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Breiter Kennzahlentest: dieselben Invarianten über viele Partien und über
   Spielweisen, die bewusst in die Randfälle laufen — ein Fonds, der nie kauft;
   einer, der maximal verschuldet und reihenweise in den Covenant Breach läuft;
   einer, der so gering verschuldet, dass Beteiligungen in Nettoliquidität
   geraten und ausschütten; einer, der über Teilexits und Börsengänge
   aussteigt; einer, der Erlöse einbehält und wieder investiert.

   Geprüft wird nicht ein Sollwert, sondern der Zusammenhang der Kennzahlen
   untereinander. Genau dort lagen die Fehler dieser Reihe: Die Value Bridge
   wies einen Gewinn aus, während der TVPI einen Verlust zeigte, und der IRR
   sprang auf seine Untergrenze, obwohl der Fonds Geld verdient hatte. */

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

type Style = "passiv" | "maxLev" | "minLev" | "teilexit" | "recycling" | "halten";
const STYLES: Style[] = ["passiv", "maxLev", "minLev", "teilexit", "recycling", "halten"];

function decide(style: Style, state: RuntimeState, hy: number, queue: Any): TurnDecisions {
  const me = state.funds[0];
  const holdings = me.holdings as Any[];
  const d: TurnDecisions = {};
  if (style === "passiv") return d;          // kauft nie: nur Gebühren, TVPI gegen 0

  if (holdings.length < 6 && state.deals.length) {
    const x = state.deals[0] as Any;
    const lev = style === "maxLev" ? x.levCap : style === "minLev" ? 1.2 : x.levCap * 0.8;
    d.bids = [{ dealId: x.id, multiple: x.askMult * (style === "maxLev" ? 1.06 : 1.0), leverage: lev }];
    if (style !== "maxLev") d.dueDiligence = [x.id];
  }
  const free = holdings.find((h) => !h.initP);
  if (free) d.initiatives = [{ holdingUid: free.uid, dim: "plat", id: style === "maxLev" ? "ma" : "opex" }];
  if (queue && queue.length) {
    d.offerDecisions = queue.map((it: Any) => ({ holdingUid: it.holdingUid, choice: "accept" as const, offerIndex: 0 }));
  }
  if (style === "halten") return d;          // verkauft nie: alles läuft in die Tail-End-Verwertung

  const mature = holdings.filter((h) => h.holdQ >= 6 && !h.proc && !h.lockUntil && !h.cv);
  if (mature.length) {
    const action = style === "teilexit"
      ? (hy % 3 === 0 ? "cv" : hy % 3 === 1 ? "ipo" : "process")
      : (hy % 2 === 0 ? "bilateral" : "process");
    const keepPct = style === "recycling" && hy <= INVEST_PERIOD ? 0.9 : 0;
    d.exitStarts = [{ holdingUid: mature[0].uid, action, keepPct } as Any];
  }
  return d;
}

function play(seed: number, style: Style, until = PERIODS) {
  const rng = createRng(seed);
  let state = baseState();
  const { deals, landmark } = bootstrapInitialDeals(rng, state.market, state.funds);
  state = { ...state, deals, landmark };
  const snaps: { state: RuntimeState; hy: number }[] = [];
  for (let hy = 1; hy <= until; hy++) {
    const decisions = decide(style, state, hy, state.exitQueue["0"]);
    state = runQuarter({ state, halfYear: hy, decisionsBySlot: { 0: decisions }, rng } as Any).state;
    snaps.push({ state, hy });
  }
  return snaps;
}

const SEEDS = [1, 7, 4242, 20260817, 99991, 314159, 2718281];
const finite = (v: number) => Number.isFinite(v);

/* Alle Kennzahlen eines Standes gegeneinander. Wird für jeden Fonds jedes
   geprüften Halbjahres aufgerufen — Anfang, Mitte und Ende der Laufzeit. */
function checkFund(f: Any, market: Any, hy: number, where: string) {
  const b = fundBridge(f, market, hy);
  const tvpi = tvpiOf(f, market, hy);
  const dpi = dpiOf(f, market, hy);
  const irr = irrOf(f, market, hy);
  const score = scoreOf(f, market, hy);

  for (const [n, v] of [["tvpi", tvpi], ["dpi", dpi], ["irr", irr], ["score", score],
    ["gain", b.gain], ["drawn", b.drawn], ["value", b.value], ["nav", navOf(f, market)]] as [string, number][]) {
    expect(finite(v), `${where}: ${n} ist ${v}`).toBe(true);
  }

  // 1 — Die Posten erklären den Gewinn vollständig, und die Gruppen ebenso
  expect(FUND_BRIDGE_PARTS.reduce((s, k) => s + b[k], 0), `${where}: Posten`).toBeCloseTo(b.gain, 6);
  expect(FUND_BRIDGE_GROUPS.reduce((s, g) => s + g.parts.reduce((a: number, k: string) => a + b[k], 0), 0),
    `${where}: Gruppen`).toBeCloseTo(b.gain, 6);

  // 2 — Überleitung auf den TVPI
  expect(b.drawn + b.gain, `${where}: Überleitung`).toBeCloseTo(b.value, 6);
  expect(b.tvpi, `${where}: TVPI`).toBeCloseTo(tvpi, 9);
  // gain = drawn · (TVPI − 1) gilt, sobald überhaupt Kapital abgerufen wurde
  if (b.drawn > 0) expect(b.gain / b.drawn, `${where}: Gewinn je Euro`).toBeCloseTo(tvpi - 1, 9);

  // 3 — Der Barwert der Zahlungsreihe bei Zins null ist derselbe Gewinn
  const cf = cashflowsOf(f, market, hy);
  expect(cf.reduce((s: number, p: Any) => s + p.v, 0), `${where}: Barwert(0)`).toBeCloseTo(b.gain, 6);

  // 4 — IRR: echte Nullstelle, im Suchbereich, Vorzeichen wie TVPI − 1
  expect(irr, `${where}: IRR ≥ Boden`).toBeGreaterThanOrEqual(IRR_FLOOR);
  expect(irr, `${where}: IRR ≤ Deckel`).toBeLessThanOrEqual(IRR_CAP);
  /* Ohne einen einzigen Abruf gibt es weder Zahlungsreihe noch Rendite: Der
     IRR ist dann nicht definiert (irrOf liefert 0), und der TVPI ist ein
     Artefakt der Untergrenze in drawnOf(). Die Vorzeichenregel gilt erst,
     sobald Kapital geflossen ist. */
  const hasFlows = b.drawn > 0;
  if (hasFlows && hy >= 2 && irr > IRR_FLOOR && irr < IRR_CAP) {
    const npv = cf.reduce((s: number, p: Any) => s + p.v / Math.pow(1 + irr, p.t), 0);
    expect(npv, `${where}: Barwert(IRR)`).toBeCloseTo(0, 4);
    expect(Math.sign(irr), `${where}: Vorzeichen IRR vs TVPI ${tvpi.toFixed(3)}`)
      .toBe(Math.sign(Math.round((tvpi - 1) * 1e9)));
  }
  /* Boden und Deckel sind keine Ausnahme von der Vorzeichenregel, sondern ihr
     Randfall — sonst bliebe genau der Fehler unentdeckt, der einen Fonds mit
     1,44× auf −95 % setzte. */
  if (hasFlows && hy >= 2 && irr <= IRR_FLOOR + 1e-12) {
    expect(tvpi, `${where}: IRR am Boden, aber TVPI ${tvpi.toFixed(3)}`).toBeLessThan(1);
  }
  if (hasFlows && hy >= 2 && irr >= IRR_CAP - 1e-12) {
    expect(tvpi, `${where}: IRR am Deckel, aber TVPI ${tvpi.toFixed(3)}`).toBeGreaterThan(1);
  }

  // 5 — DPI ist der ausgeschüttete Teil des TVPI
  expect(dpi, `${where}: DPI ≤ TVPI`).toBeLessThanOrEqual(tvpi + 1e-9);
  expect(dpi, `${where}: DPI ≥ 0`).toBeGreaterThanOrEqual(0);

  // 6 — Die Wertung ist genau die halbe Summe der beiden normierten Kennzahlen
  expect(score, `${where}: Wertung`).toBeCloseTo(
    0.5 * clamp(tvpi / TVPI_BENCH, -1, 4) + 0.5 * clamp(irr / IRR_BENCH, -1, 4), 9);

  // 7 — Das Commitment ist eine harte Grenze
  expect(f.drawn, `${where}: Abruf über Commitment`).toBeLessThanOrEqual(CAPITAL + 1e-6);
  expect(navOf(f, market), `${where}: NAV ≥ 0`).toBeGreaterThanOrEqual(0);
  expect(carryOf(f, market, hy), `${where}: Carry ≥ 0`).toBeGreaterThanOrEqual(0);
  expect(totalValueOf(f, market), `${where}: Gesamtwert ≥ 0`).toBeGreaterThanOrEqual(0);

  // 8 — Jeder realisierte Deal trägt seine Zerlegung
  for (const r of (f.realized || []) as Any[]) {
    expect(r.bridge, `${where}: ${r.name} ohne Zerlegung`).toBeTruthy();
  }

  /* 8b — Die unrealisierten Treiber ergeben zusammen genau den heutigen
     Eigenkapitalwert des Portfolios abzüglich des anteilig fortgeschriebenen
     Einstiegswerts. Diese Probe hängt nicht am Restposten: Ein Fehler in der
     Anteilsskalierung verschöbe sich sonst still nach "Transaktionskosten"
     und bliebe unbemerkt. Gerechnet ohne die Nullgrenze von navValueOf(),
     weil die Treiber sie auch nicht kennen. */
  const open = ((f.holdings || []) as Any[]).filter((c) => (c.hist || []).length >= 1);
  const openNow = open.reduce((s: number, c: Any) => s + eqvOf(c, markMultiple(c, market)), 0);
  const openBase = open.reduce((s: number, c: Any) => s + c.hist[0].eq * (c.st ?? 1), 0);
  expect(b.uEbitda + b.uMult + b.uDelev, `${where}: unrealisierte Treiber`)
    .toBeCloseTo(openNow - openBase, 6);

  // 9 — Jede gehaltene Beteiligung ist vollständig zerlegbar
  for (const c of (f.holdings || []) as Any[]) {
    const h = c.hist || [];
    if (h.length < 2) continue;
    const st = bridgeStep(h[0], h[h.length - 1])!;
    expect(st.ebitda + st.mult + st.delev + st.dist + st.rest, `${where}: ${c.name}`)
      .toBeCloseTo(st.total, 6);
    expect(st.total, `${where}: ${c.name} Gesamtwert`).toBeCloseTo(h[h.length - 1].eq - h[0].eq, 6);
  }
}

describe("Kennzahlen über viele Partien und Spielweisen", () => {
  for (const style of STYLES) {
    it(`bleiben in sich stimmig — Spielweise "${style}"`, () => {
      for (const seed of SEEDS) {
        const snaps = play(seed, style);
        // Anfang, Mitte, Ende: der IRR-Sonderfall der ersten Halbjahre, der
        // laufende Betrieb, und der Schlussstand nach der Verwertung
        for (const hy of [1, 2, 3, 8, 14, PERIODS]) {
          const snap = snaps[hy - 1];
          for (const f of snap.state.funds) {
            checkFund(f as Any, snap.state.market, hy, `${style}/${seed}/HJ${hy}/${f.name}`);
          }
        }
      }
    });
  }

  it("zerlegt jedes einzelne Halbjahr vollständig, über die ganze Laufzeit", () => {
    for (const style of STYLES) {
      for (const seed of [7, 4242]) {
        const snaps = play(seed, style);
        for (let i = 1; i < snaps.length; i++) {
          for (const f of snaps[i].state.funds) {
            const was = snaps[i - 1].state.funds.find((z) => z.slot === f.slot)!;
            const step = fundBridgeStep(
              fundBridge(f as Any, snaps[i].state.market, snaps[i].hy),
              fundBridge(was as Any, snaps[i - 1].state.market, snaps[i - 1].hy),
            )!;
            const where = `${style}/${seed}/HJ${snaps[i].hy}/${f.name}`;
            expect(FUND_BRIDGE_PARTS.reduce((s, k) => s + step[k], 0), where).toBeCloseTo(step.gain, 6);
            expect(step.drawn + step.gain, where).toBeCloseTo(step.value, 6);
          }
        }
      }
    }
  });

  it("verwertet am Laufzeitende restlos", () => {
    for (const style of STYLES) {
      for (const seed of SEEDS) {
        const end = play(seed, style)[PERIODS - 1].state;
        for (const f of end.funds) {
          const b = fundBridge(f as Any, end.market, PERIODS);
          const where = `${style}/${seed}/${f.name}`;
          expect(b.openCount, where).toBe(0);
          expect(navOf(f as Any, end.market), where).toBe(0);
          // Ohne Portfolio gibt es keine unrealisierte Wertentwicklung mehr
          expect(b.uEbitda + b.uMult + b.uDelev, where).toBe(0);
          // …und der Gesamtwert ist dann reine Ausschüttung
          expect(dpiOf(f as Any, end.market, PERIODS), where)
            .toBeCloseTo(tvpiOf(f as Any, end.market, PERIODS), 6);
        }
      }
    }
  });

  it("bewertet einen Fonds ohne einen einzigen Kauf konsistent", () => {
    for (const seed of SEEDS) {
      const end = play(seed, "passiv")[PERIODS - 1].state;
      const f = end.funds[0] as Any;
      expect(f.holdings.length).toBe(0);
      expect(f.realized.length).toBe(0);
      const b = fundBridge(f, end.market, PERIODS);
      // Der Verlust ist genau die Management Fee, alles andere ist null
      expect(b.gain).toBeCloseTo(b.fees, 6);
      expect(b.gain).toBeLessThan(0);
      expect(tvpiOf(f, end.market, PERIODS)).toBeLessThan(1);
      expect(irrOf(f, end.market, PERIODS)).toBeLessThan(0);
    }
  });

  /* Gebaute Randfälle: Was eine gespielte Partie nur selten trifft — ein Carry
     über der Hurdle, ein Fonds ohne jeden Abruf, aufgelaufene Gebühren nach
     Totalverlust — lässt sich als Zustand hinschreiben. */
  it("hält die Zusammenhänge auch in gebauten Randfällen", () => {
    const market: Record<string, number> = {};
    SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
    const stub = (over: Partial<Any>): Any => ({
      slot: 0, isAi: false, name: "Rand", holdings: [], realized: [], fees: 0,
      drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [], ...over,
    });
    const cases: [string, Any, number][] = [
      ["ohne jeden Abruf", stub({}), PERIODS],
      ["weit über der Hurdle (Carry fällt an)", stub({
        drawn: 100, fees: 10, calls: [{ q: 1, amt: 100 }], dists: [{ q: 4, amt: 400 }], distTotal: 400,
      }), PERIODS],
      ["Totalverlust mit aufgelaufenen Gebühren", stub({
        drawn: 200, fees: 30, accrued: 12, calls: [{ q: 1, amt: 200 }],
      }), PERIODS],
      ["erst ein Halbjahr gelaufen", stub({
        drawn: 60, fees: 5, calls: [{ q: 1, amt: 60 }],
      }), 1],
      ["alles im selben Halbjahr zurück", stub({
        drawn: 80, fees: 4, calls: [{ q: 2, amt: 80 }], dists: [{ q: 2, amt: 80 }], distTotal: 80,
      }), 4],
    ];
    for (const [label, f, hy] of cases) {
      checkFund(f, market, hy, `Randfall: ${label}`);
    }
    // Der Fonds über der Hurdle zahlt tatsächlich Carry, sonst prüft der Fall nichts
    expect(carryOf(cases[1][1], market, PERIODS)).toBeGreaterThan(0);
    // Ohne Abruf bleibt der TVPI definiert (drawnOf hat eine Untergrenze)
    expect(Number.isFinite(tvpiOf(cases[0][1], market, PERIODS))).toBe(true);
    // Vor dem zweiten Halbjahr gibt es noch keinen IRR
    expect(irrOf(cases[3][1], market, 1)).toBe(0);
  });

  it("liefert für jede Partie eine vollständige Endrangliste", () => {
    for (const style of STYLES) {
      for (const seed of [1, 4242]) {
        const end = play(seed, style)[PERIODS - 1].state;
        const rank = computeFinalRanking(end, PERIODS);
        expect(rank.length).toBe(5);
        for (const r of rank) {
          expect(Number.isFinite(r.tvpi) && Number.isFinite(r.irr) && Number.isFinite(r.score)).toBe(true);
        }
        for (let i = 1; i < rank.length; i++) expect(rank[i - 1].score).toBeGreaterThanOrEqual(rank[i].score);
      }
    }
  });
});
