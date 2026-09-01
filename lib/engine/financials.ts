/* Finanzberichte einer Beteiligung oder eines Zielunternehmens: GuV, Bilanz und
   Kapitalflussrechnung im Detailgrad eines Investorenmodells.

   Der Punkt dieses Moduls ist, was es NICHT tut: Es rechnet nichts nach. Jede
   Stromgröße ist genau der Betrag, mit dem die Engine in derselben Periode
   gerechnet hat — stepCompany() schreibt sie als c.per mit, die Einmaleffekte
   unterhalb des EBITDA kommen über bookOff() als c.off dazu, und beides landet
   beim Periodenschluss in der hist-Reihe (siehe engine.ts, "Periodenerfassung").
   Eine Berichtsansicht, die ihre Zahlen selbst herleitet, wäre ein zweites
   Modell neben dem Spiel und würde früher oder später etwas anderes behaupten
   als die Karte darüber.

   Drei Konventionen sind dafür nötig, weil die Engine sie so und nicht anders
   rechnet. Sie stehen als Fußnoten unter jedem Bericht:

   1. Bereinigtes gegen berichtetes EBITDA. Die Engine führt das operative
      Ergebnis als Umsatz × Marge — also frei von Einmaleffekten. Programm- und
      Personalwechselkosten bucht sie separat gegen die Nettoverschuldung. Genau
      diese Positionen sind die Überleitung: berichtetes EBITDA = bereinigtes
      EBITDA abzüglich der Einmalaufwendungen der Periode. Nachgeholte
      Investitionen, Cash Release, Zukäufe und Ausschüttungen sind keine
      Ergebnisgrößen und stehen entsprechend unterhalb des EBITDA.
   2. Abschreibungen = Capex. Die Steuerbemessungsgrundlage der Engine ist
      EBITDA − Zins − Capex; Capex steht dort stellvertretend für die
      Abschreibung. Jede andere Annahme hier hätte zur Folge, dass der
      Steueraufwand im Bericht nicht dem der Engine entspricht.
   3. Die Steuer bemisst sich auf dem Ergebnis vor Einmalaufwendungen — die
      Engine kennt keine Steuerwirkung der Einmaleffekte.

   Für Zielunternehmen im Dealflow existiert noch keine Halteperiode. Dort ist
   die einzige modellierte Historie das Umsatzwachstum der letzten drei Jahre
   (d.growth, auf der Karte als "Umsatzwachstum L3Y"); die Reihe wird damit
   zurückgerechnet. Die Darstellung ist cash-free/debt-free, also ohne die
   Finanzierung des Verkäufers — die ist nicht Teil der Transaktion.          */
import {
  BASE_RATE, COV_DEFAULT, LEV_FREE, LEV_STEP, TAX_RATE, OFF_KEYS, OFF_EBITDA_KEYS,
  EVENTS, EVENT_P, GROWTH_NOISE, MARGIN_NOISE, INITS, ONEOFF_P,
} from "./engine.ts";
import { createRng, type Rng } from "./rng.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Netto-Sachanlagen als Vielfaches des Jahres-Capex. Die Engine führt kein
   Anlagevermögen — sie kennt nur die Investitionsquote. Bei gleichmäßiger
   Investition über eine Nutzungsdauer von acht Jahren und linearer Abschreibung
   liegt der Restbuchwert im Beharrungszustand bei rund der halben Nutzungsdauer
   mal Jahres-Capex. Das ist die einzige Brückenannahme des ganzen Moduls und
   steht als Fußnote unter der Bilanz.                                        */
export const PPE_YEARS = 4;
/* Operative Mindestliquidität in Prozent vom Jahresumsatz. Die Engine führt
   nur die Nettoverschuldung — Kasse und Bankdarlehen sind darin verrechnet.
   Für die Bilanz müssen beide getrennt stehen, und die Trennlinie ist genau
   die Kasse, die ein Unternehmen im laufenden Betrieb ohnehin hält. Der Rest
   ergibt sich: Bankdarlehen = Nettoverschuldung + Kasse. Ist die Beteiligung
   netto schuldenfrei, verschwindet das Darlehen und die Kasse trägt den
   Überschuss.                                                              */
export const MIN_CASH_PCT = 2;
// Historie einer Deal-Karte: drei Geschäftsjahre, wie im Verkaufsmemorandum
export const DEAL_YEARS = 3;

/* ---------- Schwankung der historischen Jahre ----------
   Ein Zielunternehmen, dessen drei Geschäftsjahre exakt gleich wachsen und
   exakt dieselbe Marge zeigen, gibt es nicht. Die Jahre müssen schwanken —
   aber nicht irgendwie, sondern mit der Volatilität, die dieses Spiel für die
   Zukunft unterstellt. Sonst verspricht der Datenraum eine Ruhe (oder eine
   Unruhe), die nach dem Kauf niemand wiederfindet.

   Beides kommt deshalb aus der Engine selbst:
   - das laufende Rauschen aus stepCompany() (GROWTH_NOISE, MARGIN_NOISE),
     zwei Halbjahresschritte je Geschäftsjahr;
   - die Sprünge aus dem Ereigniskatalog (EVENTS, EVENT_P) — ein verlorener
     Schlüsselkunde, ein Großauftrag, ein Zukauf. Sie sind der Grund, warum
     ein einzelnes Jahr aus der Reihe fällt.

   Umsatz und Marge zeigen dabei die *unterliegende* Entwicklung. Was einmalig
   ist, gehört nicht dorthin, sondern in die Zeile der Einmalaufwendungen —
   genau dafür gibt es die Unterscheidung von bereinigtem und berichtetem
   EBITDA, und sie gilt in der Historie wie in der Halteperiode. Ein
   Restrukturierungsprogramm oder ein Managementwechsel im Jahr vor dem
   Verkauf drückt deshalb das berichtete Ergebnis, nicht das bereinigte.

   Die Sprünge aus dem Ereigniskatalog wirken gedämpft (HIST_SHOCK_DAMP): Ein
   Ereignis trifft im Spiel ein Halbjahr, ein Geschäftsjahr nimmt davon aber
   nur den Teil auf, der nach dem Ereignis liegt. Eine Jahresreihe zeigt den
   Verlauf, nicht jede einzelne Erschütterung.

   Zwei Anker bleiben exakt erhalten, weil die Karte sie zeigt: das LTM-Jahr
   (Umsatz, Marge, bereinigtes EBITDA) und die Dreijahres-CAGR. Die Streuung
   verteilt sich also *innerhalb* der Historie und verändert weder den
   Ausgangspunkt noch das ausgewiesene Wachstum.

   Gezogen wird deterministisch aus der Kennung des Deals: Dieselbe Karte
   zeigt bei jedem Öffnen dieselbe Historie, und zwei Spieler sehen für
   dasselbe Zielunternehmen dieselben Zahlen.                               */

/* Dämpfung der Ereignissprünge in der Jahresreihe. Ein Ereignis verschiebt im
   Spiel die Laufrate eines Halbjahres; im Jahresabschluss schlägt es nur mit
   dem Teil des Jahres durch, der danach liegt — im Mittel etwa die Hälfte.
   Der Rest der Dämpfung ist Absicht: Die Historie soll die unterliegende
   Entwicklung zeigen, nicht jedes Quartal nachzeichnen.                    */
export const HIST_SHOCK_DAMP = 0.3;


/* Wirkung der Ereignisse auf Umsatz und Marge, direkt aus EVENTS abgelesen
   statt hier abgeschrieben: Jedes Ereignis wird einmal auf ein Musterunter-
   nehmen angewandt und die Veränderung gemessen. So bleibt der Katalog die
   einzige Quelle — wer dort ein Ereignis ändert, ändert die Historie mit. */
let SHOCKS: { rev: number; mg: number }[] | null = null;
function shockTable() {
  if (SHOCKS) return SHOCKS;
  const probeRng = createRng(1);
  const out: { rev: number; mg: number }[] = [];
  (EVENTS as Any[]).forEach((e) => {
    const probe: Any = {
      revenue: 100, margin: 20, quality: 60, netDebt: 30, rate: BASE_RATE, covLimit: COV_DEFAULT,
      sector: "Industrials", drift: 0, marginDrift: 0, capexPct: 4, benchMargin: 20,
      ceo: { skill: 3 }, cfo: { skill: 3 }, r3: { skill: 3 }, plat: 2, acc: 2,
      initP: null, initA: null, holdQ: 4, hist: [{ rev: 100, eb: 20 }],
    };
    try {
      if (e.ok && !e.ok(probe, probeRng)) return;
      e.f(probe, probeRng);
      /* Auch Ereignisse ohne Wirkung auf Umsatz oder Marge kommen in die
         Tabelle: Sie besetzen im Katalog einen Platz und senken damit die
         Wahrscheinlichkeit der übrigen. Ließe man sie weg, träfe das
         Zielunternehmen dreimal so oft ein sichtbarer Sprung wie eine
         Beteiligung im Spiel.                                             */
      out.push({ rev: probe.revenue / 100, mg: probe.margin - 20 });
    } catch {
      /* Ein Ereignis, das mehr Kontext braucht als das Musterunternehmen
         hergibt, bleibt eben draußen — die Berichtsansicht darf daran nicht
         scheitern. */
    }
  });
  SHOCKS = out;
  return out;
}

/* Deterministischer Startwert aus der Kennung des Deals (FNV-1a). */
function seedFrom(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* Einmalaufwendungen, in Vielfachen des bereinigten EBITDA. Die Beträge sind
   die des Maßnahmenkatalogs — ein Cost-out-Programm, eine ERP-Einführung, ein
   abgebrochenes Projekt kosten ein Zielunternehmen dasselbe wie später eine
   Beteiligung.                                                             */
function oneOffTable(): number[] {
  const out: number[] = [];
  Object.values(INITS as Any).forEach((list: Any) => {
    (list as Any[]).forEach((k) => { if (k.oneOff) out.push(k.oneOff); });
  });
  return out.length ? out : [0.1];
}

/* Abweichung eines Geschäftsjahres: zwei Halbjahresschritte, jeweils mit dem
   laufenden Rauschen der Engine und der Chance auf ein Sonderereignis.
   Wachstum in Logarithmen, damit sich die Jahre sauber zur CAGR verketten.
   Der Einmalaufwand steht daneben — er gehört nicht in Umsatz oder Marge. */
function yearDeviation(rng: Rng) {
  let g = 0, m = 0;
  const shocks = shockTable();
  for (let half = 0; half < 2; half++) {
    g += rng.nrm(GROWTH_NOISE) / 200;
    m += rng.nrm(MARGIN_NOISE);
    if (shocks.length && rng.rnd() < EVENT_P) {
      const sh = shocks[Math.floor(rng.rnd() * shocks.length)];
      g += Math.log(sh.rev) * HIST_SHOCK_DAMP;
      m += sh.mg * HIST_SHOCK_DAMP;
    }
  }
  const offs = oneOffTable();
  const oneOff = rng.rnd() < ONEOFF_P ? offs[Math.floor(rng.rnd() * offs.length)] : 0;
  return { g, m, oneOff };
}

export interface FinPeriod {
  key: string;
  label: string;
  /* Zusatz unter der Spaltenüberschrift: Länge der Periode oder Herkunft der
     Zahlen. Halbjahresspalten und rekonstruierte Perioden müssen als solche
     erkennbar sein, sonst vergleicht man Zwölf- mit Sechsmonatszahlen. */
  sub: string;
  months: number;
  /* Eröffnungsspalte: Bilanz zum Vollzug, aber keine Stromgrößen der
     Halteperiode — davor gehörte das Unternehmen jemand anderem. */
  opening: boolean;
  estimated: boolean;

  // GuV
  revenue: number;
  adjEbitda: number;
  oneOff: number;          // Einmalaufwand, positiv = Belastung
  repEbitda: number;
  da: number;
  ebit: number;
  interest: number;        // Zinsaufwand, positiv = Belastung
  ebt: number;
  tax: number;             // positiv = Belastung
  netIncome: number;

  // Bilanz zum Stichtag
  ppe: number;
  goodwill: number;
  nwc: number;
  cash: number;
  assets: number;
  debt: number;            // Bankdarlehen (brutto)
  netDebt: number;         // = debt − cash
  equity: number;

  // Kapitalflussrechnung
  dNwc: number;            // Mittelbindung positiv
  capex: number;
  acquisitions: number;
  distributions: number;
  /* Free Cashflow vor Steuern und Finanzierung: was das Geschäft selbst
     erwirtschaftet, bevor Fiskus und Bank bedient sind.                    */
  fcfPreTax: number;
  netCashFlow: number;     // nach Steuern und Zinsen
  netDebtOpen: number;
  dNetDebt: number;
}

export interface Statements {
  kind: "deal" | "holding";
  name: string;
  sector: string;
  /* Älteste Periode zuerst, jüngste zuletzt — bei einer Beteiligung führt die
     Eröffnungsspalte zum Vollzug die Reihe an.                              */
  periods: FinPeriod[];
  levered: boolean;        // Zinsergebnis und Nettoverschuldung Teil der Sicht?
  anyEstimated: boolean;
  /* Zielunternehmen: der Umsatz des Jahres vor der ersten gezeigten Spalte.
     Er ist die Basis der Dreijahres-CAGR, die auf der Karte steht — drei
     Jahre zurück heißt drei Wachstumsschritte, und der erste davon liegt vor
     dem Anzeigefenster. Ohne diesen Bezugspunkt ließe sich das ausgewiesene
     Wachstum aus den Spalten nicht nachrechnen.                            */
  cagrBase?: number;
}

const pctOf = (v: number, base: number) => (base > 0 ? (v / base) * 100 : 0);

/* Baustein für eine einzelne Spalte. Nimmt ausschließlich Beträge entgegen und
   leitet daraus die Zwischensummen ab — die Zwischensummen sind das Einzige,
   was dieses Modul selbst rechnet.                                          */
function makePeriod(base: {
  key: string; label: string; sub: string; months: number;
  opening?: boolean; estimated?: boolean; levered?: boolean;
  revenue: number; adjEbitda: number; oneOff: number; da: number; interest: number; tax: number;
  dNwc: number; capex: number; acquisitions: number; distributions: number;
  ppe: number; goodwill: number; nwc: number; netDebt: number; equity: number; netDebtOpen: number;
}): FinPeriod {
  const repEbitda = base.adjEbitda - base.oneOff;
  const ebit = repEbitda - base.da;
  const ebt = ebit - base.interest;
  const netIncome = ebt - base.tax;
  /* Erst das Geschäft, dann Fiskus und Bank: Der Free Cashflow vor Steuern
     und Zinsen misst das Unternehmen, der Netto-Cashflow danach das, was der
     Kapitalstruktur nach übrig bleibt und die Verschuldung bewegt.        */
  const fcfPreTax = repEbitda - base.dNwc - base.capex - base.acquisitions;
  const netCashFlow = fcfPreTax - base.tax - base.interest;
  /* Kasse und Bankdarlehen aus der Nettoverschuldung: Die operative
     Mindestliquidität bleibt stehen, das Darlehen trägt den Rest. Ist die
     Nettoverschuldung negativ, gibt es kein Darlehen mehr und die Kasse
     nimmt den Überschuss auf. In beiden Fällen gilt Kasse − Darlehen =
     −Nettoverschuldung, die Bilanz geht also unverändert auf.             */
  const minCash = base.levered ? (MIN_CASH_PCT / 100) * base.revenue * (12 / Math.max(1, base.months)) : 0;
  const debt = Math.max(0, base.netDebt + minCash);
  const cash = debt - base.netDebt;
  return {
    key: base.key, label: base.label, sub: base.sub, months: base.months,
    opening: !!base.opening, estimated: !!base.estimated,
    revenue: base.revenue, adjEbitda: base.adjEbitda, oneOff: base.oneOff, repEbitda,
    da: base.da, ebit, interest: base.interest, ebt, tax: base.tax, netIncome,
    ppe: base.ppe, goodwill: base.goodwill, nwc: base.nwc, cash,
    assets: base.ppe + base.goodwill + base.nwc + cash,
    debt, netDebt: base.netDebt, equity: base.equity,
    dNwc: base.dNwc, capex: base.capex, acquisitions: base.acquisitions,
    distributions: base.distributions, fcfPreTax, netCashFlow,
    netDebtOpen: base.netDebtOpen, dNetDebt: base.netDebt - base.netDebtOpen,
  };
}

/* ---------- Zielunternehmen im Dealflow ----------
   Drei Geschäftsjahre, zurückgerechnet über das ausgewiesene Umsatzwachstum.
   Mehr gibt der Datenraum nicht her: Die Karte kennt genau eine Marge, eine
   Investitions- und eine Working-Capital-Quote. Sie über die Historie zu
   variieren hieße, Zahlen zu erfinden, die im Spiel nirgends existieren —
   die Marge steht deshalb über alle drei Jahre auf dem LTM-Niveau.          */
export function dealStatements(d: Any, opts: { years?: number } = {}): Statements {
  const years = opts.years ?? DEAL_YEARS;
  const g = (d.growth || 0) / 100;
  const cxPct = d.capexPct ?? d.benchCapex ?? 4;
  const nwPct = d.nwcPct ?? d.benchNwc ?? 15;

  /* Schwankung der Jahre, deterministisch aus der Kennung des Deals. Ein
     Jahr mehr als angezeigt, weil die Veränderung des Working Capital im
     ersten sichtbaren Jahr den Umsatz des Jahres davor braucht. */
  const rng = createRng(seedFrom(String(d.id ?? d.name ?? "deal")));
  const dev = Array.from({ length: years + 1 }, () => yearDeviation(rng));
  /* Die Dreijahres-CAGR der Karte muss exakt bleiben: Über die angezeigten
     Jahre hinweg heben sich die Wachstumsabweichungen deshalb auf. Der
     Mittelwert wird abgezogen, nicht eine einzelne Abweichung gekappt —
     sonst trüge ein Jahr die ganze Korrektur.                             */
  const shown = dev.slice(1);
  const meanG = shown.reduce((a, x) => a + x.g, 0) / shown.length;
  shown.forEach((x) => { x.g -= meanG; });
  /* Und das LTM-Jahr trägt die Marge der Karte: Die Abweichungen der
     Vorjahre stehen relativ dazu.                                         */
  const mLtm = shown[shown.length - 1].m;

  /* Umsatzreihe rückwärts aufbauen: vom LTM-Umsatz aus mit dem jeweiligen
     Jahreswachstum (Basiswachstum plus Abweichung) zurückgerechnet.       */
  const logBase = Math.log(1 + g);
  const revenues: number[] = new Array(years + 1);
  revenues[years] = d.revenue;
  for (let i = years - 1; i >= 0; i--) {
    revenues[i] = revenues[i + 1] / Math.exp(logBase + shown[i].g);
  }
  // Umsatz des Jahres vor dem ersten sichtbaren, nur für dessen NWC-Bewegung
  const revBefore = revenues[0] / Math.exp(logBase + dev[0].g);

  const periods: FinPeriod[] = [];
  for (let i = 0; i < years; i++) {
    const back = years - 1 - i;
    const revenue = revenues[i + 1];
    const revPrev = i === 0 ? revBefore : revenues[i];
    const margin = Math.max(2, d.margin + shown[i].m - mLtm);
    const adjEbitda = (revenue * margin) / 100;
    const capex = (revenue * cxPct) / 100;
    /* Die Steuer bemisst sich wie in der Engine auf dem Ergebnis vor
       Einmalaufwendungen; ohne Fremdkapital im Perimeter ist die Basis also
       bereinigtes EBITDA abzüglich Capex.                                 */
    const tax = TAX_RATE * Math.max(0, adjEbitda - capex);
    const nwc = (nwPct / 100) * revenue;
    const oneOff = adjEbitda * shown[i].oneOff;
    periods.push(makePeriod({
      key: "y" + back, label: back === 0 ? "LTM" : `−${back}J`,
      sub: back === 0 ? "letzte 12M" : "12M", months: 12,
      levered: false,
      revenue, adjEbitda, oneOff, da: capex, interest: 0, tax,
      dNwc: (nwPct / 100) * (revenue - revPrev), capex, acquisitions: 0, distributions: 0,
      ppe: PPE_YEARS * capex, goodwill: 0, nwc, netDebt: 0,
      equity: PPE_YEARS * capex + nwc, netDebtOpen: 0,
    }));
  }
  return {
    kind: "deal", name: d.name, sector: d.sector,
    periods, levered: false, anyEstimated: false, cagrBase: revenues[0],
  };
}

/* ---------- Beteiligung im Portfolio ----------
   Volle Historie seit dem Vollzug, inklusive der Transaktionseffekte: Die
   Eröffnungsbilanz steht zum Kaufpreis, die Kaufpreisallokation trägt den
   Unterschied zwischen Enterprise Value und dem übernommenen Vermögen, und die
   Akquisitionsfinanzierung steht als Nettoverschuldung darunter.

   Die Halbjahre der Engine werden zu Geschäftsjahren verdichtet. Ein
   angebrochenes Jahr bleibt ein Halbjahr und ist als solches ausgewiesen —
   lieber eine ehrliche Sechsmonatsspalte als eine hochgerechnete Jahreszahl,
   die es im Spiel nicht gibt.                                               */
export function holdingStatements(c: Any): Statements | null {
  const h: Any[] = c.hist || [];
  if (!h.length) return null;

  const cxPct0 = c.capexPct ?? c.benchCapex ?? 4;
  const nwPct0 = c.nwcPct ?? c.benchNwc ?? 15;
  const entryEbitda = c.entryEbitda ?? h[0].eb;
  const entryMult = c.entryMult ?? h[0].mult ?? 0;
  const ev0 = c.entryEV ?? entryEbitda * entryMult;
  const nd0 = c.entryDebt ?? h[0].nd ?? 0;

  /* Eröffnungsbilanz nach Kaufpreisallokation: Vermögen zum Enterprise Value.
     Das gebundene Working Capital kommt aus der Mitschrift der ersten Periode
     — Schlussbestand abzüglich der Veränderung dieser Periode ist genau der
     Eröffnungsbestand. Die Quote der Karte (benchNwc) taugt dafür nicht: Sie
     ist die Branchenreferenz, während die Engine mit einer Quote rechnet, die
     auch Reifegrad und Wachstum enthält — anders angesetzt liefe die
     Kapitalbindung der Bilanz von Anfang an neben der Engine her.          */
  const firstFin = h.length > 1 ? h[1].fin : null;
  let ppe = (PPE_YEARS * cxPct0 * h[0].rev) / 100;
  let nwc = firstFin && firstFin.nwcBal != null
    ? firstFin.nwcBal - firstFin.nwc
    : (nwPct0 * h[0].rev) / 100;
  let goodwill = ev0 - ppe - nwc;
  let equity = ev0 - nd0;
  let netDebt = nd0;

  const entryCapex = (h[0].rev * cxPct0) / 100;
  const opening = makePeriod({
    key: "entry", label: "Einstieg", sub: "LTM bei Vollzug", months: 12, opening: true, levered: true,
    revenue: h[0].rev, adjEbitda: h[0].eb, oneOff: 0, da: entryCapex, interest: 0,
    tax: TAX_RATE * Math.max(0, h[0].eb - entryCapex),
    dNwc: 0, capex: entryCapex, acquisitions: 0, distributions: 0,
    ppe, goodwill, nwc, netDebt, equity, netDebtOpen: netDebt,
  });

  // Halbjahre einzeln aufbauen, danach zu Geschäftsjahren verdichten
  const halves: FinPeriod[] = [];
  let nwcRelCum = 0;
  for (let i = 1; i < h.length; i++) {
    const prev = h[i - 1], now = h[i];
    const rec = now.fin || null;
    const estimated = !rec;

    let ebH: number, revH: number, capex: number, dNwc: number, interest: number, tax: number;
    let nwcBal: number | null = null;
    if (rec) {
      ebH = rec.ebH; revH = rec.revH; capex = rec.capex; dNwc = rec.nwc;
      interest = rec.interest; tax = rec.tax;
      nwcBal = rec.nwcBal != null ? rec.nwcBal : null;
    } else {
      /* Perioden aus Partien, die vor der Berichtsansicht begonnen haben, tragen
         keine Mitschrift. Sie werden mit exakt den Formeln aus stepCompany()
         rekonstruiert; was dabei nicht aufgeht, fängt die Residualzeile auf,
         sodass die Rechnung trotzdem auf die Nettoverschuldung der Engine
         zuläuft. Solche Spalten sind als geschätzt gekennzeichnet.          */
      ebH = now.eb / 2;
      revH = now.rev / 2;
      capex = (now.rev * cxPct0) / 200;
      dNwc = (nwPct0 / 100) * (now.rev - prev.rev);
      const baseRate = c.rate ?? BASE_RATE;
      const rate = baseRate + Math.max(0, prev.nd / Math.max(0.5, now.eb) - LEV_FREE) * LEV_STEP;
      interest = (prev.nd >= 0 ? prev.nd * rate : prev.nd * baseRate * 0.4) / 200;
      tax = TAX_RATE * Math.max(0, ebH - interest - capex);
    }
    const off: Record<string, number> = {};
    OFF_KEYS.forEach((k) => { off[k] = (rec && rec[k]) || 0; });

    const fcf = ebH - interest - capex - dNwc - tax;
    const booked = off.restr + off.mgmt + off.capexOff + off.nwcRel + off.addon + off.dist;
    /* Residuum gegen die Nettoverschuldung der Engine. Bei mitgeschriebenen
       Perioden ist es null; bei rekonstruierten trägt es alles, was die
       Formeln nicht erklären. Es wird als Einmalaufwand geführt — der weitaus
       größte Teil davon sind Programm- und Personalwechselkosten. */
    const other = (now.nd - prev.nd) - (-fcf + booked);
    const oneOff = OFF_EBITDA_KEYS.reduce((a, k) => a + off[k], 0) + other;

    ppe = ppe + off.capexOff;                 // Abschreibungen = Capex, netto null
    goodwill = goodwill + off.addon;
    /* Der Bestand steht mitgeschrieben zur Verfügung; die Fortschreibung ist
       nur der Rückfallweg für Perioden ohne Mitschrift. Beide Wege sind
       deckungsgleich, weil der Zufluss der Periode genau die Veränderung des
       Bestands ist — die Bilanz geht so oder so auf.

       Der pauschale Einmaleffekt des alten NWC-Programms lief an der Quote
       vorbei (nur gegen die Nettoverschuldung) und fehlt im mitgeschriebenen
       Bestand. Er wird deshalb kumuliert dazugerechnet, nicht je Periode —
       sonst fiele die Freisetzung der Vorperiode in der nächsten wieder weg. */
    nwcRelCum += off.nwcRel;
    nwc = nwcBal != null ? nwcBal + nwcRelCum : nwc + dNwc + off.nwcRel;
    netDebt = now.nd;
    const netIncome = (ebH - oneOff - capex) - interest - tax;
    equity = equity + netIncome - off.dist;

    halves.push(makePeriod({
      key: "h" + i, label: "HJ " + i, sub: "6M", months: 6, estimated, levered: true,
      revenue: revH, adjEbitda: ebH, oneOff, da: capex, interest, tax,
      dNwc: dNwc + off.nwcRel, capex: capex + off.capexOff, acquisitions: off.addon,
      distributions: off.dist,
      ppe, goodwill, nwc, netDebt, equity, netDebtOpen: prev.nd,
    }));
  }

  const periods = [opening, ...groupToYears(halves, true)];
  return {
    kind: "holding", name: c.name, sector: c.sector,
    periods, levered: true,
    anyEstimated: halves.some((p) => p.estimated),
  };
}

/* Zwei Halbjahre ergeben ein Geschäftsjahr: Stromgrößen addiert, Bilanz vom
   Stichtag des zweiten. Bleibt am Ende ein einzelnes Halbjahr übrig, wird es
   als Sechsmonatsspalte ausgewiesen statt stillschweigend hochgerechnet.    */
function groupToYears(halves: FinPeriod[], levered: boolean): FinPeriod[] {
  const out: FinPeriod[] = [];
  for (let i = 0; i < halves.length; i += 2) {
    const a = halves[i], b = halves[i + 1];
    const year = Math.floor(i / 2) + 1;
    if (!b) {
      out.push({ ...a, key: "y" + year, label: "J" + year, sub: "6M (laufend)" });
      continue;
    }
    out.push(makePeriod({
      key: "y" + year, label: "J" + year, sub: "12M", months: 12,
      estimated: a.estimated || b.estimated, levered,
      revenue: a.revenue + b.revenue,
      adjEbitda: a.adjEbitda + b.adjEbitda,
      oneOff: a.oneOff + b.oneOff,
      da: a.da + b.da,
      interest: a.interest + b.interest,
      tax: a.tax + b.tax,
      dNwc: a.dNwc + b.dNwc,
      capex: a.capex + b.capex,
      acquisitions: a.acquisitions + b.acquisitions,
      distributions: a.distributions + b.distributions,
      ppe: b.ppe, goodwill: b.goodwill, nwc: b.nwc,
      netDebt: b.netDebt, equity: b.equity, netDebtOpen: a.netDebtOpen,
    }));
  }
  return out;
}

/* Kennzahlen unter den Berichten. Bewusst dieselben, nach denen ein
   Kreditvertrag und ein Investmentkomitee fragen.                           */
export function ratiosOf(p: FinPeriod, levered: boolean) {
  const annual = 12 / Math.max(1, p.months);
  const ebAnn = p.adjEbitda * annual;
  return {
    adjMargin: pctOf(p.adjEbitda, p.revenue),
    repMargin: pctOf(p.repEbitda, p.revenue),
    // Cash Conversion vor Finanzierung: dieselbe Definition wie auf der Karte
    conversion: p.adjEbitda > 0 ? ((p.adjEbitda - p.capex - p.dNwc) / p.adjEbitda) * 100 : null,
    leverage: levered && ebAnn > 0 ? p.netDebt / ebAnn : null,
    grossLeverage: levered && ebAnn > 0 ? p.debt / ebAnn : null,
    interestCover: levered && p.interest > 0.001 ? p.adjEbitda / p.interest : null,
    capexPct: pctOf(p.capex, p.revenue),
    nwcPct: pctOf(p.nwc, p.revenue * annual),
  };
}

/* Wachstum gegenüber der Vorspalte. Nur sinnvoll zwischen gleich langen
   Perioden — eine Sechsmonatsspalte neben einem Geschäftsjahr ergäbe einen
   Einbruch, den es nicht gab.                                               */
export function growthOf(p: FinPeriod, prev: FinPeriod | null, key: "revenue" | "adjEbitda") {
  if (!prev || prev.opening || p.opening || p.months !== prev.months) return null;
  if (!(prev[key] > 0)) return null;
  return (p[key] / prev[key] - 1) * 100;
}
