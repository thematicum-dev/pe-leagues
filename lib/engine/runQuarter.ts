/* Serverseitige Rundenauswertung: das Gegenstück zu runQuarter() aus
   components/PeLeagues.tsx (siehe PR "Spiellogik aus PeLeagues.tsx in
   lib/engine/ extrahieren"), aber ohne React und verallgemeinert auf bis zu
   fünf Fondsplätze, die jeweils ein Mensch (mit eingereichten Entscheidungen)
   oder eine KI (mit archetypgetriebener Logik) besetzt — statt fest Platz 0
   = Mensch, Plätze 1..4 = KI.

   Die ursprüngliche Komponente unterschied zwei Arten von Spieleraktionen:
   - "sofortige" Aktionen (Maßnahme starten, Search-Mandat vergeben, Kandidat
     einstellen, MEP aufsetzen, Verkaufsprozess starten/Bilateral/CV/IPO,
     ein vorliegendes Verkaufsangebot entscheiden): mutierten den Fondszustand
     direkt bei Klick, jederzeit während des laufenden Halbjahres.
   - die "gebündelte" Auflösung in runQuarter() selbst (Auktionen, KI-Züge,
     Periodenschritt der Beteiligungen, Personalreifung, Markt) — ausgelöst
     durch "Halbjahr abschließen".

   Im Server-Modell sammelt jeder Spieler seine Entscheidungen über das ganze
   Halbjahr im Browser (siehe app/season/[id]) und reicht sie als eine
   TurnDecisions-Abgabe ein. Diese Funktion wendet für jeden Fondsplatz zuerst
   dessen "sofortige" Entscheidungen an (deterministisch nach Slot-Nummer
   sortiert, damit die Zufallsziehungen reproduzierbar sind — eine Reihenfolge,
   die es in der Live-UI so nicht gab, weil dort die Reihenfolge der Klicks
   entschied), und führt danach exakt dieselbe gebündelte Auflösung wie das
   Original aus, nur über alle fünf Fondsplätze statt nur Platz 0. */
import type { Rng } from "./rng";
import {
  SECTORS, SECNAMES, ARCHES, AI_PLAN, MAX_SLOTS, ENTRY_FEE, BASE_RATE, COV_FLOOR, COV_HEADROOM,
  RESERVE_PROP, RESERVE_PROC, CAPITAL, INVEST_PERIOD, MGMT_FEE, PERIODS, PROC_Q, PROC_FEE, BIL_FEE, BIL_DISC,
  CV_STAKE, CV_DISC, CV_FEE, IPO_PLACE, IPO_DISC, IPO_FEE, LM_ANNOUNCE, LM_DEAL, LIQ_DISC, LTIP_SHARE,
  ebitdaOf, spendFund, investableOf, makeSeats, seatLoad, stepCompany, EVENTS, maturePeople, buildInit,
  fitOf, initRuns, overstretch, retainerOf, signBonusOf, severanceOf,
  newDeal, newLandmark, makeOffers, applyProceeds, markMultiple, dealMultiple, fairOf, eqvOf, navValueOf,
  recycleRoom, dealMoic, clamp, ddCostOf, ROLE3,
} from "./engine";

type Archetype = (typeof ARCHES)[number];
function archetypeByKey(key: string): Archetype {
  const found = ARCHES.find((a) => a.key === key);
  if (!found) throw new Error(`Unbekannter Archetyp: ${key}`);
  return found;
}
import type {
  ExitQueueItem, HireIntent, OfferDecisionIntent, RuntimeFund, RuntimeState,
  ShortlistItem, TurnDecisions,
} from "./turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function cloneFund(f: RuntimeFund): RuntimeFund {
  return {
    ...f,
    holdings: (f.holdings as Any[]).map((c) => ({ ...c })),
    realized: [...(f.realized as Any[])],
    calls: [...(f.calls as Any[])],
    dists: [...(f.dists as Any[])],
  };
}

function botOf(f: RuntimeFund) {
  return f.isAi ? archetypeByKey(f.archetype as Any) : null;
}

/* Neue Bewerberliste ist bereits deterministisch positioniert:
   makeCandidates() liefert immer [Veteran, A-Player, Entwicklungsprofil] in
   fester Reihenfolge. Der Client kann eine Wahl deshalb gefahrlos per festem
   Label referenzieren, obwohl die tatsächlichen Ratings gewürfelt sind. */
function candidateByChoice(item: ShortlistItem, choice: HireIntent["choice"]) {
  const idx = choice === "veteran" ? 0 : choice === "aplayer" ? 1 : choice === "development" ? 2 : -1;
  return idx >= 0 ? item.candidates[idx] : null;
}

function pushFeed(news: Any[], q: number, emoji: string, tone: "neu" | "pos" | "neg", text: string, slot?: number) {
  news.push({ halfYear: q, emoji, tone, text, ...(slot != null ? { slot } : {}) });
}

/* ---------- Sofortige Spielerentscheidungen ----------
   Wendet die "jederzeit im laufenden Halbjahr"-Aktionen eines menschlichen
   Fondsplatzes an, bevor die gebündelte Auflösung läuft. Mutiert f, das
   dazugehörige exitQueue/shortlist des Slots sowie die news-Liste. Jede
   Referenz (holdingUid, dealId, offerIndex, Kandidatenwahl) wird gegen den
   tatsächlichen Zustand geprüft; unbekannte oder unzulässige Referenzen
   werden stillschweigend ignoriert — der Browser kann sich so höchstens
   selbst schaden, nie einen ungültigen Zustand erzwingen. */
function applyImmediateDecisions(
  rng: Rng, f: RuntimeFund, decisions: TurnDecisions, exitQueue: ExitQueueItem[], shortlist: ShortlistItem[],
  market: Record<string, number>, quarter: number, news: Any[],
): { exitQueue: ExitQueueItem[]; shortlist: ShortlistItem[] } {
  const holdingByUid = (uid: string) => (f.holdings as Any[]).find((h) => h.uid === uid);
  let queue = [...exitQueue];
  let list = [...shortlist];

  // 1 — offene Verkaufsangebote entscheiden
  (decisions.offerDecisions || []).forEach((dec: OfferDecisionIntent) => {
    const item = queue.find((it) => it.holdingUid === dec.holdingUid);
    if (!item) return;
    const c = holdingByUid(dec.holdingUid);
    if (!c) { queue = queue.filter((it) => it !== item); return; }
    const offer = item.offers[dec.offerIndex ?? 0];
    if (!offer) return;

    if (dec.choice === "abort") {
      c.block = quarter + 2;
      pushFeed(news, quarter, "🚫", "neg", `Verkaufsprozess für ${c.name} abgebrochen.`, f.slot);
      queue = queue.filter((it) => it !== item);
      return;
    }

    let final = offer;
    let extra = "";
    if (dec.choice === "reneg") {
      const r = rng.rnd();
      if (r < 0.60) {
        final = { ...offer, price: offer.price * (1.05 + rng.rnd() * 0.03) };
        extra = " Nachverhandlung erfolgreich.";
      } else if (r < 0.85) {
        const second = [...item.offers].filter((o) => o !== offer).sort((a, b) => b.price - a.price)[0];
        if (!second) {
          c.block = quarter + 2;
          pushFeed(news, quarter, "🚫", "neg", `${offer.buyer} springt bei ${c.name} ab.`, f.slot);
          queue = queue.filter((it) => it !== item);
          return;
        }
        final = second;
        extra = ` ${offer.buyer} ist abgesprungen.`;
      } else {
        extra = " Nachverhandlung ohne Ergebnis.";
      }
    }

    if (final.risk && rng.rnd() < final.risk) {
      c.block = quarter + 2;
      pushFeed(news, quarter, "⚖️", "neg", `Die Fusionskontrolle stoppt den Verkauf von ${c.name}.`, f.slot);
      queue = queue.filter((it) => it !== item);
      return;
    }

    finalizeExit(f, c, final.price, final.buyer, PROC_FEE, extra, dec.keepPct, quarter, news);
    queue = queue.filter((it) => it !== item);
  });

  // 2 — offene Shortlists entscheiden
  (decisions.hires || []).forEach((dec: HireIntent) => {
    const item = list.find((it) => it.holdingUid === dec.holdingUid && it.seat === dec.seat);
    if (!item) return;
    const c = holdingByUid(dec.holdingUid);
    if (!c) { list = list.filter((it) => it !== item); return; }
    if (dec.choice === "reject") {
      c.netDebt += retainerOf(dec.seat, ebitdaOf(c)) * 0.5;
      c.searches = (c.searches || []).map((se: Any) => (se.seat === dec.seat ? { seat: dec.seat, readyQ: quarter + 1 } : se));
      pushFeed(news, quarter, "🔍", "neu", `${c.name}: Shortlist abgelehnt, Suchmandat wird neu aufgesetzt.`, f.slot);
      list = list.filter((it) => it !== item);
      return;
    }
    const cand = candidateByChoice(item, dec.choice);
    if (!cand) return;
    const had = c[dec.seat].skill > 0;
    const prevSkill = c[dec.seat].skill;
    c[dec.seat] = { skill: cand.skill, dev: cand.dev, poach: cand.poach };
    c.searches = (c.searches || []).filter((se: Any) => se.seat !== dec.seat);
    c.onboard = 1;
    c.netDebt += signBonusOf(dec.seat, cand.skill, ebitdaOf(c)) + (had ? severanceOf(dec.seat, prevSkill, ebitdaOf(c)) : 0);
    const nm = dec.seat === "ceo" ? "CEO" : dec.seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    pushFeed(news, quarter, "🤝", "pos", `${c.name}: Neuer ${nm} an Bord — Rating ${cand.skill.toFixed(1)}.`, f.slot);
    list = list.filter((it) => it !== item);
  });

  // 3 — MEP (LTIP) aufsetzen
  (decisions.ltip || []).forEach((uid: string) => {
    const c = holdingByUid(uid);
    if (!c || c.ltip) return;
    c.ltip = true;
    pushFeed(news, quarter, "📜", "neu", `${c.name}: Managementbeteiligung (MEP) aufgesetzt.`, f.slot);
  });

  // 4 — Search-Mandate vergeben
  (decisions.searches || []).forEach((s) => {
    const c = holdingByUid(s.holdingUid);
    if (!c) return;
    if ((c.searches || []).some((se: Any) => se.seat === s.seat)) return;
    c.netDebt += retainerOf(s.seat, ebitdaOf(c));
    c.searches = [...(c.searches || []), { seat: s.seat, readyQ: quarter + 1 }];
    const nm = s.seat === "ceo" ? "CEO" : s.seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    pushFeed(news, quarter, "🔍", "neu", `${c.name}: Search-Mandat für einen neuen ${nm} erteilt.`, f.slot);
  });

  // 5 — Maßnahmen starten
  (decisions.initiatives || []).forEach((intent) => {
    const c = holdingByUid(intent.holdingUid);
    if (!c) return;
    if (intent.dim === "plat" && c.initP) return;
    if (intent.dim === "acc" && c.initA) return;
    const B = buildInit(rng, c, intent.dim, intent.id, market, quarter);
    if (!B || B.blocked) return;
    c.netDebt += B.debt;
    c[B.slot] = B.init;
    pushFeed(news, quarter, B.spec.ma ? "🏢" : "🛠️", "neu", `${c.name}: ${B.spec.n} gestartet.`, f.slot);
  });

  // 6 — Exits anstoßen (Prozess eröffnen oder sofort veräußern)
  (decisions.exitStarts || []).forEach((intent) => {
    const c = holdingByUid(intent.holdingUid);
    if (!c || c.proc || c.lockUntil) return;
    if (c.block && quarter < c.block) return;
    const NEG = f.attrs.negotiation;
    if (intent.action === "process") {
      c.proc = { resolveQ: quarter + PROC_Q };
      pushFeed(news, quarter, "📣", "neu", `Verkaufsprozess für ${c.name} eröffnet.`, f.slot);
      return;
    }
    if (intent.action === "bilateral") {
      const mult = dealMultiple(c, market, NEG, quarter) - BIL_DISC;
      const gross = Math.max(0, eqvOf(c, mult));
      finalizeExit(f, c, gross, "Off-Market-Erwerber", BIL_FEE, "", intent.keepPct, quarter, news);
      return;
    }
    if (intent.action === "cv") {
      const fair = fairOf(c, market, NEG, quarter);
      const gross = fair * CV_STAKE * CV_DISC;
      const net = gross * (1 - CV_FEE);
      const costSold = c.entryEquity * CV_STAKE;
      c.st = (c.st ?? 1) * (1 - CV_STAKE);
      c.entryEquity = c.entryEquity * (1 - CV_STAKE);
      c.costLeft = Math.max(0.01, (c.costLeft ?? c.entryEquity) - costSold);
      c.cashOut = (c.cashOut || 0) + net;
      c.cv = true;
      c.proc = null;
      f.realized = [...(f.realized as Any[]), { name: c.name + " (Teilexit)", moic: net / costSold }];
      applyProceeds(f, net, costSold, quarter);
      pushFeed(news, quarter, "🔄", "neu", `${c.name}: Teilexit an ein Continuation Vehicle.`, f.slot);
      return;
    }
    if (intent.action === "ipo") {
      const fair = fairOf(c, market, 0, quarter);
      const gross = fair * IPO_PLACE * IPO_DISC;
      const net = gross * (1 - IPO_FEE);
      const costSold = c.entryEquity * IPO_PLACE;
      c.st = (c.st ?? 1) * (1 - IPO_PLACE);
      c.entryEquity = c.entryEquity * (1 - IPO_PLACE);
      c.costLeft = Math.max(0.01, (c.costLeft ?? c.entryEquity) - costSold);
      c.cashOut = (c.cashOut || 0) + net;
      c.lockUntil = quarter + 2;
      c.proc = null;
      f.realized = [...(f.realized as Any[]), { name: c.name + " (IPO)", moic: net / costSold }];
      applyProceeds(f, net, costSold, quarter);
      pushFeed(news, quarter, "🔔", "pos", `Börsengang ${c.name}: ${Math.round(IPO_PLACE * 100)} % platziert.`, f.slot);
    }
  });

  // 7 — Due Diligence beauftragen (wirkt erst in der Auktion dieses Halbjahres)
  (decisions.dueDiligence || []).forEach(() => {
    /* Kosten werden zentral in runQuarter() beim Bekanntwerden der Deal-Liste
       verrechnet (siehe applyDueDiligence), nicht hier — DD bezieht sich auf
       den aktuellen Dealflow, nicht auf bestehende Beteiligungen. */
  });

  return { exitQueue: queue, shortlist: list };
}

function finalizeExit(
  f: RuntimeFund, c: Any, gross: number, buyer: string, feeRate: number, extra: string,
  keepPct: number | undefined, quarter: number, news: Any[],
) {
  const net = gross * (1 - feeRate) * (c.ltip ? 1 - LTIP_SHARE : 1);
  const room = recycleRoom(f, net, quarter);
  const keep = room > 0.5 ? clamp(keepPct ?? 0, 0, 1) : 0;
  f.holdings = (f.holdings as Any[]).filter((h) => h.uid !== c.uid);
  f.realized = [...(f.realized as Any[]), { name: c.name, moic: dealMoic(c, net) }];
  applyProceeds(f, net, c.costLeft ?? c.entryEquity, quarter, keep);
  const mo = dealMoic(c, net);
  pushFeed(news, quarter, mo >= 2 ? "🚀" : mo >= 1 ? "💰" : "💀", mo >= 1 ? "pos" : "neg",
    `Exit ${c.name} an ${buyer}: ${net.toFixed(1)} Mio. € netto${extra}.`, f.slot);
}

export interface RunQuarterInput {
  state: RuntimeState;
  halfYear: number;
  decisionsBySlot: Record<number, TurnDecisions>;
  rng: Rng;
}

export interface RunQuarterOutput {
  state: RuntimeState;
  feed: RuntimeState["feed"];
}

/* Die eigentliche Auflösung eines Halbjahres. Deterministisch bis auf die
   übergebene rng-Instanz — bei gleichem Zustand, gleichen Entscheidungen und
   gleicher rng-Position liefert dieselbe Eingabe immer dieselbe Ausgabe. */
export function runQuarter(input: RunQuarterInput): RunQuarterOutput {
  const { rng, halfYear } = input;
  const q = halfYear;
  const mk = { ...input.state.market };
  const F: RuntimeFund[] = input.state.funds.map(cloneFund);
  const deals = [...(input.state.deals as Any[])];
  const news: Any[] = [];
  const exitQueueBySlot: Record<string, ExitQueueItem[]> = { ...input.state.exitQueue };
  const shortlistBySlot: Record<string, ShortlistItem[]> = { ...input.state.shortlist };
  const decisionsBySlot = input.decisionsBySlot;

  // 0 — Due-Diligence-Kosten für den aktuellen Dealflow verrechnen
  const ddBySlot: Record<number, Set<string>> = {};
  F.forEach((f) => {
    if (f.isAi) return;
    const decisions = decisionsBySlot[f.slot] || {};
    const ids = new Set((decisions.dueDiligence || []).filter((id) => deals.some((d) => d.id === id)));
    ddBySlot[f.slot] = ids;
    ids.forEach((id) => {
      const deal = deals.find((d) => d.id === id);
      spendFund(f, ddCostOf(deal), q, true);
    });
  });

  // 0b — sofortige Entscheidungen (Maßnahmen, Hiring, Exits, MEP) anwenden,
  // in Slot-Reihenfolge für eine reproduzierbare Zufallsziehung.
  F.slice().sort((a, b) => a.slot - b.slot).forEach((f) => {
    if (f.isAi) return;
    const decisions = decisionsBySlot[f.slot] || {};
    const key = String(f.slot);
    const res = applyImmediateDecisions(
      rng, f, decisions, exitQueueBySlot[key] || [], shortlistBySlot[key] || [], mk, q, news,
    );
    exitQueueBySlot[key] = res.exitQueue;
    shortlistBySlot[key] = res.shortlist;
  });

  /* 1 — Auktionen */
  deals.forEach((d: Any) => {
    const entries: { f: number; mult: number; lev: number; eq: number }[] = [];
    F.forEach((f, i) => {
      if (f.holdings.length >= MAX_SLOTS) return;
      if (!f.isAi) {
        const decisions = decisionsBySlot[f.slot] || {};
        const bid = (decisions.bids || []).find((b) => b.dealId === d.id);
        if (!bid) return;
        if (!(bid.multiple > 0) || !(bid.leverage >= 0) || bid.leverage > d.levCap + 1e-6) return;
        const ev = ebitdaOf(d) * bid.multiple;
        const eq = ev - ebitdaOf(d) * bid.leverage + ev * ENTRY_FEE;
        if (eq <= investableOf(f, q)) entries.push({ f: i, mult: bid.multiple, lev: bid.leverage, eq });
        return;
      }
      const a = botOf(f)!;
      const propChance = d.type === "prop" ? Math.max(0, 0.10 * (a.attrs.sourcing - 2)) : null;
      const partake = d.type === "prop" ? rng.rnd() < (propChance ?? 0)
        : rng.rnd() < (d.type === "landmark" ? 0.92 : 0.74);
      if (!partake) return;
      const fit = (a.key === "ops" && d.margin < 14) || (a.key === "fin" && d.levCap > 4.2) || (a.key === "sourcing" && d.quality > 60);
      const lmBoost = d.type === "landmark" ? 0.07 : 0;
      const mult = d.askMult * (1 + a.aggr + lmBoost + (fit ? 0.05 : 0) + rng.nrm(0.03));
      const lev = Math.min(d.levCap, d.levCap * a.lev);
      const ev = ebitdaOf(d) * mult;
      const eq = ev - ebitdaOf(d) * lev + ev * ENTRY_FEE;
      if (eq <= investableOf(f, q)) entries.push({ f: i, mult, lev, eq });
    });
    if (!entries.length) return;
    const reserve = d.askMult * (d.type === "prop" ? RESERVE_PROP : RESERVE_PROC);
    const valid = entries.filter((e) => e.mult >= reserve);
    if (!valid.length) return;
    valid.sort((p, r) => r.mult - p.mult || F[r.f].attrs.negotiation - F[p.f].attrs.negotiation);
    const w = valid[0];
    const f = F[w.f];
    const eb = ebitdaOf(d);
    const bidMult = w.mult;
    w.mult = w.mult * (1 - 0.010 * f.attrs.negotiation);
    let hit = 0;
    if (d.type === "prop" && !f.isAi && !ddBySlot[f.slot]?.has(d.id)) {
      const p = clamp(0.5 - 0.09 * f.attrs.analysis, 0.05, 0.5);
      if (rng.rnd() < p) { hit = 0.10 + rng.rnd() * 0.14; }
    }
    const c: Any = {
      uid: "c" + Math.floor(rng.rnd() * 1e9), name: d.name, sector: d.sector, desc: d.desc,
      revenue: d.revenue, margin: d.margin * (1 - hit),
      quality: d.quality * (1 - hit / 2),
      netDebt: eb * w.lev, rate: BASE_RATE - 0.25 * f.attrs.financing,
      holdQ: 0, flag: d.flag,
      ...makeSeats(rng, d), plat: 0.6 + rng.rnd() * 1.2, acc: 0.6 + rng.rnd() * 1.2, nwcFix: 0,
      addonSize: 0.20 + rng.rnd() * 0.15,
      addonComp: rng.rnd() < 0.35 ? 0.8 + rng.rnd() * 1.4 : 0,
      ltip: false, searches: [], initP: null, initA: null, onboard: 0,
      st: 1, proc: null, block: 0, lockUntil: null, cv: false, breach: 0,
      covLimit: Math.max(COV_FLOOR, w.lev + COV_HEADROOM + 0.10 * f.attrs.financing),
      capexPct: d.capexPct, nwcPct: d.nwcPct,
      benchMargin: d.benchMargin, benchCapex: d.benchCapex, benchNwc: d.benchNwc,
      dd: f.isAi ? true : !!ddBySlot[f.slot]?.has(d.id),
      drift: d.drift ?? rng.nrm(2.5), marginDrift: rng.nrm(1.2), entryQuality: d.quality * (1 - hit / 2),
      entryMult: w.mult, entryEbitda: eb, entryDebt: eb * w.lev,
      entryEV: eb * w.mult,
      entryFees: eb * w.mult * ENTRY_FEE,
      entryEquity: eb * w.mult - eb * w.lev + eb * w.mult * ENTRY_FEE,
      costTotal: eb * w.mult - eb * w.lev + eb * w.mult * ENTRY_FEE,
      cashOut: 0, recapOut: 0, costLeft: eb * w.mult - eb * w.lev + eb * w.mult * ENTRY_FEE,
      entryQ: q,
      hist: [{ rev: d.revenue, eb, nd: eb * w.lev, mg: d.margin * (1 - hit), ql: d.quality * (1 - hit / 2), eq: eb * w.mult - eb * w.lev }],
    };
    c.baseLoad = seatLoad(c);
    spendFund(f, c.entryEquity, q, undefined);
    f.investedTotal = (f.investedTotal || 0) + c.entryEquity;
    f.holdings = [...(f.holdings as Any[]), c];
    if (!f.isAi) {
      pushFeed(news, q, d.type === "landmark" ? "🏛️" : "🏆", "pos",
        `${d.type === "landmark" ? "Trophy Asset gewonnen" : "Zuschlag"}: ${d.name} bei ${w.mult.toFixed(1)}× EBITDA.`, f.slot);
      if (hit) pushFeed(news, q, "⚠️", "neg", `Nach Closing bei ${d.name}: Die Marge liegt unter den Angaben im Information Memorandum.`, f.slot);
    }
  });

  /* 2 — KI-Fonds entwickeln ihre Beteiligungen */
  F.forEach((f) => {
    if (!f.isAi) return;
    (f.holdings as Any[]).forEach((c) => {
      if (c.searches && c.searches.length) return;
      const k = botOf(f)!.key;
      const amb = k === "ops" ? 4.0 : k === "fin" ? 3.0 : 3.6;
      const seat = (["ceo", "cfo", "r3"] as const).find((s2) => c[s2].skill < amb - 0.5);
      if (seat && rng.rnd() < 0.8) {
        const eb = ebitdaOf(c);
        const sk = clamp(amb + rng.nrm(0.5), 1, 4.5);
        c.netDebt += retainerOf(seat, eb) + signBonusOf(seat, sk, eb)
          + (c[seat].skill > 0 ? severanceOf(seat, c[seat].skill, eb) : 0);
        c[seat] = { skill: sk };
        c.onboard = 1;
        return;
      }
      if (!c.ltip && rng.rnd() < 0.5) c.ltip = true;
      const plan = (AI_PLAN as Any)[k] || AI_PLAN.all;
      (["plat", "acc"] as const).forEach((dim) => {
        const slot = dim === "plat" ? "initP" : "initA";
        if (c[slot]) return;
        if (dim === "acc" && overstretch(c) > 0.3) return;
        const cands = (plan[dim] || []).filter((x2: string) => initRuns(c, x2) < 4);
        if (!cands.length) return;
        const id = cands.reduce((a: string, b: string) => (fitOf(b, c) * Math.pow(0.82, initRuns(c, b))
          > fitOf(a, c) * Math.pow(0.82, initRuns(c, a)) ? b : a));
        if (fitOf(id, c) * Math.pow(0.82, initRuns(c, id)) < 0.30 && id !== "ma") return;
        const B = buildInit(rng, c, dim, id, mk, q);
        if (!B || B.blocked) return;
        const head = (c.covLimit ?? 6.5) - c.netDebt / Math.max(0.5, ebitdaOf(c));
        if (B.debt > 0 && head < 0.6) return;
        c.netDebt += B.debt;
        c[slot] = B.init;
      });
    });
  });

  /* 3 — Halbjahr simulieren */
  F.forEach((f) => {
    (f.holdings as Any[]).forEach((c) => {
      stepCompany(rng, c, mk, f.attrs.operations);
      if (rng.rnd() < 0.15) {
        const pool = EVENTS.filter((e) => !e.ok || e.ok(c, rng));
        if (pool.length) {
          const e = rng.pick(pool);
          const mitig = e.m && f.attrs[e.m as keyof typeof f.attrs] >= 4 && rng.rnd() < 0.5;
          if (!mitig) {
            e.f(c);
            const seat = e.t.startsWith("CEO") ? "ceo" : e.t.startsWith("CFO") ? "cfo" : null;
            if (!f.isAi) pushFeed(news, q, e.bad ? (seat ? "🚪" : "🔻") : "🔺", e.bad ? "neg" : "pos",
              `${c.name}: ${e.t}${seat ? " — die Position ist vakant." : ""}`, f.slot);
          }
        }
      }
    });
  });

  /* 3y — People */
  const newShortlists: { uid: string; name: string; seat: string; cands: Any[] }[] = [];
  F.forEach((f) => {
    (f.holdings as Any[]).forEach((c) => maturePeople(rng, c, mk, q, !f.isAi, news, newShortlists));
  });
  newShortlists.forEach((sl) => {
    const owner = F.find((f) => (f.holdings as Any[]).some((h) => h.uid === sl.uid));
    if (!owner || owner.isAi) return;
    const key = String(owner.slot);
    shortlistBySlot[key] = [...(shortlistBySlot[key] || []), {
      holdingUid: sl.uid, name: sl.name, seat: sl.seat as Any,
      candidates: sl.cands.map((cd: Any) => ({ label: cd.label, skill: cd.skill, dev: cd.dev, poach: cd.poach, note: cd.note })),
    }];
  });

  /* 3z — Covenant Breach */
  F.forEach((f) => {
    f.holdings = (f.holdings as Any[]).filter((c) => {
      if ((c.breach || 0) >= 2) {
        if (!f.isAi) pushFeed(news, q, "☠️", "neg", `Covenant Breach bei ${c.name}: Enforcement durch die Kreditgeber.`, f.slot);
        f.realized = [...(f.realized as Any[]), { name: c.name + " (Covenant Breach)", moic: dealMoic(c, 0) }];
        return false;
      }
      if (!f.isAi && (c.breach || 0) === 1) pushFeed(news, q, "⚠️", "neg", `${c.name} reißt den Covenant. Noch ein Halbjahr bis zum Enforcement.`, f.slot);
      return true;
    });
  });

  /* 3a — Cash Sweep */
  F.forEach((f) => {
    (f.holdings as Any[]).forEach((c) => {
      if (c.netDebt < -0.5) {
        const sweep = -c.netDebt * (c.st ?? 1);
        c.netDebt = 0;
        c.cashOut = (c.cashOut || 0) + sweep;
        c.recapOut = (c.recapOut || 0) + sweep;
        applyProceeds(f, sweep, 0, q);
      }
    });
  });

  /* 3b — Management Fee */
  F.forEach((f) => {
    const base = q <= INVEST_PERIOD ? CAPITAL : (f.holdings as Any[]).reduce((s, c) => s + c.entryEquity, 0);
    const fee = (base * MGMT_FEE) / 2;
    spendFund(f, fee, q, true);
    f.fees = (f.fees || 0) + fee;
  });

  /* 4 — Markt */
  SECNAMES.forEach((s) => { mk[s] = clamp(mk[s] * (1 + rng.nrm(0.05)), SECTORS[s].m * 0.65, SECTORS[s].m * 1.4); });
  if (rng.rnd() < 0.18) {
    const s = rng.pick(SECNAMES);
    mk[s] = clamp(mk[s] * 1.18, 0, SECTORS[s].m * 1.5);
    pushFeed(news, q, "📈", "pos", `Multiple-Expansion in ${s}: Bewertungen ziehen deutlich an.`);
  }
  if (rng.rnd() < 0.14) {
    const s = rng.pick(SECNAMES);
    mk[s] = clamp(mk[s] * 0.84, SECTORS[s].m * 0.55, 99);
    F.forEach((f) => (f.holdings as Any[]).forEach((c) => {
      if (c.sector !== s) return;
      const lv = c.netDebt / Math.max(0.5, ebitdaOf(c));
      const stress = 1 + 0.22 * Math.max(0, lv - 3.0);
      c.revenue *= 1 - 0.12 * stress;
      c.margin -= 1.5 * stress;
      c.drift = (c.drift || 0) - 1.0;
      c.breach = c.netDebt / Math.max(0.5, ebitdaOf(c)) > (c.covLimit ?? 6.5) ? (c.breach || 0) + 1 : 0;
    }));
    pushFeed(news, q, "📉", "neg", `Sektorabschwung in ${s}: Multiple-Kontraktion, Umsätze brechen ein.`);
  }

  /* 4b — Periodenstand festhalten */
  F.forEach((f) => {
    (f.holdings as Any[]).forEach((c) => {
      const eb = ebitdaOf(c);
      c.hist = [...(c.hist || []), { rev: c.revenue, eb, nd: c.netDebt, mg: c.margin, ql: c.quality, eq: navValueOf(c, mk) + (c.cashOut || 0) }];
    });
  });

  /* 4c — Verkaufsprozesse reifen, Lock-ups laufen aus (für alle menschlichen Fondsplätze) */
  F.forEach((f) => {
    if (f.isAi) return;
    const key = String(f.slot);
    const resolved: ExitQueueItem[] = [];
    (f.holdings as Any[]).forEach((c) => {
      if (c.proc && q >= c.proc.resolveQ) {
        resolved.push({
          holdingUid: c.uid, name: c.name,
          offers: makeOffers(rng, c, mk, F as Any, f.attrs.negotiation, q),
        });
        c.proc = null;
      }
    });
    if (resolved.length) exitQueueBySlot[key] = [...(exitQueueBySlot[key] || []), ...resolved];
    f.holdings = (f.holdings as Any[]).filter((c) => {
      if (c.lockUntil && q >= c.lockUntil) {
        const val = fairOf(c, mk, f.attrs.negotiation, q) * (1 - BIL_FEE);
        applyProceeds(f, val, c.entryEquity, q);
        f.realized = [...(f.realized as Any[]), { name: c.name + " (Restbeteiligung)", moic: val / c.entryEquity }];
        pushFeed(news, q, val >= c.entryEquity ? "🔔" : "📉", val >= c.entryEquity ? "pos" : "neg",
          `Lock-up bei ${c.name} ausgelaufen — Restbeteiligung platziert.`, f.slot);
        return false;
      }
      return true;
    });
  });

  /* 5 — KI-Exits */
  F.forEach((f) => {
    if (!f.isAi) return;
    const a = botOf(f)!;
    f.holdings = (f.holdings as Any[]).filter((c) => {
      const val = fairOf(c, mk, f.attrs.negotiation, q);
      const mo = val / Math.max(0.01, c.entryEquity);
      const irr = Math.pow(Math.max(0.05, mo), 2 / Math.max(1, c.holdQ)) - 1;
      const hurdle = a.key === "fin" ? 0.18 : a.key === "ops" ? 0.22 : 0.20;
      const patience = (a.key === "ops" ? 10 : 9) - (PERIODS - q <= 6 ? 2 : 0);
      if (c.holdQ >= 6 && (irr > hurdle || c.holdQ >= patience || PERIODS - q <= 2)) {
        const net = val * (1 - PROC_FEE);
        applyProceeds(f, net, c.entryEquity, q);
        f.realized = [...(f.realized as Any[]), { name: c.name, moic: net / c.entryEquity }];
        return false;
      }
      return true;
    });
  });

  /* Neuer Dealflow für das nächste Halbjahr. Getrieben vom Sourcing des
     Fondsplatzes 0 — exakt dieselbe Regel wie im Original (dort gab es nur
     einen Menschen, immer an Platz 0). */
  const sourcingLead = F[0].attrs.sourcing;
  const n = 0.55 * sourcingLead;
  const props = Math.min(3, Math.floor(n) + (rng.rnd() < n % 1 ? 1 : 0));
  const nd: Any[] = [];
  for (let i = 0; i < 4; i++) nd.push(newDeal(rng, "process", mk));
  for (let i = 0; i < props; i++) nd.push(newDeal(rng, "prop", mk, sourcingLead));

  let landmark = input.state.landmark as Any;
  if (q === LM_ANNOUNCE && landmark) {
    pushFeed(news, q, "📣", "neu", `Trophy Asset angekündigt: ${landmark.name} kommt in zwei Halbjahren an den Markt.`);
  }
  if (q === LM_DEAL && landmark) {
    nd.unshift({ ...landmark, askMult: clamp(mk[landmark.sector] * (0.7 + 0.006 * landmark.quality) * 1.06, 5, 19) });
  }
  if (!landmark && q < LM_ANNOUNCE) {
    landmark = newLandmark(rng, mk);
  }

  let finalFunds = F;
  if (q >= PERIODS) {
    finalFunds = liquidateAll(F, mk, q, news);
  }

  return {
    state: {
      market: mk,
      funds: finalFunds,
      feed: [...input.state.feed, ...news],
      deals: nd,
      landmark,
      exitQueue: exitQueueBySlot,
      shortlist: shortlistBySlot,
    },
    feed: news,
  };
}

function liquidateAll(F: RuntimeFund[], mk: Record<string, number>, q: number, news: Any[]): RuntimeFund[] {
  return F.map((f) => {
    const g = cloneFund(f);
    (g.holdings as Any[]).forEach((c) => {
      const gross = Math.max(0, eqvOf(c, markMultiple(c, mk) - LIQ_DISC));
      const net = gross * (1 - BIL_FEE);
      applyProceeds(g, net, c.entryEquity, q);
      g.realized = [...(g.realized as Any[]), { name: c.name + " (Tail-End)", moic: dealMoic(c, net) }];
      if (!g.isAi) {
        const mo = net / c.entryEquity;
        pushFeed(news, q, mo >= 1 ? "⏳" : "💀", mo >= 1 ? "neu" : "neg",
          `Tail-End-Verwertung: ${c.name} zum Laufzeitende veräußert — ${mo.toFixed(2)}× auf das eingesetzte Eigenkapital.`, g.slot);
      }
    });
    g.holdings = [];
    return g;
  });
}
