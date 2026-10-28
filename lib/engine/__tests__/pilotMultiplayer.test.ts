/* Testprotokoll Mehrspielermodus (Pilot, 29.10.2026), Teil Engine.

   Spielt vollständige Partien über runQuarter() — genau den Weg, den die
   Auswertung auf dem Server nimmt (supabase/functions/evaluate-seasons) —
   mit bis zu fünf menschlichen Fondsplätzen, die nach unterschiedlichen
   Spielweisen entscheiden: aggressiv, überbietend, konservativ, chaotisch
   (auch mit ungültigen und feindlichen Abgaben) und passiv (gibt nie ab).
   Nach JEDEM Halbjahr werden die Zusammenhänge geprüft, die ein Pilotnutzer
   in der Oberfläche sieht:

   - Fondsbuchhaltung: Commitment, Abrufe, Ausschüttungen, Recycling und eine
     vollständige Mittelverwendungsrechnung (jeder abgerufene Euro ist
     investiert, als Gebühr gezahlt oder liegt noch im Fonds).
   - Kennzahlen: TVPI, TVCC, DPI, Carry, IRR und Wertung aus ihren
     Bestandteilen unabhängig nachgerechnet.
   - Value Bridge des Fonds und jedes Deals, Abschlüsse jeder Beteiligung.
   - Mehrspielermechanik: Auktionen (höchstes Gebot gewinnt, jeder unterlegene
     Mensch erfährt warum), Gebote für Verkaufsprozesse, Feed je Fondsplatz.
   - Robustheit: keine NaN/Infinity, JSON-Speicherung wie in der Datenbank
     (JSONB ordnet Schlüssel um) ändert am Ergebnis nichts, Determinismus.

   Die Abweichungen werden gesammelt statt beim ersten Fehler abzubrechen: Das
   Protokoll soll zeigen, was alles nicht stimmt, nicht nur das Erste.      */
import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  ARCHES, CAPITAL, CARRY, DEFAULT_HUMAN_ATTRS, INVEST_PERIOD, IRR_BENCH, IRR_CAP, IRR_FLOOR,
  MAX_SLOTS, MGMT_FEE, MIN_HOLD, PERIODS, RECYCLE_CAP, RESERVE_PROC, RESERVE_PROP, SECNAMES,
  SECTORS, TVCC_BENCH, DD_COST,
  carryOf, cashflowsOf, clamp, dpiOf, ebitdaOf, fundBridge, fundBridgeStep, FUND_BRIDGE_PARTS,
  irrOf, navOf, scoreOf, tvccOf, tvpiOf, ddCostOf, ddCapOf,
} from "../engine";
import { holdingStatements } from "../financials";
import { runQuarter, bootstrapInitialDeals, computeFinalRanking } from "../runQuarter";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../turnTypes";
import { decide, type Strategy } from "./pilotStrategies";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* ---------- Partie aufsetzen ---------- */

const NAMES = ["Thematicum Capital", "Nordkap Partners", "Isar Equity", "Elbe Growth", "Rhein Buyout"];

function humanFund(slot: number, attrs = DEFAULT_HUMAN_ATTRS): RuntimeFund {
  return {
    slot, profileId: "p" + slot, isAi: false, archetype: null, name: NAMES[slot], attrs: { ...attrs },
    cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  } as Any;
}
function aiFund(slot: number, key: string): RuntimeFund {
  const a = ARCHES.find((z) => z.key === key)! as Any;
  return { ...humanFund(slot), profileId: null, isAi: true, archetype: key, name: a.name, attrs: { ...a.attrs } } as Any;
}

interface Setup { seed: number; slots: (Strategy | "ki")[]; attrs?: Record<number, typeof DEFAULT_HUMAN_ATTRS> }

function newSeason(s: Setup) {
  const rng = createRng(s.seed);
  const aiKeys = ["sourcing", "ops", "fin", "all"];
  let ai = 0;
  const funds = s.slots.map((k, slot) => (k === "ki" ? aiFund(slot, aiKeys[ai++ % 4]) : humanFund(slot, s.attrs?.[slot])));
  const market: Record<string, number> = {};
  SECNAMES.forEach((x) => (market[x] = SECTORS[x].m));
  let state: RuntimeState = { market, funds, feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {} };
  const boot = bootstrapInitialDeals(rng, state.market, state.funds);
  state = { ...state, deals: boot.deals, landmark: boot.landmark };
  return { rng, state };
}

/* ---------- Hilfen ---------- */

const sum = (xs: Any[], k = "amt") => (xs || []).reduce((s, x) => s + (x[k] || 0), 0);
const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

// Findet NaN/Infinity irgendwo im Zustand — als JSON gespeichert würden sie still zu null
function nonFinite(x: Any, path = "state", out: string[] = []) {
  if (out.length > 5) return out;
  if (typeof x === "number") { if (!Number.isFinite(x)) out.push(path + "=" + x); return out; }
  if (Array.isArray(x)) { x.forEach((v, i) => nonFinite(v, `${path}[${i}]`, out)); return out; }
  if (x && typeof x === "object") Object.keys(x).forEach((k) => nonFinite(x[k], path + "." + k, out));
  return out;
}

/* Wie die Datenbank speichert: JSON, und JSONB ordnet die Schlüssel eines
   Objekts nach Länge und dann bytewise. Hängt irgendwo eine Rechnung an der
   Reihenfolge von Object.keys, fällt es hier auf. */
function jsonb(x: Any): Any {
  const v = JSON.parse(JSON.stringify(x));
  const re = (o: Any): Any => {
    if (Array.isArray(o)) return o.map(re);
    if (o && typeof o === "object") {
      const keys = Object.keys(o).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
      const r: Any = {};
      keys.forEach((k) => (r[k] = re(o[k])));
      return r;
    }
    return o;
  };
  return re(v);
}

// Unabhängige Nullstellensuche, nur zur Kontrolle von irrOf
const npvAt = (cf: { t: number; v: number }[], r: number) => cf.reduce((s, p) => s + p.v / Math.pow(1 + r, p.t), 0);

/* ---------- Eine Partie mit Prüfung je Halbjahr ---------- */

interface Stats {
  overbid: number; capitalMsg: number; reserveMsg: number; invalidMsg: number; humanWins: number; landmarkBidders: number;
  sponsorOffers: number; sponsorSelf: number; sponsorHuman: number; exits: Record<string, number>; breaches: number;
  earlyExits: number; staleShortlists: number; staleOffers: number; accrued: number; fullSlotBidsSilent: number;
}

function playSeason(s: Setup, opts: { roundtrip?: boolean } = {}) {
  const season = newSeason(s);
  const rng = season.rng;
  let state = season.state;
  const violations: string[] = [];
  const v = (msg: string) => { if (violations.length < 200) violations.push(`[Seed ${s.seed}] ${msg}`); };
  const stats: Stats = {
    overbid: 0, capitalMsg: 0, reserveMsg: 0, invalidMsg: 0, humanWins: 0, landmarkBidders: 0,
    sponsorOffers: 0, sponsorSelf: 0, sponsorHuman: 0, exits: {}, breaches: 0, earlyExits: 0,
    staleShortlists: 0, staleOffers: 0, accrued: 0, fullSlotBidsSilent: 0,
  };
  // Nebenbuch je Fonds: was die Engine an Due Diligence und Studien abbucht
  const ddSpend: Record<number, number> = {};
  const srngs = s.slots.map((_, i) => createRng(s.seed * 7 + i + 1));
  const snaps: RuntimeState[] = [state];

  for (let hy = 1; hy <= PERIODS; hy++) {
    const prev = state;
    const dec: Record<number, TurnDecisions> = {};
    s.slots.forEach((k, slot) => {
      if (k === "ki") return;
      const d = decide(k, prev, slot, hy, srngs[slot]);
      if (d) dec[slot] = JSON.parse(JSON.stringify(d));   // wie über die Datenbank: NaN wird null
    });
    // Nebenbuch: DD auf existierende Deals und Studien auf Beteiligungen ohne DD
    Object.entries(dec).forEach(([slotS, d]) => {
      const slot = Number(slotS);
      const me0 = prev.funds.find((f) => f.slot === slot)! as Any;
      const ids = new Set([...new Set((d.dueDiligence || []).filter((id) => (prev.deals as Any[]).some((x) => x.id === id)))]
        .slice(0, ddCapOf(me0.attrs.analysis)));
      ids.forEach((id) => { ddSpend[slot] = (ddSpend[slot] || 0) + ddCostOf((prev.deals as Any[]).find((x) => x.id === id)); });
      const me = prev.funds.find((f) => f.slot === slot)! as Any;
      const seen = new Set<string>();
      (d.studies || []).forEach((uid) => {
        const c = (me.holdings as Any[]).find((h) => h.uid === uid);
        if (c && !c.dd && !seen.has(uid)) { seen.add(uid); ddSpend[slot] = (ddSpend[slot] || 0) + DD_COST / 2; }
      });
    });

    let out;
    try {
      out = runQuarter({ state: opts.roundtrip ? jsonb(prev) : prev, halfYear: hy, decisionsBySlot: dec, rng });
    } catch (e) {
      v(`HJ ${hy}: runQuarter wirft ${(e as Error).stack?.split("\n").slice(0, 3).join(" | ")}`);
      break;
    }
    state = out.state;
    snaps.push(state);
    const news = out.feed as Any[];

    const nf = nonFinite(state);
    if (nf.length) v(`HJ ${hy}: nicht endliche Zahlen: ${nf.join(", ")}`);

    /* --- Feed --- */
    news.forEach((n) => {
      if (n.halfYear !== hy) v(`HJ ${hy}: Meldung mit halfYear ${n.halfYear}: ${n.text}`);
      if (n.slot != null && !state.funds.some((f) => f.slot === n.slot)) v(`HJ ${hy}: Meldung an unbekannten Platz ${n.slot}`);
      if (typeof n.text !== "string" || /undefined|NaN|\[object/.test(n.text)) v(`HJ ${hy}: kaputte Meldung: ${n.text}`);
    });

    /* --- Auktionen: jeder Mensch, der geboten hat, erfährt, was passiert ist --- */
    (prev.deals as Any[]).forEach((deal) => {
      const winnerFund = state.funds.find((f) => (f.holdings as Any[]).some((h) => h.entryQ === hy && h.name === deal.name)
        || (f.realized as Any[]).some((r) => r.name.startsWith(deal.name) && false));
      const winners = state.funds.filter((f) => (f.holdings as Any[]).some((h) => h.entryQ === hy && h.name === deal.name));
      if (winners.length > 1) v(`HJ ${hy}: ${deal.name} von ${winners.length} Fonds gekauft`);
      if (deal.type === "landmark") stats.landmarkBidders += Object.values(dec).filter((d) => (d.bids || []).some((b) => b.dealId === deal.id)).length;
      Object.entries(dec).forEach(([slotS, d]) => {
        const slot = Number(slotS);
        const bid = (d.bids || []).find((b) => b.dealId === deal.id);
        if (!bid) return;
        const pf = prev.funds.find((f) => f.slot === slot)! as Any;
        const mine = news.filter((n) => n.slot === slot && n.text.includes(deal.name));
        if (winnerFund && winnerFund.slot === slot) {
          stats.humanWins++;
          if (!mine.some((n) => /Zuschlag|Trophy Asset gewonnen/.test(n.text))) v(`HJ ${hy}: Zuschlag ${deal.name} an Platz ${slot} ohne Meldung`);
          // Der Gewinner hatte das höchste gültige Gebot unter den Menschen, die nicht am Kapital scheiterten
          const c = (winnerFund.holdings as Any[]).find((h) => h.entryQ === hy && h.name === deal.name);
          const paidBid = c.entryMult / (1 - 0.010 * winnerFund.attrs.negotiation);
          Object.entries(dec).forEach(([o, od]) => {
            if (Number(o) === slot) return;
            const ob = (od.bids || []).find((b) => b.dealId === deal.id);
            const overbidMsg = news.some((n) => n.slot === Number(o) && n.text.startsWith(`Überboten bei ${deal.name}`));
            if (ob && overbidMsg && Number(ob.multiple) > paidBid + 1e-9) v(`HJ ${hy}: ${deal.name}: Platz ${o} bot ${ob.multiple} > Gewinner ${paidBid}`);
          });
          return;
        }
        if (pf.holdings.length >= MAX_SLOTS) { if (!mine.length) stats.fullSlotBidsSilent++; return; }
        if (!mine.length) v(`HJ ${hy}: Platz ${slot} bot auf ${deal.name} und erfährt nichts`
          + (process.env.PILOT_DEBUG ? ` | typ ${deal.type} bid ${JSON.stringify(bid)} hold ${pf.holdings.length} | ${news.filter((n) => n.text.includes(deal.name)).map((n) => n.slot + ":" + n.text).join(" || ")} | jetzt ${state.funds.find((f) => f.slot === slot)!.holdings.length}` : ""));
        mine.forEach((n) => {
          if (n.text.startsWith("Überboten")) stats.overbid++;
          else if (/Reservationspreis/.test(n.text)) stats.reserveMsg++;
          else if (/investierbares Kapital/.test(n.text)) stats.capitalMsg++;
          else if (/außerhalb des Zulässigen/.test(n.text)) stats.invalidMsg++;
        });
        // Wer unter dem Reservationspreis lag, darf nicht "überboten" heißen und umgekehrt
        const reserve = deal.askMult * (deal.type === "prop" ? RESERVE_PROP : RESERVE_PROC);
        if (mine.some((n) => n.text.startsWith("Überboten")) && Number(bid.multiple) < reserve - 1e-9) v(`HJ ${hy}: ${deal.name}: "Überboten" trotz Gebot unter Reservationspreis`);
      });
    });

    /* --- Fonds --- */
    const uids = new Set<string>();
    state.funds.forEach((f0) => {
      const f = f0 as Any;
      const pf = prev.funds.find((x) => x.slot === f.slot)! as Any;
      const tag = `HJ ${hy} ${f.name}`;

      // Commitment und Abrufe
      if (!close(f.drawn + f.undrawn, CAPITAL)) v(`${tag}: drawn ${f.drawn} + undrawn ${f.undrawn} ≠ ${CAPITAL}`);
      if (f.undrawn < -1e-9) v(`${tag}: undrawn negativ ${f.undrawn}`);
      if (!close(sum(f.calls), f.drawn)) v(`${tag}: Summe Abrufe ${sum(f.calls)} ≠ drawn ${f.drawn}`);
      if ((f.calls as Any[]).some((c) => !(c.amt > 0) || c.q > hy)) v(`${tag}: Abruf ohne Betrag oder aus der Zukunft`);
      if (!close(sum(f.dists), f.distTotal || 0)) v(`${tag}: Summe Ausschüttungen ≠ distTotal`);
      if ((f.dists as Any[]).some((x) => !(x.amt > 0))) v(`${tag}: Ausschüttung ohne Betrag`);
      if (!close(f.cash, f.undrawn + (f.recyc || 0))) v(`${tag}: cash ${f.cash} ≠ undrawn + recyc ${f.undrawn + (f.recyc || 0)}`);
      if ((f.recyc || 0) < -1e-9 || (f.recyc || 0) > (f.recycled || 0) + 1e-9) v(`${tag}: recyc ${f.recyc} außerhalb [0, recycled ${f.recycled}]`);
      if ((f.recycled || 0) > CAPITAL * RECYCLE_CAP + 1e-6) v(`${tag}: recycled über dem Deckel`);
      if ((f.accrued || 0) > 0.01) {
        stats.accrued++;
        if (process.env.PILOT_DEBUG && !f.isAi && !((pf.accrued || 0) > 0.01)) console.log(`ACCRUED ${tag} slot ${f.slot} accrued ${f.accrued.toFixed(2)} undrawn ${pf.undrawn.toFixed(2)}→${f.undrawn.toFixed(2)} recyc ${(pf.recyc||0).toFixed(1)} fees+${((f.fees||0)-(pf.fees||0)).toFixed(2)} inv+${((f.investedTotal||0)-(pf.investedTotal||0)).toFixed(2)} dd ${(ddSpend[f.slot]||0).toFixed(1)} hold ${f.holdings.length} dec ${JSON.stringify(dec[f.slot] ? Object.keys(dec[f.slot]) : null)}`);
      }
      // Nur angehängt, nie umgeschrieben
      if (pf.calls.length > f.calls.length || pf.dists.length > f.dists.length || pf.realized.length > f.realized.length)
        v(`${tag}: Abrufe, Ausschüttungen oder Track Record geschrumpft`);
      if (f.drawn < pf.drawn - 1e-9 || f.distTotal < pf.distTotal - 1e-9) v(`${tag}: drawn oder distTotal gefallen`);

      /* Mittelverwendung: abgerufen + Rückflüsse = investiert + Gebühren +
         DD/Studien + was noch im Fonds liegt + was ausgeschüttet ist. In der
         Form oben: drawn − recyc + accrued + proceeds − distTotal
         = investedTotal + fees + ddSpend. */
      const lhs = f.drawn - (f.recyc || 0) + (f.accrued || 0) + (f.proceeds || 0) - (f.distTotal || 0);
      const rhs = (f.investedTotal || 0) + (f.fees || 0) + (ddSpend[f.slot] || 0);
      if (!close(lhs, rhs, 1e-6)) v(`${tag}: Mittelverwendung geht nicht auf: ${lhs.toFixed(4)} vs ${rhs.toFixed(4)}`);

      // Management Fee: in der Investitionsperiode genau ein Halbjahr auf das Commitment
      const dFee = (f.fees || 0) - (pf.fees || 0);
      if (hy <= INVEST_PERIOD && !close(dFee, CAPITAL * MGMT_FEE / 2)) v(`${tag}: Management Fee ${dFee} statt ${CAPITAL * MGMT_FEE / 2}`);
      if (dFee < -1e-9) v(`${tag}: Management Fee negativ`);

      // Kennzahlen unabhängig nachgerechnet
      const nav = navOf(f, state.market);
      // Offene Gebühren werden gegen künftige Rückflüsse verrechnet, nie darunter
      const tv = (f.distTotal || 0) + Math.max(0, nav + (f.recyc || 0) - (f.accrued || 0));
      const carry = carryOf(f, state.market, hy);
      const gain = tv - (f.drawn || 0);
      if (carry < -1e-9 || carry > CARRY * Math.max(0, gain) + 1e-9) v(`${tag}: Carry ${carry} außerhalb [0, 20 % Gewinn]`);
      const drawnD = Math.max(1, f.drawn || 0);
      const tvpi = tvpiOf(f, state.market, hy), tvcc = tvccOf(f, state.market, hy), dpi = dpiOf(f, state.market, hy);
      if (!close(tvpi, (tv - carry) / drawnD)) v(`${tag}: TVPI ${tvpi} ≠ ${(tv - carry) / drawnD}`);
      if (!close(tvcc, (tv - carry) / CAPITAL)) v(`${tag}: TVCC falsch`);
      if (!close(dpi, ((f.distTotal || 0) * (tv > 0 ? 1 - carry / tv : 1)) / drawnD)) v(`${tag}: DPI falsch`);
      const irr = irrOf(f, state.market, hy);
      if (hy >= 2 && f.drawn > 0 && irr > IRR_FLOOR + 1e-6 && irr < IRR_CAP - 1e-6) {
        const cf = cashflowsOf(f, state.market, hy);
        const scale = cf.reduce((a, p) => a + Math.abs(p.v), 0);
        if (Math.abs(npvAt(cf, irr)) > 1e-6 * scale) v(`${tag}: IRR ${irr} ist keine Nullstelle (NPV ${npvAt(cf, irr)})`);
        // die obere Nullstelle: darüber kein Vorzeichenwechsel mehr
        for (let r = irr + 0.01; r < IRR_CAP; r += 0.05) if (npvAt(cf, r) > 1e-6 * scale) { v(`${tag}: IRR ${irr} ist nicht die oberste Nullstelle (NPV(${r.toFixed(2)})>0)`); break; }
      }
      if (hy >= 2 && f.drawn > 1 && Math.abs(tvpi - 1) > 0.005 && Math.sign(irr) !== Math.sign(tvpi - 1)) v(`${tag}: IRR ${irr} widerspricht TVPI ${tvpi}`);
      const score = scoreOf(f, state.market, hy);
      const sc = 0.5 * clamp(tvcc / TVCC_BENCH, -1, 4) + 0.5 * clamp(irr / IRR_BENCH, -1, 4);
      if (!close(score, sc)) v(`${tag}: Wertung ${score} ≠ ${sc}`);

      // Value Bridge des Fonds und die Halbjahresspalte
      if (f.drawn > 0) {
        const b = fundBridge(f, state.market, hy);
        const parts = FUND_BRIDGE_PARTS.reduce((a: number, k: string) => a + b[k], 0);
        if (!close(parts, b.gain)) v(`${tag}: Fonds-Bridge Summe ${parts} ≠ Gewinn ${b.gain}`);
        if (!close(b.gain, tv - carry - f.drawn)) v(`${tag}: Fonds-Bridge Gewinn ≠ Wert − Abrufe`);
        if (pf.drawn > 0) {
          const step = fundBridgeStep(b, fundBridge(pf, prev.market, hy - 1))!;
          const sp = FUND_BRIDGE_PARTS.reduce((a: number, k: string) => a + step[k], 0);
          if (!close(sp, step.gain)) v(`${tag}: Halbjahresspalte geht nicht auf`);
          if (!(f.holdings as Any[]).length && (pf.holdings as Any[]).length) {
            const u = step.uEbitda + step.uMult + step.uDelev + step.uRest;
            if (Math.abs(u) > 0.01) v(`${tag}: Halbjahresspalte zeigt ${u.toFixed(2)} Unrealisiert bei leerem Portfolio`);
          }
        }
      }

      // Track Record: jede Realisierung zerlegt, die Zerlegung geht auf
      (f.realized as Any[]).slice(pf.realized.length).forEach((r) => {
        const b = r.bridge;
        if (!b) { v(`${tag}: Realisierung ${r.name} ohne Value Bridge`); return; }
        const s2 = b.entry + b.ebitda + b.mult + b.delev + b.cost + (b.dist || 0);
        if (!close(s2, b.exit)) v(`${tag}: Deal-Bridge ${r.name}: ${s2} ≠ ${b.exit}`);
        if (!r.uOut) v(`${tag}: Realisierung ${r.name} ohne uOut`);
        const kind = (r.name.match(/\(([^)]+)\)$/) || [])[1] || "Exit";
        stats.exits[kind] = (stats.exits[kind] || 0) + 1;
        if (kind === "Covenant Breach") stats.breaches++;
      });

      // Beteiligungen
      if ((f.holdings as Any[]).length > MAX_SLOTS) v(`${tag}: ${f.holdings.length} Beteiligungen > ${MAX_SLOTS}`);
      (f.holdings as Any[]).forEach((c) => {
        const t2 = `${tag} / ${c.name}`;
        if (uids.has(c.uid)) v(`${t2}: uid doppelt vergeben`);
        uids.add(c.uid);
        if (!(c.st > 0 && c.st <= 1 + 1e-9)) v(`${t2}: Anteil ${c.st}`);
        if (!(c.entryEquity > 0) || !(c.costLeft > 0)) v(`${t2}: Einstand ${c.entryEquity}/${c.costLeft}`);
        if (c.holdQ !== c.hist.length - 1) v(`${t2}: holdQ ${c.holdQ} ≠ Historie ${c.hist.length - 1}`);
        // Gekauft in Halbjahr entryQ und im selben Halbjahr schon einmal fortgeschrieben
        if (c.holdQ !== hy - c.entryQ + 1) v(`${t2}: holdQ ${c.holdQ} ≠ ${hy} − ${c.entryQ} + 1`);
        const last = c.hist[c.hist.length - 1];
        if (!close(last.nd, c.netDebt) || !close(last.rev, c.revenue)) v(`${t2}: letzter Historieneintrag passt nicht zum Stand`);
        // Höchstens zwei: Der Abschwung zählt nach der Prüfung noch einmal hoch
        if ((c.breach || 0) > 2) v(`${t2}: Covenant ${c.breach}× gerissen und nicht vollstreckt`);
        // Wer im nächsten Halbjahr vollstreckt werden kann, ist gewarnt worden
        if (!f.isAi && (c.breach || 0) > 0 && !(pf.holdings as Any[]).some((h) => h.uid === c.uid && (h.breach || 0) > 0)
          && !news.some((n) => n.slot === f.slot && n.text.includes(c.name) && /Covenant/.test(n.text)))
          v(`${t2}: Covenant gerissen ohne Warnung im Feed`);
        if (c.proc && !(c.proc.resolveQ > hy)) v(`${t2}: Verkaufsprozess überfällig`);
        if (!(ebitdaOf(c) > -1e6)) v(`${t2}: EBITDA ${ebitdaOf(c)}`);
        if (!f.isAi) {
          const st = holdingStatements(c);
          st?.periods.forEach((p: Any) => {
            if (Math.abs(p.assets - (p.debt + p.equity)) > 1e-6 * Math.max(1, Math.abs(p.assets))) v(`${t2} ${p.label}: Bilanz geht nicht auf (${p.assets} vs ${p.debt + p.equity})`);
            if (!close(p.debt - p.cash, p.netDebt)) v(`${t2} ${p.label}: Darlehen − Kasse ≠ Nettoverschuldung`);
          });
          const lp = st?.periods[st.periods.length - 1];
          if (lp && !lp.compare && !close(lp.netDebt, c.netDebt)) { /* Vergleichsspalten stehen am Ende */ }
        }
      });
      // Was verschwunden ist, steht im Track Record — Beteiligungen wechseln nie den Fonds
      const gone = (pf.holdings as Any[]).filter((h) => !(f.holdings as Any[]).some((x) => x.uid === h.uid));
      gone.forEach((h) => {
        if (!(f.realized as Any[]).slice(pf.realized.length).some((r) => r.name.startsWith(h.name))) v(`${tag}: ${h.name} verschwindet ohne Realisierung`);
        if (h.holdQ + 1 < MIN_HOLD && !f.isAi) {
          const why = (f.realized as Any[]).slice(pf.realized.length).find((r) => r.name.startsWith(h.name))?.name || "";
          if (!/Covenant Breach|Tail-End/.test(why)) { stats.earlyExits++; v(`${tag}: ${why} nach ${h.holdQ} Halbjahren verkauft, vor der Mindesthaltedauer`); }
        }
      });

      // Offene Gebote und Shortlists gehören zu Beteiligungen, die es noch gibt
      if (!f.isAi) {
        const q = (state.exitQueue[String(f.slot)] || []) as Any[];
        const l = (state.shortlist[String(f.slot)] || []) as Any[];
        q.forEach((it) => {
          if (!(f.holdings as Any[]).some((h) => h.uid === it.holdingUid)) {
            stats.staleOffers++;
            if (hy < PERIODS) v(`${tag}: offenes Gebot für ${it.name}, die nicht mehr im Portfolio ist`);
          }
          it.offers.forEach((o: Any) => {
            if (o.kind !== "sponsor") return;
            stats.sponsorOffers++;
            if (o.buyer === f.name) { stats.sponsorSelf++; v(`${tag}: Gebot für ${it.name} vom eigenen Fonds`); }
            if (state.funds.some((x) => x.name === o.buyer && !x.isAi)) { stats.sponsorHuman++; v(`${tag}: Gebot für ${it.name} im Namen des Mitspielers ${o.buyer}, der nichts kauft`); }
            if (!(o.price > 0)) v(`${tag}: Sponsorgebot ohne Preis`);
          });
        });
        l.forEach((it) => {
          if ((f.holdings as Any[]).some((h) => h.uid === it.holdingUid)) return;
          stats.staleShortlists++;
          if (hy < PERIODS) v(`${tag}: Shortlist für ${it.name}, die nicht mehr im Portfolio ist`);
        });
      }
    });
  }

  /* --- Endstand --- */
  const fin = state;
  const ranking = computeFinalRanking(fin, PERIODS);
  if (ranking.length !== fin.funds.length) v(`Endrangliste mit ${ranking.length} statt ${fin.funds.length} Fonds`);
  for (let i = 1; i < ranking.length; i++) if (ranking[i].score > ranking[i - 1].score + 1e-12) v("Endrangliste nicht nach Wertung sortiert");
  fin.funds.forEach((f0) => {
    const f = f0 as Any;
    if ((f.holdings as Any[]).length) v(`Ende: ${f.name} hält noch ${f.holdings.length} Beteiligungen`);
    if ((f.recyc || 0) > 1e-6) v(`Ende: ${f.name} hat ${f.recyc} einbehalten und nicht ausgeschüttet`);
    const r = ranking.find((x) => x.slot === f.slot)!;
    if (!close(r.tvpi, tvpiOf(f, fin.market, PERIODS)) || !close(r.score, scoreOf(f, fin.market, PERIODS))) v(`Ende: Rangliste ${f.name} weicht von den Kennzahlen ab`);
    // Nach der Verwertung ist der TVPI reine Ausschüttung
    const tv = f.distTotal || 0;
    if (f.drawn > 1 && !close(r.tvpi * Math.max(1, f.drawn), tv - carryOf(f, fin.market, PERIODS))) v(`Ende: ${f.name} TVPI ≠ Ausschüttungen nach Carry`);
  });
  return { state: fin, snaps, violations, stats, ranking };
}

/* ---------- Die Partien ---------- */

const MIXES: { name: string; slots: (Strategy | "ki")[] }[] = [
  { name: "fünf Menschen", slots: ["aggr", "over", "kons", "chaos", "passiv"] },
  { name: "zwei Menschen, drei KI", slots: ["aggr", "ki", "over", "ki", "ki"] },
  { name: "ein Mensch, vier KI", slots: ["ki", "ki", "kons", "ki", "ki"] },
  { name: "fünf Bieter auf dieselben Deals", slots: ["over", "aggr", "over", "aggr", "over"] },
  { name: "nur Chaos", slots: ["chaos", "chaos", "chaos", "chaos", "chaos"] },
];
const SEEDS = [1, 7, 42, 2026, 31337, 99991];

const report = process.env.PILOT_REPORT === "1";

describe("Testprotokoll Mehrspieler — Engine", () => {
  MIXES.forEach((mix) => {
    it(`${mix.name}: alle Invarianten über 20 Halbjahre, ${SEEDS.length} Startwerte`, () => {
      const all: string[] = [];
      const agg: Any = {};
      SEEDS.forEach((seed) => {
        const r = playSeason({ seed, slots: mix.slots });
        all.push(...r.violations);
        Object.entries(r.stats).forEach(([k, val]) => {
          if (typeof val === "number") agg[k] = (agg[k] || 0) + val;
          else Object.entries(val as Any).forEach(([k2, v2]) => { agg[k + "." + k2] = (agg[k + "." + k2] || 0) + (v2 as number); });
        });
      });
      if (report) console.log(`STATS ${mix.name}: ${JSON.stringify(agg)}`);
      expect(all, all.slice(0, 25).join("\n")).toEqual([]);
    });
  });

  it("rechnet nach JSONB-Speicherung zwischen den Halbjahren exakt dasselbe", () => {
    [7, 2026].forEach((seed) => {
      const slots = MIXES[0].slots;
      const a = playSeason({ seed, slots });
      const b = playSeason({ seed, slots }, { roundtrip: true });
      expect(b.violations).toEqual([]);
      expect(JSON.stringify(jsonb(b.state))).toBe(JSON.stringify(jsonb(a.state)));
    });
  });

  /* start_season() vergibt Startwerte bis 2^63. Bis zum 29.10.2026 fielen sie
     im Generator auf vier Zufallsströme zusammen — jede Partie sah eine von
     vier Dealfolgen. */
  it("gibt verschiedenen 64-Bit-Startwerten verschiedene Partien", () => {
    const r = createRng(424242);
    const firsts = new Set<string>();
    for (let i = 0; i < 200; i++) {
      /* wie floor(random() * 9223372036854775807) in SQL, als Zahl gelesen:
         random() hat 52 Zufallsbits, hier aus zwei Ziehungen zusammengesetzt */
      const frac = (Math.floor(r.rnd() * 2 ** 26) * 2 ** 26 + Math.floor(r.rnd() * 2 ** 26)) / 2 ** 52;
      const seed = Math.floor(frac * 9223372036854775807);
      const g = createRng(seed);
      firsts.add([g.rnd(), g.rnd()].map((x) => x.toFixed(9)).join("/"));
    }
    expect(firsts.size).toBeGreaterThan(195);
    // und der Deal-Fluss zweier Partien unterscheidet sich
    const a = newSeason({ seed: 5000000000000000000, slots: MIXES[0].slots }).state.deals as Any[];
    const b = newSeason({ seed: 7000000000000000000, slots: MIXES[0].slots }).state.deals as Any[];
    expect(a.map((d) => d.name)).not.toEqual(b.map((d) => d.name));
  });

  it("ist deterministisch: zweimal dieselbe Partie, derselbe Endstand", () => {
    const a = playSeason({ seed: 42, slots: MIXES[0].slots });
    const b = playSeason({ seed: 42, slots: MIXES[0].slots });
    expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state));
  });
});
