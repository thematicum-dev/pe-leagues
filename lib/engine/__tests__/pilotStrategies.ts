/* Spielweisen für das Testprotokoll Mehrspieler (Pilot, 29.10.2026). Von der
   Engine-Simulation (pilotMultiplayer.test.ts) und vom Serverpfad gegen
   Postgres (supabase/tests) gemeinsam benutzt — beide spielen damit dieselben
   Partien. */
import { createRng } from "../rng";
import { MAX_SLOTS, MIN_HOLD, ebitdaOf, ddCapOf, INITS } from "../engine";
import type { RuntimeState, TurnDecisions } from "../turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type Strategy = "aggr" | "over" | "kons" | "chaos" | "passiv";

/* ---------- Spielweisen ----------
   Jede Spielweise sieht nur, was auch die Oberfläche zeigt (Zustand des
   eigenen Fonds, Dealflow, offene Gebote und Shortlists) und zieht ihre
   Zufallszahlen aus einem eigenen Strom — der Zufallsstrom der Partie bleibt
   unberührt, wie auf dem Server. */
export function decide(kind: Strategy, state: RuntimeState, slot: number, hy: number, srng: ReturnType<typeof createRng>): TurnDecisions | null {
  if (kind === "passiv") return null;
  const me = state.funds.find((f) => f.slot === slot)! as Any;
  const H = me.holdings as Any[];
  const deals = state.deals as Any[];
  const queue = (state.exitQueue[String(slot)] || []) as Any[];
  const lists = (state.shortlist[String(slot)] || []) as Any[];
  const d: TurnDecisions = {};
  const byQuality = [...deals].sort((a, b) => b.quality - a.quality);

  if (kind === "aggr" || kind === "over") {
    // Beide bieten auf dieselben Deals — "over" immer ein Stück höher
    const targets = byQuality.slice(0, 2);
    if (H.length < MAX_SLOTS && hy <= 14) {
      d.bids = targets.map((x) => ({
        dealId: x.id, multiple: x.askMult * (kind === "over" ? 1.09 : 1.06),
        leverage: x.levCap * (kind === "over" ? 0.7 : 1.0),
      }));
      d.dueDiligence = targets.slice(0, ddCapOf(me.attrs.analysis)).map((x) => x.id);
    }
    d.initiatives = [];
    H.forEach((c) => {
      if (!c.initP) d.initiatives!.push({ holdingUid: c.uid, dim: "plat", id: kind === "aggr" ? "opex" : "nwc" });
      if (!c.initA) d.initiatives!.push(kind === "aggr"
        ? { holdingUid: c.uid, dim: "acc", id: "ma", equity: 5 }
        : { holdingUid: c.uid, dim: "acc", id: "pen" });
    });
    d.ltip = H.filter((c) => !c.ltip).map((c) => c.uid);
    d.exitStarts = H.filter((c) => c.holdQ >= MIN_HOLD && !c.proc && !c.lockUntil && !(c.block > hy))
      .slice(0, 2).map((c) => ({ holdingUid: c.uid, action: kind === "aggr" ? "process" : "bilateral", keepPct: 0.3 } as Any));
    d.offerDecisions = queue.map((it) => ({ holdingUid: it.holdingUid, choice: "accept" as const, offerIndex: 0, keepPct: 0.5 }));
    d.hires = lists.map((it) => ({ holdingUid: it.holdingUid, seat: it.seat, choice: "c0" as const }));
    d.searches = H.flatMap((c) => (["ceo", "cfo", "r3"] as const)
      .filter((s) => c[s].skill > 0 && c[s].skill < 2.4 && !(c.searches || []).some((z: Any) => z.seat === s))
      .slice(0, 1).map((s) => ({ holdingUid: c.uid, seat: s })));
    if (kind === "over") {
      // Equity Cure, wenn der Covenant eng wird
      d.equityInjections = H.filter((c) => c.netDebt / Math.max(0.5, ebitdaOf(c)) > (c.covLimit ?? 6) - 0.3)
        .map((c) => ({ holdingUid: c.uid, amount: 0.5 * ebitdaOf(c) }));
    }
    return d;
  }

  if (kind === "kons") {
    const cheap = [...deals].sort((a, b) => a.askMult - b.askMult)[0];
    if (cheap && H.length < 4) d.bids = [{ dealId: cheap.id, multiple: cheap.askMult * (hy % 3 === 0 ? 0.8 : 1.0), leverage: cheap.levCap * 0.5 }];
    d.studies = H.filter((c) => !c.dd).map((c) => c.uid);
    d.exitStarts = H.filter((c) => c.holdQ >= 8 && !c.proc && !c.lockUntil)
      .map((c) => ({ holdingUid: c.uid, action: "bilateral", keepPct: 0 } as Any));
    d.offerDecisions = queue.map((it) => ({ holdingUid: it.holdingUid, choice: "reneg" as const, offerIndex: 1 }));
    // Erst ablehnen, beim nächsten Mal nehmen
    d.hires = lists.map((it) => ({ holdingUid: it.holdingUid, seat: it.seat, choice: (hy % 2 ? "reject" : "c1") as Any }));
    d.initiatives = H.filter((c) => !c.initP).map((c) => ({ holdingUid: c.uid, dim: "plat" as const, id: "erp" }));
    return d;
  }

  // chaos: zufällig, auch ungültig und feindlich
  const pick = <T,>(xs: T[]) => xs[Math.floor(srng.rnd() * xs.length)];
  const anyDeal = deals.length ? pick(deals) : null;
  const junkNum = () => pick([NaN, -5, 0, 1e9, Infinity, -Infinity, 0.5, 3, 12, "7" as Any, null as Any]);
  d.bids = [];
  if (anyDeal) {
    d.bids.push({ dealId: anyDeal.id, multiple: anyDeal.askMult * (0.7 + srng.rnd() * 0.6), leverage: anyDeal.levCap * srng.rnd() });
    d.bids.push({ dealId: anyDeal.id, multiple: junkNum(), leverage: junkNum() });          // doppelt, ungültig
  }
  d.bids.push({ dealId: "gibt-es-nicht", multiple: 10, leverage: 3 });
  d.dueDiligence = [...deals.map((x) => x.id), "gibt-es-nicht", deals[0]?.id].filter(Boolean) as string[];
  const someH = H.length ? pick(H) : null;
  const uid = someH ? someH.uid : "weg";
  d.studies = [uid, uid];
  d.ltip = [uid, "weg"];
  d.searches = [{ holdingUid: uid, seat: pick(["ceo", "cfo", "r3"]) as Any }];
  d.hires = lists.map((it) => ({ holdingUid: it.holdingUid, seat: it.seat, choice: pick(["c0", "c4", "veteran", "aplayer", "development", "reject", "c9"]) as Any }));
  d.equityInjections = [{ holdingUid: uid, amount: junkNum() }, { holdingUid: uid, amount: 1e6 }];
  const ids = [...INITS.plat.map((p: Any) => p.id), ...INITS.acc.map((p: Any) => p.id), "foo"];
  d.initiatives = H.map((c) => ({
    holdingUid: c.uid, dim: pick(["plat", "acc"]) as Any, id: pick(ids),
    ...(srng.rnd() < 0.5 ? { equity: junkNum(), addEb: junkNum(), maxMult: junkNum() } : {}),
  }));
  // Exits auch vor der Mindesthaltedauer und mit unsinnigem Anteil
  d.exitStarts = H.filter(() => srng.rnd() < 0.25).map((c) => ({
    holdingUid: c.uid, action: pick(["process", "bilateral", "cv", "ipo", "verschenken"]) as Any, keepPct: junkNum(),
  }));
  d.offerDecisions = queue.map((it) => ({
    holdingUid: it.holdingUid, choice: pick(["accept", "reneg", "abort", "egal"]) as Any,
    offerIndex: pick([0, 1, 2, 5, -1, undefined as Any]), keepPct: junkNum(),
  }));
  return d;
}
