import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  CAPITAL, DEFAULT_HUMAN_ATTRS, ARCHES, INVEST_PERIOD, LEGACY_COMPAT, PERIODS, SECNAMES, SECTORS, dpiOf, tvpiOf,
} from "../engine";
import type { EngineCompat } from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import type { ExitStartIntent, OfferDecisionIntent, RuntimeFund, RuntimeState } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Verwendung der Erlöse aus einem Verkaufsprozess. Die Spielansicht fragt nach
   dem Annehmen UND nach dem Nachverhandeln, welcher Anteil im Fonds bleibt,
   und schickt ihn als keepPct mit — zusammen mit dem Gebot, das angeklickt
   war. Ob der Regler überhaupt erscheint, entscheidet sie mit demselben
   Halbjahr, mit dem hier verbucht wird. Diese drei Zusagen hält der Server. */

function fund(slot: number, isAi: boolean, archetype: string | null): RuntimeFund {
  const a = archetype ? ARCHES.find((z) => z.key === archetype)! : null;
  return {
    slot, profileId: isAi ? null : "p" + slot, isAi, archetype,
    name: isAi ? (a as Any).name : "Fonds " + slot,
    attrs: isAi ? (a as Any).attrs : { ...DEFAULT_HUMAN_ATTRS },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  } as Any;
}

/* Ein Fonds mit genau einer Beteiligung und zwei offenen Geboten darauf, ohne
   Vollzugsrisiko — damit jede Entscheidung auch wirklich zum Verkauf führt. */
function mitGeboten() {
  const rng = createRng(20261018);
  const market: Record<string, number> = {};
  SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));
  let state: RuntimeState = {
    market, funds: [fund(0, false, null), ...["sourcing", "ops", "fin"].map((k, i) => fund(i + 1, true, k))],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
  const boot = bootstrapInitialDeals(rng, state.market, state.funds);
  state = { ...state, deals: boot.deals, landmark: boot.landmark };
  const d = (state.deals as Any[])[0];
  state = runQuarter({
    state, halfYear: 1, rng,
    decisionsBySlot: { 0: { bids: [{ dealId: d.id, multiple: d.askMult * 1.15, leverage: d.levCap * 0.8 }] } },
  }).state;
  const c = (state.funds[0].holdings as Any[])[0];
  expect(c).toBeTruthy();
  const offers = [
    { buyer: "Bieter A", price: c.entryEquity * 1.6, risk: 0, note: "" },
    { buyer: "Bieter B", price: c.entryEquity * 1.8, risk: 0, note: "" },
  ];
  state = { ...state, exitQueue: { 0: [{ holdingUid: c.uid, name: c.name, offers }] } };
  return { state, rng, uid: c.uid as string };
}

function entscheide(halfYear: number, dec: Omit<OfferDecisionIntent, "holdingUid">, compat?: EngineCompat) {
  const { state, rng, uid } = mitGeboten();
  const vor = state.funds[0] as Any;
  const out = runQuarter({ state, halfYear, rng, compat,
    decisionsBySlot: { 0: { offerDecisions: [{ holdingUid: uid, ...dec }] } } });
  const nach = out.state.funds[0] as Any;
  const exit = out.state.feed.find((e) => e.slot === 0 && e.text.startsWith("Exit "));
  return {
    verkauft: !(nach.holdings as Any[]).some((h) => h.uid === uid),
    erloes: nach.proceeds - vor.proceeds,
    einbehalten: nach.recycled - vor.recycled,
    exit: exit?.text ?? "",
  };
}

describe("Verwendung der Erlöse aus einem Verkaufsprozess", () => {
  it("behält beim Annehmen genau den gewählten Anteil ein", () => {
    const r = entscheide(3, { choice: "accept", offerIndex: 1, keepPct: 0.4 });
    expect(r.verkauft).toBe(true);
    expect(r.exit).toContain("an Bieter B");
    expect(r.einbehalten / r.erloes).toBeCloseTo(0.4, 6);
  });

  it("übernimmt den Anteil auch beim Nachverhandeln und verhandelt das angeklickte Gebot", () => {
    const r = entscheide(3, { choice: "reneg", offerIndex: 1, keepPct: 0.5 });
    expect(r.verkauft).toBe(true);
    expect(r.einbehalten / r.erloes).toBeCloseTo(0.5, 6);
    // Verhandelt wurde Gebot B: Entweder geht der Verkauf an B, oder B ist
    // abgesprungen und A kommt zum Zug — nie umgekehrt.
    expect(r.exit.includes("an Bieter B") || r.exit.includes("Bieter B ist abgesprungen")).toBe(true);
  });

  /* Bis zum 18.10.2026 endete das Recycling mit der Investitionsperiode.
     Seitdem gilt nur noch die Obergrenze in Höhe des Commitments; alte
     Halbjahre rechnet die Wiederholung nach der alten Regel nach. */
  it("recycelt auch nach der Investitionsperiode", () => {
    const spaet = entscheide(INVEST_PERIOD + 5, { choice: "accept", offerIndex: 0, keepPct: 1 });
    expect(spaet.verkauft).toBe(true);
    expect(spaet.einbehalten).toBeCloseTo(spaet.erloes, 6);
  });

  /* Wer im letzten Halbjahr einbehält, kann nicht mehr investieren. Die
     Endabrechnung schüttet das Einbehaltene deshalb aus: Der DPI erreicht den
     TVPI, und im Fonds bleibt nichts liegen. */
  it("schüttet am Laufzeitende aus, was einbehalten und nicht mehr investiert wurde", () => {
    const { state, rng, uid } = mitGeboten();
    const out = runQuarter({ state, halfYear: PERIODS, rng,
      decisionsBySlot: { 0: { offerDecisions: [{ holdingUid: uid, choice: "accept", offerIndex: 0, keepPct: 1 }] } } });
    const f = out.state.funds[0] as Any;
    expect(f.recycled).toBeGreaterThan(0.5);
    expect(f.recyc).toBe(0);
    expect(f.holdings.length).toBe(0);
    expect(dpiOf(f, out.state.market, PERIODS)).toBeCloseTo(tvpiOf(f, out.state.market, PERIODS), 6);
  });

  it("rechnet alte Halbjahre mit dem Ende der Investitionsperiode nach", () => {
    const drin = entscheide(INVEST_PERIOD, { choice: "accept", offerIndex: 0, keepPct: 1 }, LEGACY_COMPAT);
    expect(drin.einbehalten).toBeGreaterThan(0.5);
    const danach = entscheide(INVEST_PERIOD + 1, { choice: "accept", offerIndex: 0, keepPct: 1 }, LEGACY_COMPAT);
    expect(danach.verkauft).toBe(true);
    expect(danach.einbehalten).toBe(0);
  });
});

/* Nach einem abgebrochenen Prozess ist die Beteiligung für den nächsten
   Prozess gesperrt — ein bilateraler Verkauf bleibt möglich. Bis zum
   18.10.2026 verwarf der Server während der Sperre jeden Exit; die
   Wiederholung alter Halbjahre rechnet weiter so (LEGACY_COMPAT). */
describe("Sperre nach abgebrochenem Verkaufsprozess", () => {
  function nachAbbruch(action: ExitStartIntent["action"], compat?: EngineCompat) {
    const { state, rng, uid } = mitGeboten();
    const s1 = runQuarter({ state, halfYear: 3, rng,
      decisionsBySlot: { 0: { offerDecisions: [{ holdingUid: uid, choice: "abort" }] } } }).state;
    const gesperrt = (s1.funds[0].holdings as Any[]).find((h) => h.uid === uid);
    const s2 = runQuarter({ state: s1, halfYear: 4, rng, compat,
      decisionsBySlot: { 0: { exitStarts: [{ holdingUid: uid, action, keepPct: 0 } as ExitStartIntent] } } }).state;
    const h = (s2.funds[0].holdings as Any[]).find((x) => x.uid === uid);
    return { block: gesperrt?.block, verkauft: !h, imProzess: !!h?.proc };
  }

  it("lässt den bilateralen Verkauf während der Sperre zu", () => {
    const r = nachAbbruch("bilateral");
    expect(r.block).toBe(5);
    expect(r.verkauft).toBe(true);
  });

  it("sperrt den nächsten Verkaufsprozess weiterhin", () => {
    const r = nachAbbruch("process");
    expect(r.verkauft).toBe(false);
    expect(r.imProzess).toBe(false);
  });

  it("rechnet alte Halbjahre nach dem alten Regelstand nach", () => {
    expect(nachAbbruch("bilateral", LEGACY_COMPAT).verkauft).toBe(false);
  });
});
