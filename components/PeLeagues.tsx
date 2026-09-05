"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";

/* ---------------- Spiellogik ----------------
   SECTORS, ARCHES, CAPITAL, MAX_SLOTS und die übrigen Parameter sowie alle
   reinen Rechenfunktionen (newDeal, stepCompany, buildInit, navOf, irrOf, ...)
   leben jetzt React-frei in lib/engine/ und laufen dort auch auf dem Server.
   createRng() liefert je Partie eine eigene Zufallsinstanz — kein geteilter
   Modul-Zustand mehr, der parallele Partien gegenseitig stören könnte.       */
import { createRng } from "@/lib/engine";
import type { Rng } from "@/lib/engine";
import {
  ADDON_HEADROOM, AI_PLAN, ARCHES, BASE_RATE, BIL_DISC, BIL_FEE, CAPITAL, COV_DEFAULT, COV_FLOOR,
  COV_HEADROOM, CV_DISC, CV_FEE, CV_STAKE, DD_COST, DEFAULT_HUMAN_ATTRS, ENTRY_FEE, EVENTS, EVENT_P,
  INIT_SLOTS, INVEST_PERIOD, IPO_DISC, IPO_FEE, IPO_PLACE, LIQ_DISC, LM_ANNOUNCE, LM_DEAL,
  LTIP_SHARE, MAX_SLOTS, MGMT_FEE, MIN_HOLD, PERIODS, PROC_FEE, PROC_Q, REPEAT_MAX, RESERVE_PROC,
  RESERVE_PROP, ROLE3, SECCOLOR, SECNAMES, SECTORS, applyProceeds, bookOff, buildInit,
  chargeOff, clamp, ddCapOf, ddCostOf, dealMoic, periodFin, resetPeriod, dealMultiple, dpiOf,
  ebitdaOf, eqvOf, eur, fairOf, feeReserveOf, fitOf, gebote, grossMoicOf, healthOf, hj, initRuns,
  initsOf, investableOf, irrOf, makeBridge, makeOffers, makeSeats, markMultiple, maturePeople,
  navValueOf, newDeal, newLandmark, overstretch, payOf, pct, recycleRoom, retainerOf, scoreOf,
  seatLoad, severanceOf, signBonusOf, spendFund, stepCompany, tvpiOf, x,
} from "@/lib/engine";

import {
  TAB_ICON, TAB_IDX, CSS, haptic, AnimatedNumber, Confetti, Toasts, News, DealCard, Holding, Track,
  TvpiChart, SectorSplit, Shelf, MarketChart, UseProceeds, InitPicker, Shortlist, Offers, Sheet,
  FundProfileEditor,
} from "@/components/pel/ui";

export default function PeLeagues() {
  const [phase, setPhase] = useState("setup");
  const [attrs, setAttrs] = useState({ ...DEFAULT_HUMAN_ATTRS });
  const [tab, setTab] = useState("deals");
  const [quarter, setQuarter] = useState(0);
  const [market, setMarket] = useState(() => { const m = {}; SECNAMES.forEach((s) => (m[s] = SECTORS[s].m)); return m; });
  const [funds, setFunds] = useState([]);
  const [deals, setDeals] = useState([]);
  const [bids, setBids] = useState({});
  const [feed, setFeed] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [dark, setDark] = useState(true);
  const [dd, setDd] = useState({});
  const [landmark, setLandmark] = useState(null);
  const [openFund, setOpenFund] = useState(null);
  const [exitQueue, setExitQueue] = useState([]);
  const [marketHist, setMarketHist] = useState([]);
  const [tvpiHist, setTvpiHist] = useState([]);   // je Halbjahr eine Wertungszahl pro Fonds
  const [shortlist, setShortlist] = useState([]);
  const [initPick, setInitPick] = useState(null);
  const [useProceeds, setUseProceeds] = useState(null);   // offene Verwendungsentscheidung
  const [rolling, setRolling] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [burst, setBurst] = useState(0);
  const [streak, setStreak] = useState(0);
  const prevScoreRef = React.useRef(null);
  /* Eine Zufallsinstanz je Partie (Komponenteninstanz) — kein geteilter
     Modul-Zustand mehr. Startwert entspricht dem bisherigen Default. */
  const rngRef = React.useRef<Rng | null>(null);
  if (!rngRef.current) rngRef.current = createRng(20260803);
  const rng = rngRef.current;

  const me = funds[0];

  useEffect(() => { window.scrollTo(0, 0); }, [tab, quarter]);

  function pushToast(t, tone) {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p.slice(-2), { id, t, tone }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 2900);
  }
  function fireConfetti() { setBurst((b) => b + 1); haptic([10, 30, 10]); }

  function start() {
    haptic([10, 20, 10]);
    const base = {
      cash: CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
      // Kapitalkonten: cash = undrawn + recyc, jederzeit
      undrawn: CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
    };
    const player = { id: 0, name: "Fonds I", me: true, ...base, attrs: { ...attrs } };
    const ais = ARCHES.map((a, i) => ({ id: i + 1, name: a.name, me: false, arch: a, ...base, attrs: a.attrs }));
    setFunds([player, ...ais]);
    setDeals(makeDeals(attrs.sourcing, market));
    setLandmark(newLandmark(rng, market));
    setMarketHist([{ ...market }]);
    setTvpiHist([[player, ...ais].map(() => 0)]);
    setFeed([{ q: 0, e: "🏁", tone: "neu", t: `Vintage 2026 aufgelegt. Fünf Fonds, je ${eur(CAPITAL)}, zehn Jahre.` }]);
    setPhase("play");
  }

  /* Benchmarkstudie nach dem Closing: liefert nachträglich die Branchenreferenz,
     kostet aber die Hälfte einer DD zusätzlich zum bereits gezahlten Preis. */
  function runStudy(uid) {
    haptic(8);
    const c = me.holdings.find((h) => h.uid === uid);
    setFunds((F) => F.map((f, i) => {
      if (i !== 0) return f;
      const g = { ...f, holdings: f.holdings.map((h) => h.uid === uid ? { ...h, dd: true } : h) };
      spendFund(g, DD_COST / 2, quarter, true);
      return g;
    }));
    if (c) setFeed((p) => [{ q: quarter, e: "📊", tone: "neu",
      t: `<b>${c.name}</b>: Benchmarkstudie beauftragt — Branchenmarge ${pct(c.benchMargin)}, Marktwachstum ${pct(SECTORS[c.sector].g)}.` }, ...p]);
  }

  function runDD(dealId) {
    haptic(8);
    const d = deals.find((x2) => x2.id === dealId);
    if (!d) return;
    const cost = ddCostOf(d);
    setFunds((F) => F.map((f, i) => { if (i !== 0) return f; const g = { ...f }; spendFund(g, cost, quarter, true); return g; }));
    setDd((p) => ({ ...p, [dealId]: true }));
  }

  /* Vorher: Math.round(sourcing * 0,6). Das erzeugte tote Stufen — 1 und 2
     lieferten identisch einen Deal, 3 und 4 identisch zwei. Zwei von fünf
     Punkten waren wirkungslos. Jetzt ist die Zuführung stetig im Erwartungswert:
     0,55 Deals je Punkt, der Nachkommateil entscheidet per Zufall.           */
  function makeDeals(sourcing, mk) {
    const n = 0.55 * sourcing;
    const props = Math.min(3, Math.floor(n) + (rng.rnd() < n % 1 ? 1 : 0));
    const out = [];
    for (let i = 0; i < 4; i++) out.push(newDeal(rng, "process", mk));
    for (let i = 0; i < props; i++) out.push(newDeal(rng, "prop", mk, sourcing));
    return out;
  }

  // Kurze, spürbare Verzögerung vor der Auflösung — Spannung statt Sofortergebnis
  function closeQuarter() {
    if (rolling) return;
    haptic(14);
    setRolling(true);
    setTimeout(() => { runQuarter(); setRolling(false); }, 620);
  }

  function runQuarter() {
    const F = funds.map((f) => ({ ...f, holdings: f.holdings.map((c) => ({ ...c })), realized: [...f.realized] }));
    const mk = { ...market };
    const news = [];
    const q = quarter + 1;

    /* 1 — Auktionen */
    deals.forEach((d) => {
      const entries = [];
      const b = bids[d.id];
      if (b && F[0].holdings.length < MAX_SLOTS) {
        const ev = ebitdaOf(d) * b.mult;
        const eq = ev - ebitdaOf(d) * b.lev + ev * ENTRY_FEE;
        if (eq <= investableOf(F[0], quarter)) entries.push({ f: 0, mult: b.mult, lev: b.lev, eq });
      }
      F.forEach((f, i) => {
        if (i === 0 || f.holdings.length >= MAX_SLOTS) return;
        const a = f.arch;
        /* Auch die anderen Fonds haben Origination. Ein Off-Market-Deal ist kein
           Naturschutzgebiet: je stärker deren Sourcing, desto häufiger sitzt
           jemand mit am Tisch. Das nimmt dem proprietären Kanal die Garantie,
           ohne ihm den Vorteil zu nehmen.                                     */
        const propChance = d.type === "prop" ? Math.max(0, 0.10 * (a.attrs.sourcing - 2)) : null;
        const partake = d.type === "prop" ? rng.rnd() < propChance
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
      /* Reservationspreis. Vorher gab es keinen: bei einem proprietären Deal war
         der Spieler der einzige Bieter und konnte beliebig tief einsteigen — der
         Verkäufer hätte jeden Preis genommen. Jetzt gibt es unterhalb der
         Schmerzgrenze schlicht keine Transaktion.                             */
      const reserve = d.askMult * (d.type === "prop" ? RESERVE_PROP : RESERVE_PROC);
      const valid = entries.filter((e) => e.mult >= reserve);
      if (!valid.length) {
        if (b) news.push({
          q, e: "🚷", tone: "neg",
          t: `<b>${d.name}</b>: Der Verkäufer lehnt ab. Bei ${x(b.mult)} liegt dein Gebot unter seiner Schmerzgrenze — der Prozess wird ohne Abschluss beendet.`,
        });
        return;
      }
      valid.sort((p, r) => r.mult - p.mult || F[r.f].attrs.negotiation - F[p.f].attrs.negotiation);
      const w = valid[0];
      const f = F[w.f];
      const eb = ebitdaOf(d);
      /* Verhandlung wirkt jetzt auch beim Kauf, nicht nur beim Verkauf: zwischen
         Zuschlag und Vollzug wird über Kaufpreisanpassungen, Garantien und
         Working-Capital-Mechanik nachverhandelt. Ein Punkt = 1 % auf den Preis. */
      const bidMult = w.mult;
      w.mult = w.mult * (1 - 0.010 * f.attrs.negotiation);
      // Informationsrisiko bei proprietären Deals — durch Due Diligence abwendbar
      let hit = 0;
      if (d.type === "prop" && w.f === 0 && !dd[d.id]) {
        const p = clamp(0.5 - 0.09 * f.attrs.analysis, 0.05, 0.5);
        if (rng.rnd() < p) { hit = 0.10 + rng.rnd() * 0.14; }
      }
      const c = {
        uid: "c" + Math.floor(rng.rnd() * 1e9), name: d.name, sector: d.sector, desc: d.desc,
        revenue: d.revenue, margin: d.margin * (1 - hit),
        quality: d.quality * (1 - hit / 2),
        netDebt: eb * w.lev, rate: BASE_RATE - 0.25 * f.attrs.financing,
        holdQ: 0, flag: d.flag,
        ...makeSeats(rng, d), plat: 0.6 + rng.rnd() * 1.2, acc: 0.6 + rng.rnd() * 1.2, nwcFix: 0,
        addonSize: 0.20 + rng.rnd() * 0.15,
        /* Wettbewerb um Zukäufe: in manchen Nischen sitzt immer ein strategischer
           Käufer mit am Tisch, in anderen nicht. Wird beim Closing gezogen und
           erst über die Add-on-Prüfung sichtbar.                              */
        addonComp: rng.rnd() < 0.35 ? 0.8 + rng.rnd() * 1.4 : 0,
        ltip: false, searches: [], initP: null, initA: null, onboard: 0,
        st: 1, proc: null, block: 0, lockUntil: null, cv: false, breach: 0,
        // Financing verschafft echten Covenant-Spielraum, nicht nur eine bessere Marge
        covLimit: Math.max(COV_FLOOR, w.lev + COV_HEADROOM + 0.10 * f.attrs.financing),
        capexPct: d.capexPct, nwcPct: d.nwcPct,
        benchMargin: d.benchMargin, benchCapex: d.benchCapex, benchNwc: d.benchNwc,
        dd: w.f === 0 ? !!dd[d.id] : true,   // ohne DD bleibt die Branchenreferenz auch nach Closing verborgen
        drift: d.drift ?? rng.nrm(2.5), marginDrift: rng.nrm(1.2), entryQuality: d.quality * (1 - hit / 2),
        entryMult: w.mult, entryEbitda: eb, entryDebt: eb * w.lev,
        // Enterprise Value − Fremdkapital + Transaktionskosten = eingesetztes Eigenkapital
        entryEV: eb * w.mult,
        entryFees: eb * w.mult * ENTRY_FEE,
        entryEquity: eb * w.mult - eb * w.lev + eb * w.mult * ENTRY_FEE,
        // costTotal bleibt unverändert, auch wenn Teile verkauft werden — Basis für den Gesamt-MOIC
        costTotal: eb * w.mult - eb * w.lev + eb * w.mult * ENTRY_FEE,
        cashOut: 0, recapOut: 0, costLeft: eb * w.mult - eb * w.lev + eb * w.mult * ENTRY_FEE,
        entryQ: q,
        hist: [{ rev: d.revenue, eb, nd: eb * w.lev, mg: d.margin * (1 - hit), ql: d.quality * (1 - hit / 2), eq: eb * w.mult - eb * w.lev, mult: w.mult, st: 1, out: 0 }],
      };
      c.baseLoad = seatLoad(c);
      spendFund(f, c.entryEquity, q);
      f.investedTotal = (f.investedTotal || 0) + c.entryEquity;
      f.holdings.push(c);
      if (w.f === 0) {
        news.push({
          q, e: d.type === "landmark" ? "🏛️" : "🏆", tone: "pos",
          t: `${d.type === "landmark" ? "Trophy Asset gewonnen" : "Zuschlag"}: <b>${d.name}</b> bei ${x(w.mult)} EBITDA — Eigenkapital ${eur(c.entryEquity)}.${f.attrs.negotiation > 0 ? ` Geboten hattest du ${x(bidMult)}; die Nachverhandlung bis zum Vollzug hat ${eur((bidMult - w.mult) * eb)} herausgeholt.` : ""}`,
        });
        if (hit) news.push({ q, e: "⚠️", tone: "neg", t: `Nach Closing bei <b>${d.name}</b>: Die Marge liegt ${pct(hit * 100)} unter den Angaben im Information Memorandum.` });
      } else if (bids[d.id] || d.type === "landmark") {
        news.push({
          q, e: d.type === "landmark" ? "🏛️" : "⚔️", tone: "neg",
          t: `<b>${f.name}</b> ${d.type === "landmark" ? "sichert sich das Trophy Asset" : "überbietet dich bei " + d.name} mit ${x(w.mult)}.`,
        });
      }
    });

    /* 2 — KI-Fonds entwickeln ihre Beteiligungen */
    F.forEach((f, i) => {
      if (i === 0) return;
      f.holdings.forEach((c) => {
        if (c.searches && c.searches.length) return;
        const k = f.arch.key;
        /* Besetzung zuerst — auch die KI weiß inzwischen, dass ein Programm ohne
           Management nicht liefert. Der Operator besetzt am aggressivsten, der
           Financial Engineer am wenigsten. Die Ratings liegen unter dem, was ein
           Spieler über einen echten Search bekommen kann.                      */
        const amb = k === "ops" ? 4.0 : k === "fin" ? 3.0 : 3.6;
        const seat = ["ceo", "cfo", "r3"].find((s2) => c[s2].skill < amb - 0.5);
        if (seat && rng.rnd() < 0.8) {
          const eb = ebitdaOf(c);
          const sk = clamp(amb + rng.nrm(0.5), 1, 4.5);
          const cost = retainerOf(seat, eb) + signBonusOf(seat, sk, eb)
            + (c[seat].skill > 0 ? severanceOf(seat, c[seat].skill, eb) : 0);
          c.netDebt += cost; bookOff(c, "mgmt", cost);
          c[seat] = { skill: sk };
          c.onboard = 1;
          return;
        }
        if (!c.ltip && rng.rnd() < 0.5) c.ltip = true;
        // Dieselbe Maßnahmenmechanik wie beim Spieler, nur nach fester Präferenz
        const plan = AI_PLAN[k] || AI_PLAN.all;
        ["plat", "acc"].forEach((dim) => {
          const slot = dim === "plat" ? "initP" : "initA";
          if (c[slot]) return;
          if (dim === "acc" && overstretch(c) > 0.3) return;
          /* Die KI wählt nach Eignung, nicht nach Reihenfolge — sonst würde sie
             dieselbe Maßnahme endlos wiederholen, seit Wiederholung erlaubt ist. */
          const cands = (plan[dim] || []).filter((x2) => initRuns(c, x2) < REPEAT_MAX);
          if (!cands.length) return;
          const id = cands.reduce((a, b) => (fitOf(b, c) * Math.pow(0.82, initRuns(c, b))
            > fitOf(a, c) * Math.pow(0.82, initRuns(c, a)) ? b : a));
          if (fitOf(id, c) * Math.pow(0.82, initRuns(c, id)) < 0.30 && id !== "ma") return;
          const B = buildInit(rng, c, dim, id, mk, q);
          if (!B || B.blocked) return;
          const head = (c.covLimit ?? COV_DEFAULT) - c.netDebt / Math.max(0.5, ebitdaOf(c));
          /* Der Zukaufspreis steckt seit dem 30.08.2026 in B.debt. Die
             Finanzierbarkeit prüft für ihn aber addonCheck() pro forma, nicht
             dieser grobe Puffer — sonst blockierte er Zukäufe doppelt. */
          if (B.debt > 0 && !B.spec.ma && head < ADDON_HEADROOM) return;
          c.netDebt += B.debt; bookOff(c, B.spec.ma ? "addon" : "restr", B.debt);
          c[slot] = B.init;
        });
      });
    });

    /* 3 — Halbjahr simulieren */
    F.forEach((f) => {
      f.holdings.forEach((c) => {
        stepCompany(rng, c, mk, f.attrs.operations);
        if (rng.rnd() < EVENT_P) {
          // Nur Ereignisse ziehen, die auf diese Beteiligung überhaupt anwendbar sind
          const pool = EVENTS.filter((e) => !e.ok || e.ok(c, rng));
          if (pool.length) {
            const e = rng.pick(pool);
            const mitig = e.m && f.attrs[e.m] >= 4 && rng.rnd() < 0.5;
            if (!mitig) {
              e.f(c);
              const seat = e.t.startsWith("CEO") ? "ceo" : e.t.startsWith("CFO") ? "cfo" : null;
              if (f.me) news.push({
                q, e: e.bad ? (seat ? "🚪" : "🔻") : "🔺", tone: e.bad ? "neg" : "pos",
                t: `<b>${c.name}</b>: ${e.t}${seat ? " — die Position ist vakant." : ""}`,
              });
            }
          }
        }
      });
    });

    /* 3y — People: Search-Mandate reifen, Maßnahmen enden, Manager werden abgeworben */
    const shortlists = [];
    F.forEach((f) => {
      f.holdings.forEach((c) => maturePeople(rng, c, mk, q, f.me, news, shortlists));
    });
    if (shortlists.length) setShortlist((p) => [...p, ...shortlists]);

    /* 3z — Covenant: zwei Perioden über der Grenze und die Beteiligung fällt an die Kreditgeber */
    F.forEach((f) => {
      f.holdings = f.holdings.filter((c) => {
        if ((c.breach || 0) >= 2) {
          if (f.me) news.push({
            q, e: "☠️", tone: "neg",
            t: `Covenant Breach bei <b>${c.name}</b>: Enforcement durch die Kreditgeber, das Eigenkapital von ${eur(c.entryEquity)} wird ausgebucht.`,
          });
          // Auch nach einem Breach zählen bereits ausgeschüttete Rekapitalisierungen
          f.realized.push({ name: c.name + " (Covenant Breach)", moic: dealMoic(c, 0) });
          return false;
        }
        if (f.me && (c.breach || 0) === 1) news.push({
          q, e: "⚠️", tone: "neg",
          t: `<b>${c.name}</b> reißt den Covenant von ${x(c.covLimit ?? COV_DEFAULT)} bei ${x(c.netDebt / Math.max(0.5, ebitdaOf(c)))}. Noch ein Halbjahr bis zum Enforcement.`,
        });
        return true;
      });
    });

    /* 3a — Cash Sweep: Nettoliquidität fließt als Rekapitalisierung an den Fonds.
       NAV-neutral, verhindert aber, dass Cash über zehn Jahre im Unternehmen liegen bleibt. */
    F.forEach((f) => {
      f.holdings.forEach((c) => {
        if (c.netDebt < -0.5) {
          const sweep = -c.netDebt * (c.st ?? 1);
          bookOff(c, "dist", -c.netDebt);
          c.netDebt = 0;
          c.cashOut = (c.cashOut || 0) + sweep;
          c.recapOut = (c.recapOut || 0) + sweep;
          applyProceeds(f, sweep, 0, q);
          if (f.me && sweep > 3) news.push({ q, e: "💵", tone: "pos", t: `<b>${c.name}</b> schüttet ${eur(sweep)} aus — die Beteiligung ist schuldenfrei.` });
        }
      });
    });

    /* 3b — Management Fee: 2 % p.a., nach der Investitionsperiode auf Anschaffungswerte */
    F.forEach((f) => {
      const base = q <= INVEST_PERIOD ? CAPITAL : f.holdings.reduce((s, c) => s + c.entryEquity, 0);
      const fee = (base * MGMT_FEE) / 2;
      spendFund(f, fee, q, true);   // Gebühren laufen notfalls auf
      f.fees = (f.fees || 0) + fee;
    });

    /* 4 — Markt */
    SECNAMES.forEach((s) => { mk[s] = clamp(mk[s] * (1 + rng.nrm(0.05)), SECTORS[s].m * 0.65, SECTORS[s].m * 1.4); });
    if (rng.rnd() < 0.18) {
      const s = rng.pick(SECNAMES);
      mk[s] = clamp(mk[s] * 1.18, 0, SECTORS[s].m * 1.5);
      news.push({ q, e: "📈", tone: "pos", t: `Multiple-Expansion in <b>${s}</b>: Bewertungen ziehen deutlich an.` });
    }
    // Sektorrezession: trifft Bewertung und operatives Geschäft aller Beteiligten gleichzeitig
    if (rng.rnd() < 0.14) {
      const s = rng.pick(SECNAMES);
      mk[s] = clamp(mk[s] * 0.84, SECTORS[s].m * 0.55, 99);
      let hit = 0;
      F.forEach((f) => f.holdings.forEach((c) => {
        if (c.sector !== s) return;
        /* Ein Abschwung trifft nicht alle gleich: Wer hoch verschuldet ist, kann
           weder investieren noch Preise halten, verliert Personal an gesündere
           Wettbewerber und muss Working Capital abbauen statt Marktanteile zu
           verteidigen. Genau dieser Verstärkungseffekt fehlte — Rezession und
           Kapitalstruktur waren voneinander unabhängig.                       */
        const lv = c.netDebt / Math.max(0.5, ebitdaOf(c));
        const stress = 1 + 0.22 * Math.max(0, lv - 3.0);
        c.revenue *= 1 - 0.12 * stress;
        c.margin -= 1.5 * stress;
        c.drift = (c.drift || 0) - 1.0;
        c.breach = c.netDebt / Math.max(0.5, ebitdaOf(c)) > (c.covLimit ?? COV_DEFAULT) ? (c.breach || 0) + 1 : 0;
        if (f.me) hit += 1;
      }));
      news.push({
        q, e: "📉", tone: "neg",
        t: `Sektorabschwung in <b>${s}</b>: Multiple-Kontraktion −16 %, Umsätze brechen ein.${hit ? ` Betrifft ${hit} deiner Beteiligungen.` : ""}`,
      });
    }

    /* 4b — Periodenstand je Beteiligung festhalten */
    F.forEach((f) => {
      f.holdings.forEach((c) => {
        const eb = ebitdaOf(c);
        // Detailmitschrift nur für den eigenen Fonds — siehe runQuarter, Schritt 4b
        c.hist = [...(c.hist || []), { rev: c.revenue, eb, nd: c.netDebt, mg: c.margin, ql: c.quality,
          eq: navValueOf(c, mk) + (c.cashOut || 0), mult: markMultiple(c, mk), st: c.st ?? 1, out: c.cashOut || 0,
          ...(f.me ? { fin: periodFin(c) } : {}) }];
        resetPeriod(c);
      });
    });

    /* 4c — Verkaufsprozesse reifen, Lock-ups laufen aus */
    const resolved = [];
    F[0].holdings.forEach((c) => {
      if (c.proc && q >= c.proc.resolveQ) {
        resolved.push({ uid: c.uid, name: c.name, offers: makeOffers(rng, c, mk, F, F[0].attrs.negotiation, q) });
        c.proc = null;
      }
    });
    F[0].holdings = F[0].holdings.filter((c) => {
      if (c.lockUntil && q >= c.lockUntil) {
        const val = fairOf(c, mk, F[0].attrs.negotiation, q) * (1 - BIL_FEE);
        applyProceeds(F[0], val, c.entryEquity, q);
        F[0].realized.push({ name: c.name + " (Restbeteiligung)", moic: val / c.entryEquity });
        news.push({
          q, e: val >= c.entryEquity ? "🔔" : "📉", tone: val >= c.entryEquity ? "pos" : "neg",
          t: `Lock-up bei <b>${c.name}</b> ausgelaufen — Restbeteiligung für ${eur(val)} platziert.`,
        });
        return false;
      }
      return true;
    });

    /* 5 — KI-Exits */
    F.forEach((f, i) => {
      if (i === 0) return;
      f.holdings = f.holdings.filter((c) => {
        const val = fairOf(c, mk, f.attrs.negotiation, q);
        /* Die KI verkauft jetzt nach Verzinsung, nicht nach einer festen Schwelle:
           Wenn der erreichte Multiple auf die bisherige Haltedauer eine gute
           Rendite ergibt, wird realisiert — genau die Abwägung, die der Spieler
           auch treffen muss. Der Leverage-Fonds dreht schneller.              */
        const mo = val / Math.max(0.01, c.entryEquity);
        const irr = Math.pow(Math.max(0.05, mo), 2 / Math.max(1, c.holdQ)) - 1;
        const hurdle = f.arch.key === "fin" ? 0.18 : f.arch.key === "ops" ? 0.22 : 0.20;
        // Auch die KI weiß, dass der Preis gegen Laufzeitende fällt, und zieht vor
        const patience = (f.arch.key === "ops" ? 10 : 9) - (PERIODS - q <= 6 ? 2 : 0);
        if (c.holdQ >= MIN_HOLD && (irr > hurdle || c.holdQ >= patience || PERIODS - q <= 2)) {
          const net = val * (1 - PROC_FEE);
          applyProceeds(f, net, c.entryEquity, q);
          f.realized.push({ name: c.name, moic: net / c.entryEquity });
          return false;
        }
        return true;
      });
    });

    setFunds(F); setMarket(mk); setBids({}); setDd({});
    setMarketHist((p) => [...p, { ...mk }]);
    setTvpiHist((p) => [...p, F.map((fd) => scoreOf(fd, mk, q))]);
    const nd = makeDeals(F[0].attrs.sourcing, mk);
    if (q === LM_ANNOUNCE && landmark) {
      news.push({ q, e: "📣", tone: "neu", t: `Trophy Asset angekündigt: <b>${landmark.name}</b> kommt in zwei Halbjahren an den Markt. Halte Pulver trocken.` });
    }
    if (q === LM_DEAL && landmark) nd.unshift({ ...landmark, askMult: clamp(mk[landmark.sector] * (0.7 + 0.006 * landmark.quality) * 1.06, 5, 19) });
    setDeals(nd);
    setFeed((p) => [...news.reverse(), ...p].slice(0, 60));
    if (resolved.length) setExitQueue((p) => [...p, ...resolved]);
    setQuarter(q);
    if (q >= PERIODS) { liquidate(F, mk, q); setPhase("end"); }

    // Serie guter Halbjahre sichtbar machen — das eigentliche Momentum-Signal
    const newScore = scoreOf(F[0], mk, q);
    const prevScore = prevScoreRef.current;
    prevScoreRef.current = newScore;
    if (prevScore != null) {
      if (newScore > prevScore) setStreak((s) => s + 1); else setStreak(0);
    }
    const won = news.find((n) => n.tone === "pos" && (n.e === "🏆" || n.e === "🏛️"));
    const lost = news.find((n) => n.tone === "neg" && (n.e === "☠️" || n.e === "🚪"));
    if (won) { haptic([10, 20, 10]); if (won.e === "🏛️") fireConfetti(); pushToast(won.t, "pos"); }
    else if (lost) { haptic(25); pushToast(lost.t, "neg"); }
  }

  /* Ende der Fondslaufzeit: alle verbliebenen Beteiligungen werden zu
     bilateralen Konditionen abgewickelt — 0,5× Abschlag plus Kosten.     */
  function liquidate(F, mk, q) {
    const news = [];
    F.forEach((f, i) => {
      f.holdings.forEach((c) => {
        // Am Laufzeitende hat der Verkäufer keinen Verhandlungsspielraum
        const gross = Math.max(0, eqvOf(c, markMultiple(c, mk) - LIQ_DISC));
        const net = gross * (1 - BIL_FEE);
        applyProceeds(f, net, c.entryEquity, q);
        f.realized.push({ name: c.name + " (Tail-End)", moic: dealMoic(c, net) });
        if (i === 0) {
          const mo = net / c.entryEquity;
          news.push({
            q, e: mo >= 1 ? "⏳" : "💀", tone: mo >= 1 ? "neu" : "neg",
            t: `Tail-End-Verwertung: <b>${c.name}</b> zum Laufzeitende veräußert für ${eur(net)} — ${mo.toFixed(2)}× auf das eingesetzte Eigenkapital.`,
          });
        }
      });
      f.holdings = [];
    });
    setFunds([...F]);
    if (news.length) setFeed((p) => [...news, ...p].slice(0, 60));
  }

  /* ---- Entwicklung der Beteiligungen ---- */

  // Nur Value-Creation-Maßnahmen binden Operating-Kapazität, Suchen nicht.
  const busySlots = me ? me.holdings.reduce((n, c) => n + initsOf(c).length, 0) : 0;
  const maxSlots = me ? INIT_SLOTS + Math.floor(me.attrs.operations / 2) : INIT_SLOTS;
  const freeSlots = maxSlots - busySlots;

  function chargeCompany(uid, mult) {
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== uid ? h : chargeOff(h, "mgmt", ebitdaOf(h) * mult)),
    }));
  }

  function startSearch(c, seat) {
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
        ...chargeOff(h, "mgmt", retainerOf(seat, ebitdaOf(h))),
        searches: [...(h.searches || []), { seat, readyQ: quarter + 1 }],
      }),
    }));
    const nm = seat === "ceo" ? "CEO" : seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    setFeed((p) => [{ q: quarter, e: "🔍", tone: "neu", t: `<b>${c.name}</b>: Search-Mandat für einen neuen ${nm} erteilt — Retainer ${eur(retainerOf(seat, ebitdaOf(c)))}.` }, ...p]);
  }

  function hire(item, cand) {
    haptic(10);
    const c = me.holdings.find((h) => h.uid === item.uid);
    setShortlist((p) => p.slice(1));
    if (!c) return;
    const had = c[item.seat].skill > 0;
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
        ...chargeOff(h, "mgmt", signBonusOf(item.seat, cand.skill, ebitdaOf(h))
          + (had ? severanceOf(item.seat, h[item.seat].skill, ebitdaOf(h)) : 0)),
        [item.seat]: { skill: cand.skill, dev: cand.dev, poach: cand.poach },
        searches: (h.searches || []).filter((se) => se.seat !== item.seat), onboard: 1,
      }),
    }));
    const nm = item.seat === "ceo" ? "CEO" : item.seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    setFeed((p) => [{
      q: quarter, e: "🤝", tone: "pos",
      t: `<b>${c.name}</b>: Neuer ${nm} an Bord — Rating ${cand.skill.toFixed(1)}, Signing Bonus ${eur(signBonusOf(item.seat, cand.skill, ebitdaOf(c)))}, Gehalt ${eur(payOf(item.seat, cand.skill, ebitdaOf(c)))} p.a.${had ? ` Plus ${eur(severanceOf(item.seat, c[item.seat].skill, ebitdaOf(c)))} Abfindung für den Vorgänger.` : ""}`,
    }, ...p]);
  }

  function rejectAll(item) {
    const c = me.holdings.find((h) => h.uid === item.uid);
    setShortlist((p) => p.slice(1));
    if (!c) return;
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
        ...chargeOff(h, "mgmt", retainerOf(item.seat, ebitdaOf(h)) * 0.5),
        searches: (h.searches || []).map((se) => se.seat === item.seat ? { seat: item.seat, readyQ: quarter + 1 } : se),
      }),
    }));
    setFeed((p) => [{ q: quarter, e: "🔍", tone: "neu", t: `<b>${c.name}</b>: Shortlist abgelehnt, Suchmandat wird neu aufgesetzt.` }, ...p]);
  }

  function startInit(c, dim, id) {
    haptic(8);
    const B = buildInit(rng, c, dim, id, market, quarter);
    if (!B) return;
    if (B.blocked) {
      setFeed((p2) => [{
        q: quarter, e: "🏦", tone: "neg",
        t: `<b>${c.name}</b>: Der Zukauf scheitert an der Finanzierung. Pro forma ${x(B.blocked.lev)} Leverage gegen einen Covenant von ${x(B.blocked.limit)} — die Banken steigen aus.`,
      }, ...p2]);
      return;
    }
    const { spec, dur, p, debt, chk } = B;
    const msg = spec.ma
      ? ` Add-on mit ${eur(chk.addEb)} EBITDA zu ${x(chk.mult)} für ${eur(chk.price)}, fremdfinanziert. Leverage pro forma ${x(chk.lev)}. Integrationswahrscheinlichkeit ${Math.round(p * 100)} %.`
      : ` Erfolgswahrscheinlichkeit ${Math.round(p * 100)} %, ${hj(dur)}.${spec.oneOff ? ` Einmalaufwand ${eur(ebitdaOf(c) * spec.oneOff)}.` : ""}`;

    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
        ...chargeOff(h, B.spec.ma ? "addon" : "restr", debt), [B.slot]: B.init,
      }),
    }));
    setFeed((p2) => [{ q: quarter, e: spec.ma ? "🏢" : "🛠️", tone: "neu",
      t: `<b>${c.name}</b>: ${spec.n} gestartet.${msg}` }, ...p2]);
  }

  function toggleLtip(c) {
    setFunds((F) => F.map((f, i) => i !== 0 ? f : {
      ...f, holdings: f.holdings.map((h) => h.uid !== c.uid ? h : { ...h, ltip: true }),
    }));
    setFeed((p) => [{ q: quarter, e: "📜", tone: "neu", t: `<b>${c.name}</b>: Managementbeteiligung (MEP) aufgesetzt — ${Math.round(LTIP_SHARE * 100)} % Sweet Equity, dafür halbes Retention-Risiko und +0,5 effektives Rating.` }, ...p]);
  }

  /* ---- Exit-Mechanik ---- */
  /* ---- Exit-Mechanik ---- */

  const procCount = me ? me.holdings.filter((c) => c.proc).length : 0;
  const NEG = me ? me.attrs.negotiation : 0;

  function patchHolding(uid, patch) {
    setFunds((F) => F.map((f, i) => i !== 0 ? f : { ...f, holdings: f.holdings.map((h) => h.uid !== uid ? h : { ...h, ...patch }) }));
  }

  function startProcess(c) {
    patchHolding(c.uid, { proc: { resolveQ: quarter + PROC_Q } });
    setFeed((p) => [{ q: quarter, e: "📣", tone: "neu", t: `Verkaufsprozess für <b>${c.name}</b> eröffnet. Gebote liegen in zwei Halbjahren vor.` }, ...p]);
  }

function finalize(c, gross, buyer, feeRate, extra) {
    const net = gross * (1 - feeRate) * (c.ltip ? 1 - LTIP_SHARE : 1);
    /* Steht Spielraum zum Einbehalten zur Verfügung, entscheidet der GP — sonst
       wird direkt voll ausgeschüttet und der Dialog erscheint gar nicht.      */
    if (recycleRoom(me, net, quarter) > 0.5) {
      setUseProceeds({ c, gross, buyer, feeRate, extra, net });
      return;
    }
    settle(c, gross, buyer, feeRate, extra, 0);
  }

  function settle(c, gross, buyer, feeRate, extra, keep) {
    const net = gross * (1 - feeRate) * (c.ltip ? 1 - LTIP_SHARE : 1);
    const st = c.st ?? 1;
    const bridge = makeBridge(c, gross, net);
    setUseProceeds(null);
    setFunds((F) => F.map((f, i) => {
      if (i !== 0) return f;
      const g = { ...f, holdings: f.holdings.filter((h) => h.uid !== c.uid), realized: [...f.realized, { name: c.name, moic: dealMoic(c, net) }] };
      applyProceeds(g, net, c.costLeft ?? c.entryEquity, quarter, keep);
      return g;
    }));
    const recap = c.recapOut || 0;
    const mo = dealMoic(c, net);
    const exitMsg = `Exit <b>${c.name}</b> an ${buyer}: ${eur(net)} netto${recap > 0.5 ? ` zuzüglich ${eur(recap)} bereits ausgeschütteter Rekapitalisierungen` : ""} — ${mo.toFixed(2)}× auf das eingesetzte Eigenkapital.${extra || ""}`;
    setFeed((p) => [{
      q: quarter, e: mo >= 2 ? "🚀" : mo >= 1 ? "💰" : "💀", tone: mo >= 1 ? "pos" : "neg",
      t: exitMsg,
    }, ...p]);
    if (mo >= 1.5) { fireConfetti(); pushToast(`🚀 Großer Exit — ${mo.toFixed(2)}× auf ${c.name}`, "pos"); }
    else if (mo < 1) { haptic([30, 40, 30]); pushToast(`💀 Exit unter Einstand — ${mo.toFixed(2)}× auf ${c.name}`, "neg"); }
    else haptic(12);
    setSheet({ kind: "bridge", c, price: net, buyer, bridge });
  }

  function sellBilateral(c) {
    const mult = dealMultiple(c, market, NEG, quarter) - BIL_DISC;
    const gross = Math.max(0, eqvOf(c, mult));
    finalize(c, gross, "Off-Market-Erwerber", BIL_FEE);
  }

  // Continuation Vehicle: Teilexit an einen Secondary-Investor.
  // Der Fonds gibt Substanz ab und erhält Liquidität — kein Kapitalabfluss.
  function doCV(c) {
    const fair = fairOf(c, market, NEG, quarter);
    const gross = fair * CV_STAKE * CV_DISC;
    const net = gross * (1 - CV_FEE);
    const costSold = c.entryEquity * CV_STAKE;
    setFunds((F) => F.map((f, i) => {
      if (i !== 0) return f;
      const g = {
        ...f,
        holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
          ...h, st: (h.st ?? 1) * (1 - CV_STAKE), entryEquity: h.entryEquity * (1 - CV_STAKE),
          costLeft: Math.max(0.01, (h.costLeft ?? h.entryEquity) - costSold),
          cashOut: (h.cashOut || 0) + net, entryEbitda: h.entryEbitda, cv: true, proc: null,
        }),
        realized: [...f.realized, { name: c.name + " (Teilexit)", moic: net / costSold }],
      };
      applyProceeds(g, net, costSold, quarter);
      return g;
    }));
    setFeed((p) => [{
      q: quarter, e: "🔄", tone: "neu",
      t: `<b>${c.name}</b>: ${Math.round(CV_STAKE * 100)} % an ein Continuation Vehicle veräußert — ${eur(net)} netto, Anteil sinkt auf ${Math.round((c.st ?? 1) * (1 - CV_STAKE) * 100)} %.`,
    }, ...p]);
  }

  function doIPO(c) {
    const fair = fairOf(c, market, 0, quarter);
    const gross = fair * IPO_PLACE * IPO_DISC;
    const net = gross * (1 - IPO_FEE);
    const costSold = c.entryEquity * IPO_PLACE;
    setFunds((F) => F.map((f, i) => {
      if (i !== 0) return f;
      const g = {
        ...f,
        holdings: f.holdings.map((h) => h.uid !== c.uid ? h : {
          ...h, st: (h.st ?? 1) * (1 - IPO_PLACE), entryEquity: h.entryEquity * (1 - IPO_PLACE),
          costLeft: Math.max(0.01, (h.costLeft ?? h.entryEquity) - costSold),
          cashOut: (h.cashOut || 0) + net, lockUntil: quarter + 2, proc: null,
        }),
        realized: [...f.realized, { name: c.name + " (IPO)", moic: net / costSold }],
      };
      applyProceeds(g, net, costSold, quarter);
      return g;
    }));
    setFeed((p) => [{ q: quarter, e: "🔔", tone: "pos", t: `Börsengang <b>${c.name}</b>: ${Math.round(IPO_PLACE * 100)} % platziert für ${eur(net)} netto. Restbeteiligung ein Jahr im Lock-up.` }, ...p]);
  }

  /* Vorschau: Bewertung und Rückflüsse, bevor der Exit freigegeben wird */
  function previewExit(c, ch) {
    const st = c.st ?? 1;
    const eb = ebitdaOf(c);
    const mMult = markMultiple(c, market);
    const dMult = dealMultiple(c, market, NEG, quarter);

    let exMult = dMult;        // Multiple, das den Enterprise Value bestimmt
    let eqDisc = 1;            // prozentualer Abschlag auf Equity-Ebene
    let share = st;            // verkaufter Anteil
    let feeRate = 0, costBasis = c.entryEquity, note = "";

    const recap = c.recapOut || 0;
    const rows = [["Adj. EBITDA (LTM)", eur(eb)], ["Bewertungsmultiple", x(mMult)]];
    if (ch !== "ipo" && NEG > 0) rows.push([`Verhandlungsprämie +${NEG * 2} %`, x(dMult)]);

    if (ch === "bil") {
      exMult = dMult - BIL_DISC;
      feeRate = BIL_FEE;
      rows.push([`Abschlag bilateral`, `−${BIL_DISC.toFixed(1).replace(".", ",")}× EBITDA`]);
      note = "Sofortiger Vollzug, kein Marktrisiko. Jedes Halbjahr erneut möglich.";
    } else if (ch === "cv") {
      eqDisc = CV_DISC; share = st * CV_STAKE; feeRate = CV_FEE;
      costBasis = c.entryEquity * CV_STAKE;
      note = "Teilexit an einen Secondary-Investor. Liquidität jetzt, künftige Wertsteigerung anteilig weg. Jedes Halbjahr wiederholbar.";
    } else if (ch === "ipo") {
      exMult = mMult;          // am Kapitalmarkt zählt kein Verhandlungsgeschick
      eqDisc = IPO_DISC; share = st * IPO_PLACE; feeRate = IPO_FEE;
      costBasis = c.entryEquity * IPO_PLACE;
      note = "Die Restbeteiligung wird nach einem Jahr Lock-up zum dann gültigen Kurs verwertet.";
    } else {
      note = "Der Preis steht erst bei Prozessende — bis dahin bewegen sich Multiples und EBITDA weiter.";
    }

    const ev = eb * exMult;
    const eqv100 = ev - c.netDebt;
    const gross = Math.max(0, eqv100 * share * eqDisc);
    const net = gross * (1 - feeRate);

    rows.push(["Exit-Multiple", x(exMult)], ["Enterprise Value", eur(ev)],
      ["− Nettoverschuldung", "−" + eur(c.netDebt)], ["= Equity Value (100 %)", eur(eqv100)]);
    if (share < 1) rows.push([`× verkaufter Anteil ${Math.round(share * 100)} %`, eur(eqv100 * share)]);
    if (eqDisc < 1) rows.push([ch === "cv" ? "− Secondary-Abschlag" : "− Emissionsabschlag",
      `−${Math.round((1 - eqDisc) * 100)} %`]);

    if (ch === "proc") {
      const fair = Math.max(0, eqv100 * st);
      rows.push(["Erwartete Gebotsspanne", eur(fair * 0.86) + " – " + eur(fair * 1.08)],
        [`Transaktionskosten ${PROC_FEE * 100} %`, "M&A-Berater, VDD, Legal"],
        ["Gebote liegen vor in", hj(PROC_Q)]);
      if (recap > 0.05) rows.push(["Bereits ausgeschüttet (Recap)", eur(recap)]);
      setSheet({ kind: "confirm", c, ch, rows, net: 0, note, moic: 0, dpiPct: 0 });
      return;
    }

    rows.push(["= Bruttoerlös", eur(gross)],
      [`− Kosten ${(feeRate * 100).toFixed(1).replace(".", ",")} %`, "−" + eur(gross * feeRate)]);
    if (ch === "cv") rows.push(["Anteil danach", Math.round(st * (1 - CV_STAKE) * 100) + " %"]);
    if (ch === "ipo") rows.push(["Lock-up Restbeteiligung", "1 Jahr"]);
    /* Bei einem Vollverkauf zählen die bisherigen Rekapitalisierungen in den
       Deal-MOIC. Bei einem Teilexit nicht — dort wird die verkaufte Tranche
       gegen ihre eigene Kostenbasis gemessen, alles andere wäre doppelt.    */
    const full = ch === "bil";
    if (recap > 0.05) rows.push([full ? "+ bereits ausgeschüttet (Recap)" : "Bereits ausgeschüttet (Recap)", eur(recap)]);
    if (full && recap > 0.05) rows.push(["= Gesamtrückfluss", eur(net + recap)]);

    setSheet({
      kind: "confirm", c, ch, rows, net, note,
      moic: full ? dealMoic(c, net) : net / costBasis,
      moicLabel: full ? (recap > 0.05 ? "MOIC inkl. Ausschüttungen" : "MOIC (Deal)") : "MOIC der verkauften Tranche",
      dpiPct: net / CAPITAL,
    });
  }

  function confirmExit() {
    haptic(10);
    const { c, ch } = sheet;
    const live = me.holdings.find((h) => h.uid === c.uid) || c;
    setSheet(null);
    if (ch === "bil") sellBilateral(live);
    else if (ch === "cv") doCV(live);
    else if (ch === "ipo") doIPO(live);
    else startProcess(live);
  }

  function decideOffer(offer, action) {
    haptic(action === "abort" ? 20 : 10);
    const item = exitQueue[0];
    const c = me.holdings.find((h) => h.uid === item.uid);
    const shift = () => setExitQueue((p) => p.slice(1));
    if (!c) { shift(); return; }

    if (action === "abort") {
      patchHolding(c.uid, { block: quarter + 2 });
      setFeed((p) => [{ q: quarter, e: "🚫", tone: "neg", t: `Verkaufsprozess für <b>${c.name}</b> abgebrochen. Ein Jahr Sperre — die anderen Fonds haben es gesehen.` }, ...p]);
      shift(); return;
    }

    let final = offer, extra = "";
    if (action === "reneg") {
      const r = rng.rnd();
      if (r < 0.60) {
        final = { ...offer, price: offer.price * (1.05 + rng.rnd() * 0.03) };
        extra = " Nachverhandlung erfolgreich.";
      } else if (r < 0.85) {
        const second = item.offers.filter((o) => o !== offer).sort((a, b) => b.price - a.price)[0];
        if (!second) {
          patchHolding(c.uid, { block: quarter + 2 });
          setFeed((p) => [{ q: quarter, e: "🚫", tone: "neg", t: `<b>${offer.buyer}</b> springt bei ${c.name} ab. Kein weiteres Gebot, ein Jahr Sperre.` }, ...p]);
          shift(); return;
        }
        final = second;
        extra = ` ${offer.buyer} ist abgesprungen.`;
      } else {
        extra = " Nachverhandlung ohne Ergebnis.";
      }
    }

    if (final.risk && rng.rnd() < final.risk) {
      patchHolding(c.uid, { block: quarter + 2 });
      setFeed((p) => [{ q: quarter, e: "⚖️", tone: "neg", t: `Die Fusionskontrolle stoppt den Verkauf von <b>${c.name}</b>. ${final.buyer} zieht zurück, ein Jahr Sperre.` }, ...p]);
      shift(); return;
    }

    finalize(c, final.price, final.buyer, PROC_FEE, extra);
    shift();
  }

  const rank = useMemo(() => funds.map((f) => ({
    ...f, tvpi: tvpiOf(f, market, quarter), dpi: dpiOf(f, market, quarter),
    irr: irrOf(f, market, quarter),
    gross: grossMoicOf(f, market), score: scoreOf(f, market, quarter),
  })).sort((a, b) => b.score - a.score), [funds, market, quarter]);

  /* ---------------- Views ---------------- */

  if (phase === "setup") {
    return (
      <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
        <div className="wrap">
          <div style={{ padding: "36px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">Vintage 2026 · Kohorte 01</div>
              <h1 className="disp" style={{ fontSize: 38, margin: "8px 0 6px" }}>PE-Leagues</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href="/dashboard" className="theme" style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
                aria-label="Zum Dashboard">←</Link>
              <button className="theme" style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
                onClick={() => setDark(!dark)} aria-label="Darstellung wechseln">{dark ? "☀" : "☾"}</button>
            </div>
          </div>
          <div style={{ padding: "0 16px" }}>
            <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.55, margin: 0 }}>
              Fünf Fonds, je {eur(CAPITAL)}, zehn Jahre. Ihr bietet auf denselben Dealflow, führt eure Beteiligungen
              und verkauft sie wieder. Gewertet wird zur Hälfte der TVPI, zur Hälfte der IRR — was du verdienst
              und wie lange du dafür brauchst.
            </p>
          </div>
          <FundProfileEditor attrs={attrs} setAttrs={setAttrs} onSubmit={start} submitLabel="Fonds auflegen" />
        </div>
      </div>
    );
  }

  const dpi = me ? dpiOf(me, market, quarter) : 0;
  const gross = me ? grossMoicOf(me, market) : 0;
  const tvpi = me ? tvpiOf(me, market, quarter) : 1;
  const irr = me ? irrOf(me, market, quarter) : 0;
  const score = me ? scoreOf(me, market, quarter) : 0;
  const myRank = rank.findIndex((f) => f.me) + 1;

  return (
    <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
      <div className="bar">
        {/* Drei Kennzahlen, mehr braucht die Leiste nicht: Wertung, verfügbares
            Kapital, verbleibende Zeit. Alles Weitere steht dort, wo es gebraucht wird. */}
        <div className="barrow">
          <div>
            <div className="stat">Wertung</div>
            <AnimatedNumber className="statv mono" value={score} format={(v) => v.toFixed(2)} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="stat">Dry Powder</div>
            <AnimatedNumber className="statv mono" value={investableOf(me, quarter)} format={eur} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="stat">Halbjahr</div>
            <div className="statv mono">{quarter}<span style={{ opacity: .5 }}>/{PERIODS}</span></div>
          </div>
          <Link href="/dashboard" className="theme" aria-label="Zum Dashboard">
            ←
          </Link>
          <button className="theme" onClick={() => { haptic(6); setDark(!dark); }} aria-label="Darstellung wechseln">
            {dark ? "☀" : "☾"}
          </button>
        </div>
        <div className="barrow" style={{ marginTop: 6, fontSize: 10.5, opacity: .55 }}>
          <span className="mono">TVPI {tvpi.toFixed(2)}× · IRR {(irr * 100).toFixed(1).replace(".", ",")} % · DPI {dpi.toFixed(2)}×</span>
          <span className="mono">Platz {myRank}/{funds.length}{streak >= 2 ? ` · 🔥×${streak}` : ""} · {me.holdings.length}/{MAX_SLOTS} PortCos</span>
        </div>
        <div className="barrow" style={{ marginTop: 2, fontSize: 10.5, opacity: .45 }}>
          <span className="mono">
            {eur(me.undrawn ?? CAPITAL)} offenes Commitment{(me.recyc || 0) > 0.5 ? ` + ${eur(me.recyc)} einbehalten` : ""}
            {" "}− {eur(feeReserveOf(me, quarter))} Gebührenreserve
          </span>
          {(me.accrued || 0) > 0.5 && <span className="mono ox">{eur(me.accrued)} aufgelaufene Gebühren</span>}
        </div>
        <div className="prog"><i style={{ width: `${(quarter / PERIODS) * 100}%` }} /></div>
      </div>

      <Toasts items={toasts} />
      {burst > 0 && <Confetti key={burst} seed={burst} rng={rng} />}
      {rolling && (
        <div className="rollmask">
          <div className="rr" />
          <div className="rt">Auktion läuft …</div>
          <div className="rs">Gebote werden aufgelöst</div>
        </div>
      )}

      <div className="wrap">
        <News feed={feed} quarter={quarter} />
        {phase === "end" && (
          <div className="tomb">
            <div className="sub">Fondslaufzeit beendet</div>
            <div className="amt">{score.toFixed(2)}</div>
            <div className="sub">Wertung · Platz {myRank} von 5</div>
            <div className="sub" style={{ marginTop: 6 }}>
              TVPI {tvpi.toFixed(2)}× · IRR {(irr * 100).toFixed(1).replace(".", ",")} % · DPI {dpi.toFixed(2)}× · Brutto-MOIC {gross.toFixed(2)}×
            </div>
            <div className="sub" style={{ marginTop: 4, opacity: .7 }}>
              {eur(me.drawn || 0)} von {eur(CAPITAL)} abgerufen · {eur(me.distTotal || 0)} ausgeschüttet
            </div>
          </div>
        )}

        {tab === "deals" && (
          <>
            {landmark && quarter >= LM_ANNOUNCE && quarter < LM_DEAL && (
              <div className={"card lm" + (quarter === LM_ANNOUNCE ? " fresh" : "")}>
                <h3 className="disp">{landmark.name}</h3>
                <div className="pad">
                  <span className="tag prop">Trophy Asset</span>
                  <span className="tag"><i className="sdot" style={{ background: SECCOLOR[landmark.sector] }} />{landmark.sector}</span>
                  <p className="biz">{landmark.desc}</p>
                  <table className="ledger" style={{ marginTop: 10 }}><tbody>
                    <tr><td className="lab">Umsatz</td><td>{eur(landmark.revenue)}</td></tr>
                    <tr><td className="lab">Kennzahlen</td><td>Erst mit dem Datenraum</td></tr>
                    <tr><td className="lab">Am Markt in</td><td>{hj(LM_DEAL - quarter)}</td></tr>
                  </tbody></table>
                  <p style={{ fontSize: 12, color: "var(--gold)", marginTop: 10, marginBottom: 0 }}>
                    Der größte Prozess des Zyklus. Alle fünf Fonds der Kohorte bieten mit — wer sein Kapital vorher bindet, ist raus.
                  </p>
                </div>
              </div>
            )}
            {deals.map((d) => <DealCard key={d.id} d={d} me={me} bid={bids[d.id]} dd={!!dd[d.id]} onDD={() => runDD(d.id)}
                  ddUsed={Object.keys(dd).length} ddCap={ddCapOf(me.attrs.analysis)} quarter={quarter}
              setBid={(b) => setBids((p) => ({ ...p, [d.id]: b }))} clear={() => setBids((p) => { const n = { ...p }; delete n[d.id]; return n; })} market={market} />)}
            <div className="card">
              <h3 className="disp">Archiv</h3>
              {feed.filter((f) => f.q < quarter).length === 0 && <div className="quiet">Noch keine älteren Meldungen.</div>}
              {feed.filter((f) => f.q < quarter).slice(0, 15).map((f, i) => (
                <div className={"item " + (f.tone || "neu")} key={i}>
                  <span className="em">{f.e || "·"}</span>
                  <span dangerouslySetInnerHTML={{ __html: `<span class="mono" style="opacity:.5">HJ ${f.q}</span> ${f.t}` }} />
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "port" && (
          <>
            <div className="card">
              <h3 className="disp">Wertung gegen die Kohorte</h3>
              <TvpiChart hist={tvpiHist} meIdx={0} />
            </div>
            <div className="card">
              <h3 className="disp">Sektoren nach NAV</h3>
              <SectorSplit holdings={me.holdings} market={market} cash={me.cash} />
            </div>
            {me.holdings.length === 0 && (
              <div className="card"><div className="pad" style={{ paddingTop: 14, fontSize: 13, color: "var(--ink2)" }}>
                Noch keine Beteiligungen. Im Dealflow findest du vier strukturierte Prozesse und deine proprietären Kontakte.
              </div></div>
            )}
            {me.holdings.length > 0 && (
              <div className="secthead">
                <span className="eyebrow">Beteiligungen</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ox)" }}>
                  {me.holdings.filter((c) => healthOf(c, market).attention).length > 0
                    ? `${me.holdings.filter((c) => healthOf(c, market).attention).length} × Handlungsbedarf` : ""}
                </span>
              </div>
            )}
            <Shelf holdings={me.holdings} market={market} cash={me.cash} quarter={quarter}
              onPick={(uid) => { haptic(6); const el = document.getElementById("h_" + uid); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
            {me.holdings.map((c) => (
              <Holding key={c.uid} c={c} market={market} neg={NEG} quarter={quarter} procCount={procCount}
                freeSlots={freeSlots} act={{
                  proc: () => previewExit(c, "proc"), bil: () => previewExit(c, "bil"),
                  cv: () => previewExit(c, "cv"), ipo: () => previewExit(c, "ipo"),
                  search: (seat) => startSearch(c, seat), init: (dim) => setInitPick({ uid: c.uid, dim }), ltip: () => toggleLtip(c),
                  study: c.dd ? null : () => runStudy(c.uid),
                }} />
            ))}
            {me.realized.length > 0 && (
              <div className="card">
                <h3 className="disp">Track Record</h3>
                {me.realized.map((r, i) => (
                  <div className="lb" key={i}>
                    <span className="nm">{r.name}</span>
                    <span className="mo" style={{ color: r.moic >= 1 ? "var(--teal)" : "var(--ox)" }}>{r.moic.toFixed(2)}×</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "rank" && (
          <>
            <div className="card">
              <h3 className="disp">Peer Group</h3>
              {rank.map((f, i) => (
                <div key={f.id}>
                  <div className={"lb" + (f.me ? " me" : "")} onClick={() => setOpenFund(openFund === f.id ? null : f.id)}
                    style={{ cursor: "pointer" }} role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setOpenFund(openFund === f.id ? null : f.id)}>
                    <span className="rk">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                    <span className="nm">{f.name}</span>
                    <span className="bar2"><i style={{ width: `${clamp((f.score + 0.2) / 2.0, 0.04, 1) * 100}%` }} /></span>
                    <span className="mo" style={{ color: f.score >= 1 ? "var(--teal)" : "var(--ox)" }}>{f.score.toFixed(2)}</span>
                    <span style={{ color: "var(--ink2)", fontSize: 11 }}>{openFund === f.id ? "▴" : "▾"}</span>
                  </div>
                  {openFund === f.id && (
                    <div style={{ background: "var(--zebra)", borderBottom: "1px solid var(--rule)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px 2px" }}>
                        <span className="eyebrow">{f.me ? "Dein Portfolio" : f.arch.style}</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>
                          TVPI {f.tvpi.toFixed(2)}× · IRR {(f.irr * 100).toFixed(1).replace(".", ",")} % · DPI {f.dpi.toFixed(2)}× · {eur(f.cash)} frei
                        </span>
                      </div>
                      {f.holdings.length === 0 && <div className="quiet" style={{ paddingTop: 4 }}>Keine Beteiligungen.</div>}
                      {f.holdings.map((c) => {
                        const val = fairOf(c, market, f.attrs.negotiation);
                        const mo = val / c.entryEquity;
                        return (
                          <div key={c.uid} style={{ padding: "6px 14px", fontSize: 12.5, display: "flex", gap: 8, alignItems: "baseline" }}>
                            <i className="sdot" style={{ background: SECCOLOR[c.sector] }} />
                            <span style={{ flex: 1 }}>{c.name}</span>
                            <span className="mono" style={{ color: "var(--ink2)" }}>Kauf {x(c.entryMult)}</span>
                            <span className="mono" style={{ color: "var(--ink2)" }}>{c.holdQ} HJ</span>
                            <span className="mono" style={{ color: mo >= 1 ? "var(--teal)" : "var(--ox)", minWidth: 42, textAlign: "right" }}>
                              {mo.toFixed(2)}×
                            </span>
                          </div>
                        );
                      })}
                      {f.realized.length > 0 && (
                        <div style={{ padding: "6px 14px 10px", fontSize: 12, color: "var(--ink2)" }}>
                          Realisiert: {f.realized.map((r) => `${r.name} ${r.moic.toFixed(2)}×`).join(" · ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="disp">EV/EBITDA je Sektor</h3>
              <MarketChart hist={marketHist} />
              <table className="ledger"><tbody>
                {SECNAMES.map((s) => {
                  const d = (market[s] / SECTORS[s].m - 1) * 100;
                  return (
                    <tr key={s}>
                      <td className="lab"><i className="sdot" style={{ background: SECCOLOR[s] }} />{s}</td>
                      <td>{x(market[s])}
                        <span style={{ color: d >= 0 ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
                          {" "}{d >= 0 ? "▲" : "▼"} {Math.abs(Math.round(d))} %
                        </span></td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
          </>
        )}

        {phase === "play" && (
          <div style={{ margin: "18px 16px 8px" }}>
            <button className={"solid cta-big" + (Object.keys(bids).length > 0 ? " ready" : "")}
              style={{ width: "100%", padding: 14 }} disabled={rolling} onClick={closeQuarter}>
              {rolling ? "Läuft …" : <>Halbjahr abschließen {Object.keys(bids).length > 0 && `· ${gebote(Object.keys(bids).length)}`}</>}
            </button>
          </div>
        )}
      </div>

      <div className="tabs">
        <div className="tabinner">
          <span className="ind" style={{ transform: `translateX(${TAB_IDX[tab] * 100}%)` }} />
          {[["deals", "Dealflow"], ["port", "Portfolio"], ["rank", "Peer Group"]].map(([k, n]) => {
            const Icon = TAB_ICON[k];
            return (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => { if (tab !== k) haptic(6); setTab(k); }}>
                <Icon strokeWidth={tab === k ? 2.2 : 1.7} />
                {n}
                {k === "port" && shortlist.length + exitQueue.length > 0 && (
                  <span className="badge">{shortlist.length + exitQueue.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {sheet && <Sheet sheet={sheet} close={() => setSheet(null)} onConfirm={confirmExit} />}
      {useProceeds && (
        <UseProceeds item={useProceeds} me={me} quarter={quarter}
          settle={(keep) => settle(useProceeds.c, useProceeds.gross, useProceeds.buyer,
            useProceeds.feeRate, useProceeds.extra, keep)} />
      )}
      {initPick && me.holdings.find((h) => h.uid === initPick.uid) && (
        <InitPicker c={me.holdings.find((h) => h.uid === initPick.uid)} dim={initPick.dim} market={market}
          start={(id) => { startInit(me.holdings.find((h) => h.uid === initPick.uid), initPick.dim, id); setInitPick(null); }}
          close={() => setInitPick(null)} />
      )}
      {!sheet && !initPick && shortlist.length > 0 && (
        <Shortlist item={shortlist[0]} holding={me.holdings.find((h) => h.uid === shortlist[0].uid)}
          analysis={me.attrs.analysis} hire={hire} reject={rejectAll} />
      )}
      {!sheet && !initPick && shortlist.length === 0 && exitQueue.length > 0 && (
        <Offers item={exitQueue[0]} holding={me.holdings.find((h) => h.uid === exitQueue[0].uid)}
          market={market} neg={NEG} decide={decideOffer} />
      )}
    </div>
  );
}
