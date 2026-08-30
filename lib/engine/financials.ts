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
  BASE_RATE, LEV_FREE, LEV_STEP, TAX_RATE, OFF_KEYS, OFF_EBITDA_KEYS,
} from "./engine.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Netto-Sachanlagen als Vielfaches des Jahres-Capex. Die Engine führt kein
   Anlagevermögen — sie kennt nur die Investitionsquote. Bei gleichmäßiger
   Investition über eine Nutzungsdauer von acht Jahren und linearer Abschreibung
   liegt der Restbuchwert im Beharrungszustand bei rund der halben Nutzungsdauer
   mal Jahres-Capex. Das ist die einzige Brückenannahme des ganzen Moduls und
   steht als Fußnote unter der Bilanz.                                        */
export const PPE_YEARS = 4;
// Historie einer Deal-Karte: drei Geschäftsjahre, wie im Verkaufsmemorandum
export const DEAL_YEARS = 3;

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
  assets: number;
  netDebt: number;
  equity: number;

  // Kapitalflussrechnung
  dNwc: number;            // Mittelbindung positiv
  capex: number;
  acquisitions: number;
  distributions: number;
  cfo: number;
  fcfPreFin: number;
  fcf: number;
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
}

const pctOf = (v: number, base: number) => (base > 0 ? (v / base) * 100 : 0);

/* Baustein für eine einzelne Spalte. Nimmt ausschließlich Beträge entgegen und
   leitet daraus die Zwischensummen ab — die Zwischensummen sind das Einzige,
   was dieses Modul selbst rechnet.                                          */
function makePeriod(base: {
  key: string; label: string; sub: string; months: number;
  opening?: boolean; estimated?: boolean;
  revenue: number; adjEbitda: number; oneOff: number; da: number; interest: number; tax: number;
  dNwc: number; capex: number; acquisitions: number; distributions: number;
  ppe: number; goodwill: number; nwc: number; netDebt: number; equity: number; netDebtOpen: number;
}): FinPeriod {
  const repEbitda = base.adjEbitda - base.oneOff;
  const ebit = repEbitda - base.da;
  const ebt = ebit - base.interest;
  const netIncome = ebt - base.tax;
  const cfo = repEbitda - base.dNwc - base.tax;
  const fcfPreFin = cfo - base.capex - base.acquisitions;
  const fcf = fcfPreFin - base.interest;
  return {
    key: base.key, label: base.label, sub: base.sub, months: base.months,
    opening: !!base.opening, estimated: !!base.estimated,
    revenue: base.revenue, adjEbitda: base.adjEbitda, oneOff: base.oneOff, repEbitda,
    da: base.da, ebit, interest: base.interest, ebt, tax: base.tax, netIncome,
    ppe: base.ppe, goodwill: base.goodwill, nwc: base.nwc,
    assets: base.ppe + base.goodwill + base.nwc,
    netDebt: base.netDebt, equity: base.equity,
    dNwc: base.dNwc, capex: base.capex, acquisitions: base.acquisitions,
    distributions: base.distributions, cfo, fcfPreFin, fcf,
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
  const periods: FinPeriod[] = [];

  for (let back = years - 1; back >= 0; back--) {
    const revenue = d.revenue / Math.pow(1 + g, back);
    const revPrev = d.revenue / Math.pow(1 + g, back + 1);
    const adjEbitda = (revenue * d.margin) / 100;
    const capex = (revenue * cxPct) / 100;
    // Ohne Fremdkapital im Perimeter ist die Steuerbasis EBITDA − Capex,
    // also exakt die Formel der Engine mit Zins null.
    const tax = TAX_RATE * Math.max(0, adjEbitda - capex);
    const nwc = (nwPct / 100) * revenue;
    periods.push(makePeriod({
      key: "y" + back, label: back === 0 ? "LTM" : `−${back}J`,
      sub: back === 0 ? "letzte 12M" : "12M", months: 12,
      revenue, adjEbitda, oneOff: 0, da: capex, interest: 0, tax,
      dNwc: (nwPct / 100) * (revenue - revPrev), capex, acquisitions: 0, distributions: 0,
      ppe: PPE_YEARS * capex, goodwill: 0, nwc, netDebt: 0,
      equity: PPE_YEARS * capex + nwc, netDebtOpen: 0,
    }));
  }
  return {
    kind: "deal", name: d.name, sector: d.sector,
    periods, levered: false, anyEstimated: false,
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

  // Eröffnungsbilanz nach Kaufpreisallokation: Vermögen zum Enterprise Value
  let ppe = (PPE_YEARS * cxPct0 * h[0].rev) / 100;
  let nwc = (nwPct0 * h[0].rev) / 100;
  let goodwill = ev0 - ppe - nwc;
  let equity = ev0 - nd0;
  let netDebt = nd0;

  const entryCapex = (h[0].rev * cxPct0) / 100;
  const opening = makePeriod({
    key: "entry", label: "Einstieg", sub: "LTM bei Vollzug", months: 12, opening: true,
    revenue: h[0].rev, adjEbitda: h[0].eb, oneOff: 0, da: entryCapex, interest: 0,
    tax: TAX_RATE * Math.max(0, h[0].eb - entryCapex),
    dNwc: 0, capex: entryCapex, acquisitions: 0, distributions: 0,
    ppe, goodwill, nwc, netDebt, equity, netDebtOpen: netDebt,
  });

  // Halbjahre einzeln aufbauen, danach zu Geschäftsjahren verdichten
  const halves: FinPeriod[] = [];
  for (let i = 1; i < h.length; i++) {
    const prev = h[i - 1], now = h[i];
    const rec = now.fin || null;
    const estimated = !rec;

    let ebH: number, revH: number, capex: number, dNwc: number, interest: number, tax: number;
    if (rec) {
      ebH = rec.ebH; revH = rec.revH; capex = rec.capex; dNwc = rec.nwc;
      interest = rec.interest; tax = rec.tax;
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
    nwc = nwc + dNwc + off.nwcRel;
    netDebt = now.nd;
    const netIncome = (ebH - oneOff - capex) - interest - tax;
    equity = equity + netIncome - off.dist;

    halves.push(makePeriod({
      key: "h" + i, label: "HJ " + i, sub: "6M", months: 6, estimated,
      revenue: revH, adjEbitda: ebH, oneOff, da: capex, interest, tax,
      dNwc: dNwc + off.nwcRel, capex: capex + off.capexOff, acquisitions: off.addon,
      distributions: off.dist,
      ppe, goodwill, nwc, netDebt, equity, netDebtOpen: prev.nd,
    }));
  }

  const periods = [opening, ...groupToYears(halves)];
  return {
    kind: "holding", name: c.name, sector: c.sector,
    periods, levered: true,
    anyEstimated: halves.some((p) => p.estimated),
  };
}

/* Zwei Halbjahre ergeben ein Geschäftsjahr: Stromgrößen addiert, Bilanz vom
   Stichtag des zweiten. Bleibt am Ende ein einzelnes Halbjahr übrig, wird es
   als Sechsmonatsspalte ausgewiesen statt stillschweigend hochgerechnet.    */
function groupToYears(halves: FinPeriod[]): FinPeriod[] {
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
      estimated: a.estimated || b.estimated,
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
