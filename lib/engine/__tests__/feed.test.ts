import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  ARCHES, CAPITAL, DEFAULT_HUMAN_ATTRS, MAX_SLOTS, PERIODS, SECNAMES, SECTORS, SECLABEL,
} from "../engine";
import { runQuarter, bootstrapInitialDeals } from "../runQuarter";
import type { RuntimeFund, RuntimeState, RuntimeFeedEntry, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Der Nachrichtenfeed liegt gemeinsam im Spielstand, und jeder Eintrag sagt
   selbst, wer ihn sehen darf. Diese Regel ist die einzige, die zwischen
   "jeder liest die Betriebsmeldungen aller anderen" und "niemand erfährt, was
   am Markt passiert" steht — sie gehört festgenagelt. */
function sichtbarFuer(feed: RuntimeFeedEntry[], slot: number) {
  return feed.filter((f) => (f.slot == null || f.slot === slot) && f.exceptSlot !== slot);
}

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

/* Zwei Menschen auf Platz 0 und 1, drei KI-Fonds daneben — anders lässt sich
   "von einem Mitspieler überboten" gar nicht prüfen. */
function baseState(): RuntimeState {
  const m: Record<string, number> = {};
  SECNAMES.forEach((s) => (m[s] = SECTORS[s].m));
  return {
    market: m,
    funds: [
      initialFund(0, false, null), initialFund(1, false, null),
      ...["sourcing", "ops", "fin"].map((k, i) => initialFund(i + 2, true, k)),
    ],
    feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {},
  };
}

describe("Nachrichtenfeed", () => {
  it("meldet dem unterlegenen Bieter, dass er überboten wurde", () => {
    const rng = createRng(20260916);
    let state = baseState();
    const boot = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals: boot.deals, landmark: boot.landmark };

    // Beide Menschen bieten auf denselben Deal, Platz 1 deutlich höher
    const deal = (state.deals as Any[])[0];
    const out = runQuarter({
      state, halfYear: 1, rng,
      decisionsBySlot: {
        0: { bids: [{ dealId: deal.id, multiple: deal.askMult * 1.02, leverage: 2 }] },
        1: { bids: [{ dealId: deal.id, multiple: deal.askMult * 1.25, leverage: 2 }] },
      },
    } as Any);

    const gewinner = (out.state.funds as Any[]).find((f) => (f.holdings as Any[]).some((c) => c.name === deal.name));
    expect(gewinner?.slot, "Platz 1 hat höher geboten").toBe(1);

    const fuer0 = sichtbarFuer(out.feed as RuntimeFeedEntry[], 0);
    const ueberboten = fuer0.find((f) => f.text.includes("Überboten") && f.text.includes(deal.name));
    expect(ueberboten, "keine Überboten-Meldung für den unterlegenen Bieter").toBeTruthy();
    // Sie nennt, wer gewonnen hat und zu welchem Multiple — sonst lernt niemand daraus
    expect(ueberboten!.text).toContain("Fonds 1");
    expect(ueberboten!.text).toMatch(/\d,\d×/);
    // Und der Gewinner bekommt sie nicht
    expect(sichtbarFuer(out.feed as RuntimeFeedEntry[], 1).some((f) => f.text.includes("Überboten"))).toBe(false);
  });

  it("sagt dem Bieter, wenn sein Gebot am investierbaren Kapital scheitert", () => {
    const rng = createRng(7);
    let state = baseState();
    const boot = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals: boot.deals, landmark: boot.landmark };
    const deal = (state.deals as Any[])[0];
    const out = runQuarter({
      state, halfYear: 1, rng,
      // Ohne Fremdkapital und zum Zehnfachen: mehr Eigenkapital, als der Fonds hat
      decisionsBySlot: { 0: { bids: [{ dealId: deal.id, multiple: deal.askMult * 10, leverage: 0 }] } },
    } as Any);
    const fuer0 = sichtbarFuer(out.feed as RuntimeFeedEntry[], 0);
    expect(fuer0.some((f) => f.text.includes("investierbares Kapital")),
      "kein Hinweis auf das fehlende Kapital").toBe(true);
  });

  it("meldet jeden Kauf und jeden Verkauf mit Sektor, EBITDA und Multiple", () => {
    const rng = createRng(4242);
    let state = baseState();
    const boot = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals: boot.deals, landmark: boot.landmark };

    let kaeufe = 0, verkaeufe = 0;
    for (let hy = 1; hy <= PERIODS; hy++) {
      const d: Record<number, TurnDecisions> = {};
      [0, 1].forEach((slot) => {
        const me = (state.funds as Any[]).find((f) => f.slot === slot)!;
        const dec: TurnDecisions = {};
        if ((me.holdings as Any[]).length < MAX_SLOTS && state.deals.length) {
          const x = (state.deals as Any[])[slot % state.deals.length];
          if (x) dec.bids = [{ dealId: x.id, multiple: x.askMult * (1 + slot * 0.04), leverage: x.levCap * 0.8 }];
        }
        const reif = (me.holdings as Any[]).filter((h) => h.holdQ >= 6 && !h.proc && !h.lockUntil);
        if (reif.length) dec.exitStarts = [{ holdingUid: reif[0].uid, action: hy % 2 ? "bilateral" : "ipo" } as Any];
        if (state.exitQueue[String(slot)]?.length) {
          dec.offerDecisions = state.exitQueue[String(slot)].map((it) => ({
            holdingUid: it.holdingUid, choice: "accept" as const, offerIndex: 0,
          }));
        }
        d[slot] = dec;
      });
      const out = runQuarter({ state, halfYear: hy, decisionsBySlot: d, rng } as Any);
      state = out.state;

      for (const f of out.feed as RuntimeFeedEntry[]) {
        if (f.emoji === "🤝") kaeufe++;
        if (f.emoji === "🏷️") verkaeufe++;
        if (f.emoji !== "🤝" && f.emoji !== "🏷️") continue;
        // Jede Marktmeldung ist öffentlich — aber nicht für den Fonds, der sie auslöste
        expect(f.slot, `${f.text}: Marktmeldung darf nicht privat sein`).toBeUndefined();
        expect(f.exceptSlot, `${f.text}: Marktmeldung ohne auslösenden Fonds`).toBeTypeOf("number");
        // … und sie nennt Sektor, EBITDA und Multiple
        expect(Object.values(SECLABEL).some((l) => f.text.includes(l)), `${f.text}: Sektor fehlt`).toBe(true);
        expect(f.text, `${f.text}: EBITDA fehlt`).toContain("EBITDA");
        expect(f.text, `${f.text}: Multiple fehlt`).toMatch(/\d,\d×/);
      }
    }
    expect(kaeufe, "keine Käufe gemeldet").toBeGreaterThan(3);
    expect(verkaeufe, "keine Verkäufe gemeldet").toBeGreaterThan(3);
  });

  it("hält die Betriebsmeldungen eines Fonds bei diesem Fonds", () => {
    const rng = createRng(99991);
    let state = baseState();
    const boot = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals: boot.deals, landmark: boot.landmark };

    let privat = 0;
    for (let hy = 1; hy <= 12; hy++) {
      const d: Record<number, TurnDecisions> = {};
      [0, 1].forEach((slot) => {
        const me = (state.funds as Any[]).find((f) => f.slot === slot)!;
        const dec: TurnDecisions = {};
        const x = (state.deals as Any[])[slot % Math.max(1, state.deals.length)];
        if ((me.holdings as Any[]).length < 3 && x) {
          dec.bids = [{ dealId: x.id, multiple: x.askMult * (1 + slot * 0.05), leverage: x.levCap * 0.8 }];
        }
        const frei = (me.holdings as Any[]).find((h) => !h.initP);
        if (frei) dec.initiatives = [{ holdingUid: frei.uid, dim: "plat", id: "opex" }];
        d[slot] = dec;
      });
      const out = runQuarter({ state, halfYear: hy, decisionsBySlot: d, rng } as Any);
      state = out.state;
      for (const f of out.feed as RuntimeFeedEntry[]) {
        if (f.slot == null) continue;
        privat++;
        // Eine private Meldung erreicht genau einen Platz
        expect(sichtbarFuer([f], f.slot).length).toBe(1);
        expect(sichtbarFuer([f], f.slot === 0 ? 1 : 0).length).toBe(0);
      }
    }
    expect(privat, "keine privaten Meldungen erzeugt").toBeGreaterThan(10);
  });
});

/* ---------------------------------------------------------------- */

/* Der Feed hat ein Format, und wer hineinschreibt, muss es einhalten.

   maturePeople() stammt aus dem Übungsmodus und schreibt in dessen Kurzform
   ({q, e, tone, t}); der gemeinsame Feed einer Partie führt sprechende Felder
   und den Fondsplatz. Bis zum 18.09.2026 landeten die Kurzform-Einträge
   unverändert im Spielstand: ohne `halfYear` fiel jeder von ihnen durch beide
   Filter der Ansicht, ohne `slot` wäre er an jeden Platz gegangen. Unsichtbar
   war damit genau das, was eine Periode ausmacht — Abschluss und Fehlschlag
   jeder Maßnahme, die gescheiterte Integration eines Zukaufs, der Rückzug
   eines Gründer-CEO.

   Ein Format lässt sich nicht an einer Stelle prüfen, an der es schon richtig
   ist. Gespielt wird deshalb eine Partie mit laufenden Maßnahmen und
   Zukäufen, und JEDER erzeugte Eintrag muss das Format tragen.            */
describe("Format des Feeds", () => {
  function spieleMitMassnahmen(seed: number) {
    const rng = createRng(seed);
    let state = baseState();
    const boot = bootstrapInitialDeals(rng, state.market, state.funds);
    state = { ...state, deals: boot.deals, landmark: boot.landmark };
    const alle: RuntimeFeedEntry[] = [];
    for (let hy = 1; hy <= PERIODS; hy++) {
      const d: Record<number, TurnDecisions> = {};
      [0, 1].forEach((slot) => {
        const me = (state.funds as Any[]).find((f) => f.slot === slot)!;
        const dec: TurnDecisions = {};
        const deal = (state.deals as Any[])[slot % Math.max(1, state.deals.length)];
        if ((me.holdings as Any[]).length < MAX_SLOTS && deal) {
          dec.bids = [{ dealId: deal.id, multiple: deal.askMult * (1 + slot * 0.05), leverage: deal.levCap * 0.8 }];
          dec.dueDiligence = [deal.id];
        }
        const inits: Any[] = [];
        const freiP = (me.holdings as Any[]).find((h) => !h.initP);
        if (freiP) inits.push({ holdingUid: freiP.uid, dim: "plat", id: "opex" });
        /* Bewusst ein überzogenes Mandat: große Zielgröße, Gebot deutlich
           unter der Preisvorstellung. Das erzeugt beides — gescheiterte
           Integrationen und Zukäufe, an denen die Finanzierung scheitert. */
        const freiA = (me.holdings as Any[]).find((h) => !h.initA);
        if (freiA) inits.push({ holdingUid: freiA.uid, dim: "acc", id: "ma", addEb: 1e9, maxMult: 1 });
        if (inits.length) dec.initiatives = inits;
        d[slot] = dec;
      });
      const out = runQuarter({ state, halfYear: hy, decisionsBySlot: d, rng } as Any);
      state = out.state;
      alle.push(...(out.feed as RuntimeFeedEntry[]));
    }
    return alle;
  }

  it("schreibt jeden Eintrag in den Feldern des Spielstands", () => {
    const alle = spieleMitMassnahmen(20260918);
    expect(alle.length, "keine Meldungen erzeugt").toBeGreaterThan(20);
    for (const f of alle) {
      expect(f.halfYear, `Eintrag ohne Halbjahr: ${JSON.stringify(f)}`).toBeTypeOf("number");
      expect(f.emoji, `Eintrag ohne Emoji: ${JSON.stringify(f)}`).toBeTypeOf("string");
      expect(f.text, `Eintrag ohne Text: ${JSON.stringify(f)}`).toBeTypeOf("string");
      expect(f.text.length, `leerer Text: ${JSON.stringify(f)}`).toBeGreaterThan(0);
      // Kurzform des Übungsmodus darf im Spielstand nicht vorkommen
      for (const k of ["q", "e", "t"]) {
        expect((f as Any)[k], `Kurzform-Feld "${k}" im Spielstand: ${JSON.stringify(f)}`).toBeUndefined();
      }
    }
  });

  it("meldet Abschluss und Fehlschlag einer Maßnahme an den eigenen Fonds", () => {
    const alle = spieleMitMassnahmen(20260918);
    const massnahme = alle.filter((f) => /abgeschlossen|gescheitert|verfehlt das Ziel/.test(f.text));
    expect(massnahme.length, "kein Ausgang einer Maßnahme gemeldet").toBeGreaterThan(3);
    // Betriebsmeldungen sind privat: genau ein Platz sieht sie
    for (const f of massnahme) {
      expect(f.slot, `Betriebsmeldung ohne Fondsplatz: ${f.text}`).toBeTypeOf("number");
    }
  });

  it("meldet einen Zukauf, den die Banken nicht finanzieren", () => {
    const alle = spieleMitMassnahmen(20260918);
    const geplatzt = alle.filter((f) => f.text.includes("scheitert an der Finanzierung"));
    expect(geplatzt.length, "abgelehnte Finanzierung blieb stumm").toBeGreaterThan(0);
    for (const f of geplatzt) {
      expect(f.slot, "auch diese Meldung gehört nur dem eigenen Fonds").toBeTypeOf("number");
      expect(f.text, "die Meldung nennt die Pro-forma-Verschuldung").toMatch(/\d,\d×/);
    }
  });
});
