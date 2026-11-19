/* Agentenpartie: eine Mehrspielerpartie über die Kommandozeile.

   Zwei (oder mehr) Agenten spielen gegeneinander, jeder auf seinem
   Fondsplatz, die übrigen Plätze übernimmt die KI. Gerechnet wird mit
   runQuarter() — demselben Weg wie die Auswertung auf dem Server
   (supabase/functions/evaluate-seasons). Jeder Agent sieht nur, was auch die
   Oberfläche seinem Platz zeigt: Off-Market-Deals bleiben ohne Due Diligence
   verdeckt, Kandidaten zeigen ihr geschätztes statt ihr wahres Profil, der
   Feed ist nach Fondsplatz gefiltert.

     npx tsx scripts/agent-match.ts init   --dir D [--seed N] [--humans 2] [--names "A,B"]
     npx tsx scripts/agent-match.ts rules
     npx tsx scripts/agent-match.ts view   --dir D --slot S [--dd id1,id2]
     npx tsx scripts/agent-match.ts submit --dir D --slot S --file turn.json
     npx tsx scripts/agent-match.ts wait   --dir D --hy N [--timeout 900]
     npx tsx scripts/agent-match.ts result --dir D

   Sobald alle menschlichen Plätze für das Halbjahr abgegeben haben, wird es
   ausgewertet. `wait` blockiert, bis das Halbjahr N abgeschlossen ist.       */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRng } from "../lib/engine/rng";
import * as E from "../lib/engine/engine";
import { bootstrapInitialDeals, computeFinalRanking, runQuarter } from "../lib/engine/runQuarter";
import { sanitizeDecisions } from "../lib/engine/turnValidate";
import type { RuntimeFund, RuntimeState, TurnDecisions } from "../lib/engine/turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface Match {
  seed: number;          // Stand des Zufallsstroms nach der letzten Auswertung
  halfYear: number;      // Halbjahr, über das gerade entschieden wird (1..PERIODS)
  finished: boolean;
  state: RuntimeState;
  submissions: Record<string, TurnDecisions>;   // slot -> Abgabe für halfYear
  dd: Record<string, string[]>;                 // slot -> in diesem Halbjahr eingesehene Deals
  log: { halfYear: number; decisions: Record<string, TurnDecisions> }[];
  ranking?: unknown;
}

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string, def?: string) => {
  const i = args.indexOf("--" + k);
  return i >= 0 ? args[i + 1] : def;
};
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

function file(dir: string) { return join(dir, "match.json"); }
function load(dir: string): Match { return JSON.parse(readFileSync(file(dir), "utf8")); }
function save(dir: string, m: Match) {
  const tmp = file(dir) + ".tmp" + process.pid;
  writeFileSync(tmp, JSON.stringify(m));
  renameSync(tmp, file(dir));
}

function fund(slot: number, name: string, ai: Any | null): RuntimeFund {
  return {
    slot, profileId: ai ? null : "agent" + slot, isAi: !!ai, archetype: ai ? ai.key : null,
    name: ai ? ai.name : name, attrs: { ...(ai ? ai.attrs : E.DEFAULT_HUMAN_ATTRS) },
    cash: E.CAPITAL, proceeds: 0, investedTotal: 0, fees: 0, holdings: [], realized: [],
    undrawn: E.CAPITAL, drawn: 0, recyc: 0, recycled: 0, distTotal: 0, accrued: 0, calls: [], dists: [],
  } as Any;
}

function init() {
  const dir = opt("dir")!;
  const seed = Number(opt("seed", String(Math.floor(Math.random() * 2 ** 31))));
  const humans = Number(opt("humans", "2"));
  const names = (opt("names", "") || "").split(",").filter(Boolean);
  mkdirSync(dir, { recursive: true });
  const rng = createRng(seed);
  const funds: RuntimeFund[] = [];
  for (let s = 0; s < 5; s++) {
    funds.push(s < humans ? fund(s, names[s] || `Agent ${s + 1} Capital`, null)
      : fund(s, "", (E.ARCHES as Any[])[(s - humans) % 4]));
  }
  const market: Record<string, number> = {};
  E.SECNAMES.forEach((x) => (market[x] = (E.SECTORS as Any)[x].m));
  let state: RuntimeState = { market, funds, feed: [], deals: [], landmark: null, exitQueue: {}, shortlist: {} };
  const boot = bootstrapInitialDeals(rng, market, funds);
  state = { ...state, deals: boot.deals, landmark: boot.landmark };
  save(dir, { seed: rng.seed, halfYear: 1, finished: false, state, submissions: {}, dd: {}, log: [] });
  console.log(JSON.stringify({ ok: true, seed, humans, halfYear: 1 }));
}

/* ---------- Sicht eines Fondsplatzes ---------- */

function seatView(c: Any, k: string) {
  const s = c[k];
  if (!s || !(s.skill > 0)) return { vakant: true, sucheLaeuft: (c.searches || []).some((z: Any) => z.seat === k) };
  return { name: s.name, rating: r1(s.skill), eigenschaft: s.trait || null,
    sucheLaeuft: (c.searches || []).some((z: Any) => z.seat === k) };
}

function initView(i: Any) {
  return i ? { id: i.id, name: i.n, abschlussInHalbjahr: i.doneQ ?? null } : null;
}

function holdingView(c: Any, m: Match, me: Any) {
  const q = m.halfYear, mk = m.state.market;
  const eb = E.ebitdaOf(c);
  const lev = c.netDebt / Math.max(0.5, eb);
  const health = E.healthOf(c, mk);
  const options = (["plat", "acc"] as const).flatMap((dim) => (E.INITS as Any)[dim].map((sp: Any) => {
    const erlaubt = !E.initIn(c, dim) && E.initRuns(c, sp.id) < E.REPEAT_MAX && !(sp.req && !sp.req(c));
    let hinweis = sp.req && !sp.req(c) ? sp.reqT : undefined;
    let addon: Any;
    if (sp.ma) {
      const md = E.addonMandate(c, mk);
      const chk = E.addonCheck(c, mk, { addEb: md.addEb, mult: md.mult, equity: 0 } as Any);
      const maxEb = E.addonMaxEb(c);
      addon = { referenzmandat: { addEb: r1(md.addEb), maxMult: r1(md.mult) }, maxAddEb: r1(maxEb),
        // Das Risiko wächst mit der Zielgröße und sinkt mit dem Höchstgebot
        scheiterrisikoReferenz: r2(E.addonFailRisk(c, { addEb: md.addEb, mult: md.mult } as Any)),
        scheiterrisikoBeiMaxGroesse: r2(E.addonFailRisk(c, { addEb: maxEb, mult: md.mult } as Any)),
        ohneEigenkapitalZulaessig: !!chk && chk.ok,
        eigenkapitalNoetig: chk && chk.ok ? 0 : r1(E.addonEquityNeeded(c, mk, md as Any) || 0) };
      if (chk && !chk.ok) hinweis = "Covenant-Puffer reicht nicht ohne Eigenkapital (Feld equity)";
    }
    return { dim, id: sp.id, name: sp.n, klasse: (E.CLS_LABEL as Any)[sp.cls], eignung: r2(E.fitOf(sp.id, c)),
      bisherigeAuflagen: E.initRuns(c, sp.id), erlaubt, ...(hinweis ? { hinweis } : {}), ...(addon ? { addon } : {}) };
  }));
  const exitable = c.holdQ >= E.MIN_HOLD && !c.proc && !c.lockUntil;
  return {
    uid: c.uid, name: c.name, sektor: c.sector, beschreibung: c.desc, flagge: c.flag || null,
    gehaltenSeitHalbjahren: c.holdQ, anteil: r2(c.st ?? 1),
    umsatz: r1(c.revenue), marge: r1(c.margin), ebitda: r1(eb), qualitaet: Math.round(c.quality),
    ...(c.dd ? { benchmarkMarge: r1(c.benchMargin), sektorWachstum: (E.SECTORS as Any)[c.sector].g } : { benchmark: "verdeckt (Benchmarkstudie: studies)" }),
    nettoverschuldung: r1(c.netDebt), leverage: r2(lev), covenant: r2(c.covLimit ?? E.COV_DEFAULT),
    covenantLuft: r2((c.covLimit ?? E.COV_DEFAULT) - lev), covenantBruchZaehler: c.breach || 0,
    einstieg: { halbjahr: c.entryQ, multiple: r1(c.entryMult), ebitda: r1(c.entryEbitda), eigenkapital: r1(c.costTotal) },
    bewertung: { multiple: r1(E.markMultiple(c, mk)), nav: r1(E.navValueOf(c, mk)), moic: r2(health.moic) },
    prozessreife: r1(c.plat), wachstumsreife: r1(c.acc),
    team: { ceo: seatView(c, "ceo"), cfo: seatView(c, "cfo"), r3: { rolle: (E.ROLE3 as Any)[c.sector]?.n, ...seatView(c, "r3") } },
    mep: !!c.ltip,
    massnahmen: { plat: initView(c.initP), acc: initView(c.initA) },
    massnahmenOptionen: options,
    hinweis: health.top ? health.top.t : null,
    exit: {
      moeglich: exitable, prozessLaeuft: c.proc ? { geboteInHalbjahr: c.proc.resolveQ } : null,
      lockUpBis: c.lockUntil || null, prozessSperreBis: c.block > q ? c.block : null,
      bilateralBruttoSchaetzung: exitable ? r1(Math.max(0, E.eqvOf(c, E.dealMultiple(c, mk, me.attrs.negotiation, q) - E.BIL_DISC))) : null,
      ipoMoeglich: exitable && eb >= E.IPO_EBITDA,
    },
  };
}

function dealView(d: Any, me: Any, seen: boolean) {
  const eb = E.ebitdaOf(d);
  const hidden = d.type === "prop" && !seen;
  const base: Any = {
    id: d.id, typ: d.type === "prop" ? "Off-Market (nur wenige Bieter)" : d.type === "landmark" ? "Trophy Asset (alle bieten)" : "Prozess (Auktion)",
    name: d.name, sektor: d.sector, beschreibung: d.desc, umsatz: r1(d.revenue), wachstumHistorisch: r1(d.growth),
    preiserwartungMultiple: r2(d.askMult), reservationsMultiple: r2(d.askMult * (d.type === "prop" ? E.RESERVE_PROP : E.RESERVE_PROC)),
    maxLeverage: Math.floor(d.levCap * 100) / 100,
  };
  if (hidden) return { ...base, ebitda: "verdeckt", marge: "verdeckt", qualitaet: "verdeckt", flagge: d.flag ? "verdeckt" : null,
    hinweis: "Ohne Due Diligence gekauft droht ein Befund nach Closing (Marge bis −24 %)." };
  const out: Any = { ...base, ebitda: r1(eb), marge: r1(d.margin), qualitaet: Math.round(d.quality), flagge: d.flag || null,
    ddKosten: r2(E.ddCostOf(d)),
    beiPreiserwartung: { ev: r1(eb * d.askMult), eigenkapitalBeiMaxLeverage: r1(eb * d.askMult * (1 + E.ENTRY_FEE) - eb * d.levCap) } };
  if (seen) {
    out.dueDiligence = {
      benchmarkMarge: r1(d.benchMargin), sektorWachstum: (E.SECTORS as Any)[d.sector].g,
      performanceVsMarktSchaetzung: r1(E.driftEstOf(d, me.attrs.analysis)), unsicherheitPlusMinus: r1(E.driftBandOf(me.attrs.analysis)),
    };
  }
  return out;
}

function kpis(f: Any, m: Match) {
  const mk = m.state.market, q = Math.max(1, m.halfYear - (m.finished ? 0 : 1));
  return {
    wertung: r2(E.scoreOf(f, mk, q)), tvcc: r2(E.tvccOf(f, mk, q)), irr: r2(E.irrOf(f, mk, q)),
    tvpi: r2(E.tvpiOf(f, mk, q)), dpi: r2(E.dpiOf(f, mk, q)), nav: r1(E.navOf(f, mk)),
  };
}

function view() {
  const dir = opt("dir")!, slot = Number(opt("slot"));
  const m = load(dir);
  const me = m.state.funds.find((f) => f.slot === slot) as Any;
  if (!me || me.isAi) throw new Error("Kein menschlicher Fondsplatz: " + slot);
  const key = String(slot);
  // Einsicht per Due Diligence: bindend für dieses Halbjahr, bis zum Kontingent
  const want = (opt("dd", "") || "").split(",").filter(Boolean);
  if (want.length && !m.finished) {
    const cap = E.ddCapOf(me.attrs.analysis);
    const cur = new Set(m.dd[key] || []);
    want.forEach((id) => { if (cur.size < cap && (m.state.deals as Any[]).some((d) => d.id === id)) cur.add(id); });
    m.dd[key] = [...cur];
    save(dir, m);
  }
  const seen = new Set(m.dd[key] || []);
  const q = m.halfYear;
  const out: Any = {
    halbjahr: q, von: E.PERIODS, beendet: m.finished,
    abgegeben: !!m.submissions[key],
    fonds: {
      name: me.name, profil: me.attrs,
      investierbar: r1(E.investableOf(me, q)), nichtAbgerufen: r1(me.undrawn), abgerufen: r1(me.drawn),
      ausgeschuettet: r1(me.distTotal), recyclingVerwendet: r1(me.recycled),
      beteiligungen: me.holdings.length, maxBeteiligungen: E.MAX_SLOTS,
      massnahmenSlots: { belegt: (me.holdings as Any[]).reduce((n, h) => n + E.initsOf(h).length, 0), max: E.INIT_SLOTS + Math.floor(me.attrs.operations / 2) },
      ddKontingent: { genutzt: seen.size, max: E.ddCapOf(me.attrs.analysis) },
      investitionsperiodeEndetNachHalbjahr: E.INVEST_PERIOD,
      kennzahlen: kpis(me, m),
    },
    markt: Object.fromEntries(Object.entries(m.state.market).map(([k, v]) => [k, r2(v as number)])),
    dealflow: (m.state.deals as Any[]).map((d) => dealView(d, me, seen.has(d.id))),
    trophyAsset: m.state.landmark && q < E.LM_DEAL ? { hinweis: `Wird in Halbjahr ${E.LM_DEAL} ausgewertet eingestellt und steht ab Halbjahr ${E.LM_DEAL + 1} im Dealflow`, name: (m.state.landmark as Any).name, sektor: (m.state.landmark as Any).sector } : null,
    portfolio: (me.holdings as Any[]).map((c) => holdingView(c, m, me)),
    realisiert: (me.realized as Any[]).map((r) => ({ name: r.name, moic: r2(r.moic) })),
    offeneVerkaufsangebote: (m.state.exitQueue[key] || []).map((it) => ({
      holdingUid: it.holdingUid, name: it.name,
      angebote: it.offers.map((o, i) => ({ offerIndex: i, kaeufer: o.buyer, preis: r1(o.price), risikoDassDerVerkaufScheitert: o.risk, hinweis: o.note })),
    })),
    offeneShortlists: (m.state.shortlist[key] || []).map((it) => ({
      holdingUid: it.holdingUid, name: it.name, seat: it.seat,
      kandidaten: it.candidates.map((c, i) => ({ choice: "c" + i, name: c.name, typ: c.label, geschaetztesRating: r1(c.shown), spanne: r1(c.span),
        eigenschaft: c.trait || null, herkunft: c.origin || null, hinweis: c.note })),
    })),
    peerGroup: m.state.funds.map((f: Any) => ({ name: f.name, ki: f.isAi, du: f.slot === slot, beteiligungen: f.holdings.length, exits: f.realized.length, ...kpis(f, m) }))
      .sort((a, b) => b.wertung - a.wertung),
    meldungenLetztesHalbjahr: m.state.feed
      .filter((n) => n.halfYear === (m.finished ? q : q - 1) && (n.slot == null || n.slot === slot) && n.exceptSlot !== slot)
      .map((n) => `${n.emoji} ${n.text.replace(/<\/?b>/g, "")}`),
  };
  if (m.finished) out.endrangliste = m.ranking;
  console.log(JSON.stringify(out, null, 1));
}

function evaluate(m: Match) {
  const rng = createRng(m.seed);
  const decisionsBySlot: Record<number, TurnDecisions> = {};
  Object.entries(m.submissions).forEach(([s, d]) => (decisionsBySlot[Number(s)] = d));
  // Wie die Datenbank: der Zustand geht als JSON durch jede Runde
  const out = runQuarter({ state: JSON.parse(JSON.stringify(m.state)), halfYear: m.halfYear, decisionsBySlot, rng });
  m.log.push({ halfYear: m.halfYear, decisions: m.submissions });
  m.state = out.state;
  m.seed = rng.seed;
  m.submissions = {};
  m.dd = {};
  if (m.halfYear >= E.PERIODS) {
    m.finished = true;
    m.ranking = computeFinalRanking(out.state, m.halfYear);
  } else m.halfYear += 1;
}

function submit() {
  const dir = opt("dir")!, slot = Number(opt("slot"));
  const m = load(dir);
  if (m.finished) throw new Error("Partie ist beendet.");
  const me = m.state.funds.find((f) => f.slot === slot);
  if (!me || me.isAi) throw new Error("Kein menschlicher Fondsplatz: " + slot);
  const raw = JSON.parse(readFileSync(opt("file")!, "utf8"));
  const d = sanitizeDecisions(raw);
  // Eingesehene Deals sind beauftragt — die Kosten fallen an, ob geboten wird oder nicht
  const seen = m.dd[String(slot)] || [];
  d.dueDiligence = [...new Set([...(d.dueDiligence || []), ...seen])];
  const hy = m.halfYear;
  m.submissions[String(slot)] = d;
  const humans = m.state.funds.filter((f) => !f.isAi);
  const all = humans.every((f) => m.submissions[String(f.slot)]);
  if (all) evaluate(m);
  save(dir, m);
  console.log(JSON.stringify({ ok: true, halbjahr: hy, ausgewertet: all, beendet: m.finished,
    verworfen: Object.keys(raw).filter((k) => !(k in d)) }));
}

async function wait() {
  const dir = opt("dir")!, hy = Number(opt("hy"));
  const until = Date.now() + Number(opt("timeout", "900")) * 1000;
  for (;;) {
    let m: Match | null = null;
    try { m = load(dir); } catch { /* gerade im Schreiben */ }
    if (m && (m.finished || m.halfYear > hy)) { console.log(JSON.stringify({ ok: true, halbjahr: m.halfYear, beendet: m.finished })); return; }
    if (Date.now() > until) { console.log(JSON.stringify({ ok: false, timeout: true })); return; }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

function result() {
  const m = load(opt("dir")!);
  console.log(JSON.stringify({ halbjahr: m.halfYear, beendet: m.finished, rangliste: m.ranking ?? computeFinalRanking(m.state, Math.max(1, m.halfYear - 1)) }, null, 1));
}

const RULES = `PE LEAGUES — Regeln in Kurzform (Agentenpartie)

Ziel: höchste WERTUNG nach ${E.PERIODS} Halbjahren = 0,5 · TVCC/${E.TVCC_BENCH} + 0,5 · IRR/${E.IRR_BENCH * 100} %.
TVCC = Gesamtwert (Ausschüttungen + NAV, nach Gebühren/Carry) je Euro COMMITMENT (${E.CAPITAL} Mio. €), nicht je abgerufenem Euro:
nicht investiertes Kapital zählt also gegen dich. IRR auf die Zahlungsströme der Investoren.
Am Laufzeitende wird alles, was noch im Portfolio liegt, mit Abschlag zwangsverwertet (Tail-End, −${E.LIQ_DISC}× Multiple).

Fonds: ${E.CAPITAL} Mio. € Commitment, ${E.MGMT_FEE * 100} % Management Fee p. a., ${E.CARRY * 100} % Carry über ${E.HURDLE * 100} % Hurdle.
Höchstens ${E.MAX_SLOTS} Beteiligungen gleichzeitig. Gekauft werden kann während der ganzen Laufzeit; nach Halbjahr ${E.INVEST_PERIOD}
sinkt nur die Gebührenbasis, und spät Gekauftes hat kaum Zeit bis zum Laufzeitende.
Exit-Erlöse können recycelt werden: keepPct ist ein ANTEIL zwischen 0 und 1 (0.3 = 30 % einbehalten), kumuliert bis ${E.RECYCLE_CAP * 100} %
des Commitments. Einbehaltenes steht noch im selben Halbjahr für Gebote bereit.
Mehrere Gebote werden in der Reihenfolge des Dealflows abgearbeitet, nicht in der Reihenfolge der Abgabe.

Kauf: Gebot = Multiple auf das EBITDA + Leverage (× EBITDA, höchstens maxLeverage des Deals). Höchstes Multiple gewinnt,
wenn es über dem Reservationspreis liegt. Eigenkapital = EV − Schulden + ${E.ENTRY_FEE * 100} % Transaktionskosten.
KI-Fonds bieten meist 2–10 % über der Preiserwartung auf Prozess-Deals; Off-Market-Deals sehen sie selten.
Covenant = Einstiegs-Leverage + ca. ${E.COV_HEADROOM} Turns. Reißt er und wird nicht geheilt (equityInjections), geht die Beteiligung verloren.
Due Diligence (view --dd id): deckt Off-Market-Deals auf und liefert eine Schätzung der künftigen Performance gegen den Markt. Kostet.

Wertsteigerung: je Beteiligung eine Plattform-Maßnahme (dim "plat": opex, nwc, erp, ai) und eine Wachstums-Maßnahme
(dim "acc": pen, exp, ma) gleichzeitig; fondsweit begrenzte Slots. "eignung" > 1 heißt überdurchschnittlicher Hebel.
Add-on (ma): Zukauf, überwiegend fremdfinanziert; optional equity/addEb/maxMult. Management: CEO, CFO und eine Fachrolle;
schwache Besetzungen per searches ersetzen: Der Amtsinhaber geht SOFORT (Abfindung), die Position ist vakant, bis die
Shortlist ein bis zwei Halbjahre später kommt (→ hires). Wer nicht gestartet werden kann, steht in den Meldungen. MEP (ltip) bindet das Team, kostet ${E.LTIP_SHARE * 100} % des Exiterlöses.

Exit (frühestens nach ${E.MIN_HOLD} Halbjahren Haltedauer):
  process   — Auktion; die Gebote werden ${E.PROC_Q} Halbjahre nach dem Start erzeugt und im Halbjahr danach entschieden
              (offeneVerkaufsangebote → offerDecisions accept/reneg/abort). Jedes Angebot trägt ein Risiko, dass der Verkauf
              scheitert (z. B. Fusionskontrolle) — dann ist die Beteiligung zwei Halbjahre für einen neuen Prozess gesperrt.
  bilateral — sofort, ${E.BIL_DISC}× Multiple-Abschlag
  cv        — ${E.CV_STAKE * 100} % sofort an ein Continuation Vehicle
  ipo       — ${E.IPO_PLACE * 100} % Platzierung, nur ab ${E.IPO_EBITDA} Mio. € EBITDA
Ein Prozess muss spätestens in Halbjahr ${E.PERIODS - E.PROC_Q - 1} starten.

Abgabe (turn.json) — alle Felder optional:
{
  "bids": [{"dealId": "d123", "multiple": 9.4, "leverage": 4.0}],
  "initiatives": [{"holdingUid": "c1", "dim": "plat", "id": "opex"}, {"holdingUid": "c1", "dim": "acc", "id": "ma", "equity": 0}],
  "ltip": ["c1"], "studies": ["c1"],
  "searches": [{"holdingUid": "c1", "seat": "cfo"}],
  "hires": [{"holdingUid": "c1", "seat": "cfo", "choice": "c0"}],            // oder "reject"
  "equityInjections": [{"holdingUid": "c1", "amount": 5}],
  "exitStarts": [{"holdingUid": "c1", "action": "process", "keepPct": 0}],
  "offerDecisions": [{"holdingUid": "c1", "choice": "accept", "offerIndex": 0, "keepPct": 0}]
}
Eine leere Abgabe {} heißt passen.`;

(async () => {
  if (cmd === "init") init();
  else if (cmd === "rules") console.log(RULES);
  else if (cmd === "view") view();
  else if (cmd === "submit") submit();
  else if (cmd === "wait") await wait();
  else if (cmd === "result") result();
  else { console.log("Befehle: init | rules | view | submit | wait | result"); if (!existsSync(".")) process.exit(1); }
})().catch((e) => { console.error(String(e?.message || e)); process.exit(1); });
