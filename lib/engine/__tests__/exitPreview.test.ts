import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  ARCHES, BIL_DISC, CAPITAL, CV_DISC, CV_STAKE, DEFAULT_HUMAN_ATTRS, IPO_DISC, IPO_PLACE,
  LIQ_DISC, PERIODS, SECNAMES, SECTORS, END_PRESSURE_FROM,
  dealMultiple, ebitdaOf, endPressure, eqvOf, exitMultiples, markMultiple,
} from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import type { RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const market: Record<string, number> = {};
SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));

function platform(over: Any = {}): Any {
  return {
    uid: "p", name: "Musterwerk", sector: "Industrials",
    revenue: 100, margin: 15, quality: 60, netDebt: 30, rate: 6,
    holdQ: 6, plat: 2, acc: 2, nwcFix: 0, st: 1, drift: 0, marginDrift: 0,
    entryEquity: 60, costTotal: 60, costLeft: 60, entryQ: 0, hist: [],
    ...over,
  };
}

/* Die Exit-Vorschau zeigt eine Kette von Multiples. Sie war zweimal
   ausgeschrieben — in der Partie und im Übungsmodus — und wich an zwei
   Stellen von der Auswertung ab:

   - Die Zeile "Verhandlungsprämie +X %" zeigte den fertigen dealMultiple(),
     in dem neben der Prämie auch der Endfälligkeitsdruck steckt. Kurz vor
     Laufzeitende zog eine Zeile mit "+" das Multiple deshalb nach unten, und
     darunter stand dieselbe Zahl noch einmal als Exit-Multiple.
   - Der Börsengang rechnete mit dem blanken Bewertungsmultiple, während die
     Auswertung ihn über fairOf(c, mk, 0, q) abrechnet — mit
     Endfälligkeitsdruck.

   exitMultiples() ist jetzt die eine Quelle. Diese Tests halten fest, dass
   ihre Zerlegung aufgeht UND dass ihr Ergebnis das Multiple ist, mit dem
   runQuarter tatsächlich abrechnet.                                        */
describe("Zerlegung der Exit-Multiples", () => {
  const c = platform();
  const q = 6;   // weit vor dem Laufzeitende: kein Endfälligkeitsdruck

  it("geht Schritt für Schritt auf", () => {
    (["bil", "cv", "ipo", "proc"] as const).forEach((ch) => {
      const M = exitMultiples(c, market, 3, q, ch);
      expect(M.mark).toBeCloseTo(markMultiple(c, market), 9);
      expect(M.negMult).toBeCloseTo(M.mark * (1 + 0.02 * M.negUsed), 9);
      expect(M.exit, ch).toBeCloseTo(Math.max(2, M.negMult - M.press) - M.bilDisc, 9);
    });
  });

  it("zählt Verhandlungsgeschick überall außer beim Börsengang", () => {
    expect(exitMultiples(c, market, 3, q, "proc").negUsed).toBe(3);
    expect(exitMultiples(c, market, 3, q, "bil").negUsed).toBe(3);
    expect(exitMultiples(c, market, 3, q, "cv").negUsed).toBe(3);
    expect(exitMultiples(c, market, 3, q, "ipo").negUsed, "am Kapitalmarkt zählt es nicht").toBe(0);
  });

  it("trägt den Endfälligkeitsdruck auch in den Börsengang", () => {
    const spaet = PERIODS - 1;   // ein Halbjahr vor Schluss
    const press = endPressure(spaet);
    expect(press, "Testaufbau: hier muss Druck herrschen").toBeGreaterThan(0.5);
    const M = exitMultiples(c, market, 3, spaet, "ipo");
    expect(M.press).toBeCloseTo(press, 9);
    expect(M.exit, "der Börsengang ignorierte den Zeitdruck")
      .toBeCloseTo(Math.max(2, markMultiple(c, market) - press), 9);
    // Genau das, was die Auswertung rechnet: fairOf(c, mk, 0, q)
    expect(M.exit).toBeCloseTo(dealMultiple(c, market, 0, spaet), 9);
  });

  it("weist den Abschlag nur dem bilateralen Verkauf zu", () => {
    expect(exitMultiples(c, market, 3, q, "bil").bilDisc).toBe(BIL_DISC);
    (["cv", "ipo", "proc"] as const).forEach((ch) => {
      expect(exitMultiples(c, market, 3, q, ch).bilDisc, ch).toBe(0);
    });
  });

  it("zeigt kurz vor Schluss ein niedrigeres Exit- als Bewertungsmultiple", () => {
    /* Der Fall aus der Testpartie: Prämie hebt, Zeitdruck senkt, und unterm
       Strich steht weniger als das Bewertungsmultiple. Genau deshalb braucht
       die Zeile "+X %" eine eigene Zahl — sonst sieht der Rechenweg aus wie
       ein Vorzeichenfehler.                                                */
    const spaet = PERIODS - 1;
    const M = exitMultiples(c, market, 2, spaet, "proc");
    expect(M.negMult, "die Prämie hebt").toBeGreaterThan(M.mark);
    expect(M.exit, "der Zeitdruck senkt unter das Bewertungsmultiple").toBeLessThan(M.mark);
    expect(M.press).toBeCloseTo(LIQ_DISC * (END_PRESSURE_FROM - 1) / END_PRESSURE_FROM, 9);
  });
});

/* ---------------------------------------------------------------- */

/* Und die Gegenprobe gegen die Auswertung: Was die Vorschau ankündigt, muss
   der Exit auch zahlen. Gespielt wird bis kurz vor Laufzeitende, damit der
   Endfälligkeitsdruck greift — dort lagen Vorschau und Auswertung
   auseinander.                                                             */
describe("Vorschau und Auswertung zahlen dasselbe", () => {
  function initialFund(slot: number, isAi: boolean, archetype: string | null) {
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
    const m: Record<string, number> = {};
    SECNAMES.forEach((s) => (m[s] = SECTORS[s].m));
    return {
      market: m,
      funds: [initialFund(0, false, null), ...["sourcing", "ops", "fin", "all"].map((k, i) => initialFund(i + 1, true, k))],
      feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
    };
  }

  /* Kauft früh, hält bis `bis`, und gibt Fonds und Marktstand zurück. */
  function gehalten(seed: number, bis: number) {
    const rng = createRng(seed);
    let state = baseState();
    const boot = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals: boot.deals, landmark: boot.landmark };
    for (let hy = 1; hy <= bis; hy++) {
      const me = state.funds[0] as Any;
      const d: TurnDecisions = {};
      if (!(me.holdings as Any[]).length && state.deals.length) {
        const deal = (state.deals as Any[])[0];
        d.bids = [{ dealId: deal.id, multiple: deal.askMult * 1.3, leverage: Math.min(deal.levCap, 1.5) }];
        d.dueDiligence = [deal.id];
      }
      state = runQuarter({ state, halfYear: hy, decisionsBySlot: { 0: d }, rng } as Any).state;
    }
    return state;
  }

  function exitAt(state: RuntimeState, hy: number, action: "bilateral" | "cv" | "ipo") {
    const me = state.funds[0] as Any;
    const c = (me.holdings as Any[])[0];
    const rng = createRng(31337);
    const out = runQuarter({
      state, halfYear: hy, rng,
      decisionsBySlot: { 0: { exitStarts: [{ holdingUid: c.uid, action } as Any] } },
    } as Any);
    return out;
  }

  /* Der Bruttoerlös steht im Marktbericht, mit dem er gemeldet wird. Statt
     ihn dort herauszulesen, wird er hier aus der Zerlegung gerechnet und
     gegen den Kostenabgang des Fonds geprüft — über den Nettoerlös. */
  const SEED = 20260918;

  it("zahlt beim Börsengang das Multiple der Vorschau, nicht das Bewertungsmultiple", () => {
    const hy = PERIODS - 1;
    const state = gehalten(SEED, hy - 1);
    const me = state.funds[0] as Any;
    const c = (me.holdings as Any[])[0];
    expect(c, "Testaufbau: eine Beteiligung wird gebraucht").toBeTruthy();

    const M = exitMultiples(c, state.market, me.attrs.negotiation, hy, "ipo");
    expect(M.press, "Testaufbau: hier muss Endfälligkeitsdruck herrschen").toBeGreaterThan(0.5);
    const erwartet = Math.max(0, eqvOf(c, M.exit)) * IPO_PLACE * IPO_DISC;
    // Das alte Verhalten der Vorschau — sichtbar mehr, und nie gezahlt
    const altVorschau = Math.max(0, eqvOf(c, markMultiple(c, state.market))) * IPO_PLACE * IPO_DISC;
    expect(altVorschau, "Testaufbau: die alte Vorschau lag höher").toBeGreaterThan(erwartet + 1);

    const out = exitAt(state, hy, "ipo");
    const nachher = (out.state.funds as Any[])[0];
    const real = (nachher.realized as Any[]).find((r) => String(r.name).includes("IPO"))!;
    expect(real, "kein Börsengang abgerechnet").toBeTruthy();
    // MOIC × verkaufte Kostenbasis = Nettoerlös; daraus zurück auf den Brutto
    const costSold = c.entryEquity * IPO_PLACE;
    const netto = real.moic * costSold;
    // exitNetOf zieht Kosten und ggf. Sweet Equity ab — der Brutto liegt darüber
    expect(netto, "Auswertung zahlt mehr als die neue Vorschau ankündigt").toBeLessThanOrEqual(erwartet + 1e-6);
    expect(netto, "Auswertung zahlt weit weniger als angekündigt").toBeGreaterThan(erwartet * 0.9);
  });

  it("zahlt beim bilateralen Verkauf das Multiple der Vorschau", () => {
    const hy = PERIODS - 1;
    const state = gehalten(SEED, hy - 1);
    const me = state.funds[0] as Any;
    const c = (me.holdings as Any[])[0];
    const M = exitMultiples(c, state.market, me.attrs.negotiation, hy, "bil");
    expect(M.exit).toBeCloseTo(dealMultiple(c, state.market, me.attrs.negotiation, hy) - BIL_DISC, 9);

    const out = exitAt(state, hy, "bilateral");
    const nachher = (out.state.funds as Any[])[0];
    expect((nachher.holdings as Any[]).length, "die Beteiligung ist verkauft").toBe(0);
    const real = (nachher.realized as Any[])[(nachher.realized as Any[]).length - 1];
    const brutto = Math.max(0, eqvOf(c, M.exit));
    const netto = real.moic * (c.costLeft ?? c.entryEquity);
    expect(netto).toBeLessThanOrEqual(brutto + 1e-6);
    expect(netto).toBeGreaterThan(brutto * 0.9);
  });

  it("zahlt beim Continuation Vehicle das Multiple der Vorschau", () => {
    const hy = PERIODS - 1;
    const state = gehalten(SEED, hy - 1);
    const me = state.funds[0] as Any;
    const c = (me.holdings as Any[])[0];
    const M = exitMultiples(c, state.market, me.attrs.negotiation, hy, "cv");
    const brutto = Math.max(0, eqvOf(c, M.exit)) * CV_STAKE * CV_DISC;

    const out = exitAt(state, hy, "cv");
    const nachher = (out.state.funds as Any[])[0];
    const real = (nachher.realized as Any[]).find((r) => String(r.name).includes("Teilexit"))!;
    expect(real, "kein Teilexit abgerechnet").toBeTruthy();
    const netto = real.moic * (c.entryEquity * CV_STAKE);
    expect(netto).toBeLessThanOrEqual(brutto + 1e-6);
    expect(netto).toBeGreaterThan(brutto * 0.9);
  });
});
