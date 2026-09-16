import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import {
  BASE_RATE, LEGACY_COMPAT, SECNAMES, SECTORS,
  accCap, accEff, addonCheck, buildInit, ebitdaOf, maturePeople, nwcPctOf, overstretch,
  peopleLvl, stepCompany, targetMargin,
} from "../engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const market: Record<string, number> = {};
SECNAMES.forEach((s) => (market[s] = SECTORS[s].m));

/* Eine Beteiligung mit reichlich Covenant-Luft, damit Zukauf und Programme
   nicht an der Finanzierung scheitern und der Test misst, was er messen soll. */
function holding(over: Partial<Any> = {}): Any {
  return {
    uid: "t", name: "Testwerk", sector: "Industrials", revenue: 100, margin: 12, quality: 55,
    netDebt: 24, rate: BASE_RATE - 0.5, holdQ: 2, flag: null,
    ceo: { skill: 3 }, cfo: { skill: 3 }, r3: { skill: 2 },
    plat: 2, acc: 2, nwcFix: 0, addonSize: 0.25, addonComp: 0,
    ltip: false, searches: [], initP: null, initA: null, onboard: 0,
    st: 1, proc: null, block: 0, lockUntil: null, cv: false, breach: 0, covLimit: 6.5,
    capexPct: 3, nwcPct: 20, benchMargin: 10.5, benchCapex: 3, benchNwc: 20,
    dd: true, drift: 0, marginDrift: 0, done: [],
    entryMult: 8, entryEbitda: 12, entryDebt: 24, entryEV: 96,
    entryEquity: 74, costTotal: 74, costLeft: 74, cashOut: 0, recapOut: 0, entryQ: 0,
    hist: [{ rev: 100, eb: 12, nd: 24, mg: 12, ql: 55, eq: 72, mult: 8, st: 1, out: 0 }],
    ...over,
  };
}

describe("Add-on: der Zukauf wird bezahlt", () => {
  it("zieht die Akquisitionsschuld erst beim Abschluss, nicht beim Start", () => {
    const c = holding();
    const chk = addonCheck(c, market);
    expect(chk.ok, "Testaufbau: der Zukauf muss finanzierbar sein").toBe(true);
    expect(chk.price).toBeGreaterThan(0);

    const B = buildInit(createRng(7), c, "acc", "ma", market, 3) as Any;
    expect(B).not.toBeNull();
    expect(B.blocked).toBeUndefined();
    /* Beim Start bewegt sich nichts an der Verschuldung: Die Maßnahme hat
       keinen eigenen Einmalaufwand, und der Kaufpreis wird erst beim
       Abschluss gezogen. Er hängt so lange am Vorgang. */
    expect(B.debt).toBe(0);
    expect(B.init.addDebt).toBeCloseTo(chk.price, 9);

    const nd0 = c.netDebt;
    c.netDebt += B.debt;
    c[B.slot] = B.init;
    const rng = createRng(7);
    // Halbjahre vor dem Abschluss: die Schuld ist nirgends
    for (let q = 3; q < B.init.doneQ; q++) {
      maturePeople(rng, c, market, q, false, [], []);
      expect(c.netDebt, `HJ ${q}: Schuld vor dem Abschluss`).toBe(nd0);
      expect(c.initA, `HJ ${q}: Maßnahme läuft noch`).toBeTruthy();
    }
    // Abschluss: Schuld und EBITDA kommen zusammen
    const rev0 = c.revenue;
    maturePeople(rng, c, market, B.init.doneQ, false, [], []);
    expect(c.initA).toBeNull();
    expect(c.netDebt - nd0, "Abschluss: die volle Akquisitionsschuld").toBeCloseTo(chk.price, 9);
    expect(c.revenue).toBeGreaterThan(rev0);
  });

  /* Der eigentliche Grund für die Umstellung: Die Karte genehmigt den Zukauf
     auf der Pro-forma-Verschuldung (Schuld + Kaufpreis) / (EBITDA + Ziel-
     EBITDA). Stand die Schuld ab dem Start allein gegen das alte EBITDA, war
     der tatsächliche Leverage im ganzen Integrationsfenster deutlich höher als
     die Zahl, auf der entschieden wurde — und der Covenant testet den
     tatsächlichen. */
  it("hält den Leverage bis zum Abschluss auf dem Stand vor dem Zukauf", () => {
    const c = holding();
    const chk = addonCheck(c, market);
    const lev0 = c.netDebt / ebitdaOf(c);
    const B = buildInit(createRng(11), c, "acc", "ma", market, 3) as Any;
    c.netDebt += B.debt;
    c[B.slot] = B.init;
    expect(c.netDebt / ebitdaOf(c), "Leverage unmittelbar nach dem Start").toBeCloseTo(lev0, 9);

    const rng = createRng(11);
    for (let q = 3; q <= B.init.doneQ; q++) maturePeople(rng, c, market, q, false, [], []);
    /* Nach dem Abschluss ist der Leverage die Pro-forma-Zahl der Karte —
       bei erfolgreicher Integration auf die Nachkommastelle. */
    if (B.init.ok) {
      expect(c.netDebt / ebitdaOf(c), "Leverage nach dem Abschluss").toBeCloseTo(chk.lev, 1);
      expect(c.netDebt / ebitdaOf(c)).toBeLessThanOrEqual(chk.limit + 0.05);
    }
  });

  it("lässt ihn im Altverhalten weiterhin ungebucht", () => {
    const c = holding();
    const B = buildInit(createRng(7), c, "acc", "ma", market, 3, LEGACY_COMPAT);
    expect((B as Any).debt).toBe(0);
  });

  it("erhöht damit die Verschuldung, statt EBITDA geschenkt zu bekommen", () => {
    const run = (compat: Any) => {
      const rng = createRng(99);
      const c = holding();
      const B = buildInit(rng, c, "acc", "ma", market, 3, compat);
      c.netDebt += (B as Any).debt;
      c[(B as Any).slot] = (B as Any).init;
      for (let q = 3; q <= 8; q++) {
        stepCompany(rng, c, market, 3, compat);
        maturePeople(rng, c, market, q, false, [], [], compat);
        c.off = null;
      }
      return { nd: c.netDebt, rev: c.revenue };
    };
    const neu = run({}), alt = run(LEGACY_COMPAT);
    /* Der Zukauf kommt in beiden Fällen an — die Umsatzpfade sind seit dem
       11.09.2026 aber nicht mehr identisch: Das zugekaufte EBITDA wird jetzt
       über die Ist-Marge der Plattform in Umsatz umgerechnet, im Altverhalten
       über die Branchenmarge (siehe maturePeople). Beide wachsen, nur nicht
       um denselben Betrag. */
    expect(neu.rev).toBeGreaterThan(0);
    expect(alt.rev).toBeGreaterThan(0);
    // Entscheidend bleibt: nur im korrigierten Verhalten steht auch die Schuld dafür.
    expect(neu.nd).toBeGreaterThan(alt.nd);
  });
});

describe("NWC-Programm: die Kapitalbindung sinkt tatsächlich", () => {
  /* Der gemeldete Fehler: Das Working Capital stieg prozentual zum Umsatz,
     statt zu sinken. Ursache war, dass die Quote nur auf den Umsatzzuwachs
     wirkte — der Bestand blieb unberührt. */
  function play(withProgram: boolean, periods = 10) {
    const rng = createRng(2026);
    const c = holding({ plat: 1.2, acc: 1.2, netDebt: 30 });
    for (let q = 1; q <= periods; q++) {
      if (withProgram && !c.initP) {
        const B = buildInit(rng, c, "plat", "nwc", market, q);
        if (B && !(B as Any).blocked) { c.netDebt += (B as Any).debt; c[(B as Any).slot] = (B as Any).init; }
      }
      stepCompany(rng, c, market, 3);
      maturePeople(rng, c, market, q, false, [], []);
      c.off = null;
    }
    return { pct: nwcPctOf(c), bal: c.nwcBal, rev: c.revenue, nd: c.netDebt };
  }

  it("senkt Quote und gebundenes Kapital gegenüber der Beteiligung ohne Programm", () => {
    const ohne = play(false), mit = play(true);
    expect(mit.pct).toBeLessThan(ohne.pct - 3);
    expect(mit.bal / mit.rev).toBeLessThan(ohne.bal / ohne.rev);
  });

  it("setzt dadurch Liquidität frei — die Nettoverschuldung fällt deutlich stärker", () => {
    const ohne = play(false), mit = play(true);
    expect(mit.nd).toBeLessThan(ohne.nd - 5);
  });

  it("führt das Working Capital als Bestand: Quote mal Umsatz", () => {
    const rng = createRng(5);
    const c = holding({ plat: 1.2, acc: 1.2 });
    stepCompany(rng, c, market, 3);
    /* Genau das war vorher nicht so: Der Bestand ergibt sich aus der Quote,
       nicht aus der Summe vergangener Zuwächse. Verglichen wird gegen die
       Quote der Periode aus der Mitschrift — nwcPctOf(c) läse den Stand nach
       dem Reifegradverfall, der erst danach greift.                       */
    expect(c.nwcBal).toBeCloseTo((c.per.nwcPct / 100) * c.revenue, 9);
  });

  it("wirkt im Altverhalten nur auf den Zuwachs", () => {
    const rng = createRng(5);
    const c = holding({ plat: 1.2, acc: 1.2 });
    const rev0 = c.revenue;
    stepCompany(rng, c, market, 3, LEGACY_COMPAT);
    expect(c.per.nwc).toBeCloseTo((c.per.nwcPct / 100) * (c.revenue - rev0), 9);
  });
});

/* Was die Karte vor dem Start über den Reifegradgewinn sagt, muss das sein,
   was die Beteiligung danach tatsächlich trägt. Growth wirkt nur bis
   accCap() — der Rest ist Überdehnung, und die kostet mehr, als das Programm
   einbringt. Bis zum 16.09.2026 stand auf der Karte nur der volle Gewinn.  */
describe("Wirkgrenze des Growth-Reifegrads", () => {
  it("ist eine Zahl an einem Ort: accCap trägt accEff und overstretch", () => {
    for (const [people, plat, acc] of [[2, 2, 2], [4, 2, 5], [1, 5, 3], [5, 5, 5], [3, 1, 4.5]]) {
      const c = holding({ acc, plat, ceo: { skill: people }, cfo: { skill: people }, r3: { skill: people } });
      expect(peopleLvl(c), "Testaufbau").toBeCloseTo(people, 9);
      expect(accCap(c)).toBe(Math.min(people + 1, plat + 1));
      expect(accEff(c)).toBe(Math.min(acc, accCap(c)));
      expect(overstretch(c)).toBeCloseTo(Math.max(0, acc - accCap(c)), 9);
    }
  });

  it("liefert genau den wirksamen Teil, den die Karte vorher ausweist", () => {
    // Plattform auf Benchmark: Der Katalog verspricht mehr, als sie tragen kann
    const c = holding({ acc: 2, plat: 2, ceo: { skill: 4 }, cfo: { skill: 4 }, r3: { skill: 4 } });
    const B = buildInit(createRng(11), c, "acc", "exp", market, 1) as Any;
    expect(B, "Testaufbau: Programm muss startbar sein").toBeTruthy();
    // Die beiden Zeilen der Karte
    const grenze = accCap(c);
    const wirksamLautKarte = Math.max(0, Math.min(Math.min(5, c.acc + B.init.gain), grenze) - accEff(c));
    const ueberhangLautKarte = Math.max(0, Math.min(5, c.acc + B.init.gain) - grenze);
    expect(ueberhangLautKarte, "Testaufbau: es muss etwas überstehen").toBeGreaterThan(0.05);

    const wirkEff0 = accEff(c), ziel0 = targetMargin(c);
    // Nur die Reifung prüfen, nicht die Laufzeit: doneQ auf das laufende
    // Halbjahr setzen und den Ausgang erzwingen.
    c.initA = { ...B.init, ok: true, doneQ: 1 };
    maturePeople(createRng(11), c, market, 1, false, [], []);

    expect(accEff(c) - wirkEff0, "wirksamer Zuwachs").toBeCloseTo(wirksamLautKarte, 9);
    expect(overstretch(c), "Überhang").toBeCloseTo(ueberhangLautKarte, 9);
    // Und was der Überhang kostet: 1,4 pp Zielmarge je Punkt (targetMargin)
    expect(ziel0 - targetMargin(c), "Margenbelastung aus der Überdehnung")
      .toBeCloseTo(ueberhangLautKarte * 1.4, 6);
  });

  it("trägt den vollen Zuwachs, wenn Performance mitzieht", () => {
    const c = holding({ acc: 2, plat: 5, ceo: { skill: 5 }, cfo: { skill: 5 }, r3: { skill: 5 } });
    const B = buildInit(createRng(11), c, "acc", "exp", market, 1) as Any;
    const grenze = accCap(c);
    expect(Math.min(5, c.acc + B.init.gain), "Testaufbau: darf nicht überstehen")
      .toBeLessThanOrEqual(grenze + 1e-9);
    const wirkEff0 = accEff(c);
    c.initA = { ...B.init, ok: true, doneQ: 1 };
    maturePeople(createRng(11), c, market, 1, false, [], []);
    expect(accEff(c) - wirkEff0).toBeCloseTo(B.init.gain, 9);
    expect(overstretch(c)).toBe(0);
  });
});
