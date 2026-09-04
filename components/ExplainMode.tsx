"use client";

/* Erklärmodus: der geführte Durchlauf durch die Spielentscheidungen.
   Erst das Briefing mit den Begriffen, dann eine einzelne Beteiligung über
   zehn Halbjahre, bei der ein Coach jeden Schritt kommentiert und das Feld
   markiert, auf das getippt werden muss.

   Abgegrenzt vom Übungsmodus (components/PeLeagues.tsx): dort spielt man eine
   vollständige Solopartie ohne Führung. Beide Modi liegen in eigenen Routen
   (/explain und /practice) und teilen sich die Bausteine aus
   components/pel/ui.tsx. */

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";

import { createRng } from "@/lib/engine";
import type { Rng } from "@/lib/engine";
import {
  ACC_SPREAD, BASE_RATE, BOOK, CAPITAL, COV_DEFAULT, COV_FLOOR, COV_HEADROOM, DD_COST,
  DEFAULT_HUMAN_ATTRS, ENTRY_FEE, EVENTS, EVENT_P, IRR_BENCH, LIQ_DISC, LTIP_SHARE, MAX_PROC,
  MAX_SLOTS, PROC_FEE, PROC_Q, QUAL_COEF, REPEAT_MAX, ROLE3, SECNAMES, SECTORS, SIZE_SCALE,
  TVPI_BENCH, addonCheck, anyInit, bookOff, ceilingFactor, chargeOff, clamp, ddCapOf, ddCostOf,
  dealMoic, periodFin, resetPeriod, dealMultiple, ebitdaOf, effSkill, eqvOf, eur, growthPrem,
  hj, initById, initDur, initGain, initRuns, initSuccess, initsOf, isCapped, makeBridge,
  maturePeople, navValueOf, opLeverage, overstretch, payOf, pct,
  retainerOf, seatLoad, severanceOf, signBonusOf, stepCompany, x,
} from "@/lib/engine";

import {
  CSS, haptic, AnimatedNumber, News, Coach, CoachCtx, Kpi, DealCard, Holding, Def, InitPicker,
  Shortlist, Sheet,
} from "@/components/pel/ui";

/* Das Briefing: die Begriffe, bevor der geführte Durchlauf beginnt. */
function Briefing({ dark, setDark, onStart }) {
  return (
    <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
      <div className="wrap">
        <div style={{ padding: "36px 16px 4px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="eyebrow">Erklärmodus · Vintage 2026</div>
            <h1 className="disp" style={{ fontSize: 38, margin: "8px 0 0" }}>PE-Leagues</h1>
          </div>
          <button className="theme" style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
            onClick={() => setDark(!dark)} aria-label="Darstellung wechseln">{dark ? "☀" : "☾"}</button>
        </div>

        <div className="card">
          <h3 className="disp">Worum es geht</h3>
          <div className="pad" style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink2)" }}>
            Du führst einen Buyout-Fonds über {eur(CAPITAL)} und zehn Jahre, getaktet in Halbjahren. Vier weitere Fonds sitzen in derselben
            Kohorte und sehen denselben Dealflow. Du kaufst Unternehmen, entwickelst sie über die
            Halteperiode und verkaufst sie wieder. Am Ende zählt, was du aus den {eur(CAPITAL)} gemacht hast.
          </div>
        </div>

        <div className="card">
          <h3 className="disp">Der Ablauf</h3>
          <div className="pad" style={{ paddingTop: 4, fontSize: 13, lineHeight: 1.62, color: "var(--ink2)" }}>
            Jedes Halbjahr läuft gleich ab: Ziele ansehen, bieten, das Portfolio entwickeln, gegebenenfalls
            verkaufen — dann „Halbjahr abschließen“. Erst dann lösen sich alle Gebote gleichzeitig auf.
            Gebote sind verdeckt, das höchste Multiple gewinnt, bei Gleichstand entscheidet dein Verhandlungswert.
          </div>
        </div>

        {/* ---------- 1 · Einstieg ---------- */}
        <div className="secthead"><span className="eyebrow">1 · Einstieg</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>Kaufen</span></div>
        <div className="card">
          <Def t="Multiple — die Preiseinheit">
            Unternehmen werden in Vielfachen ihres Jahresgewinns gehandelt. <b>EBITDA</b> ist der operative
            Gewinn, das <b>Multiple</b> der Faktor darauf. 10 Mio. € EBITDA zu 8,5× ergibt einen Unternehmenswert
            von 85 Mio. €. Alle Preise im Spiel sind solche Multiples.
          </Def>
          <Def t="Zwei Wege zu einem Ziel">
            Im <b>strukturierten Prozess</b> bietet die ganze Kohorte mit. Der Verkäufer hat die Zahlen
            aufbereitet, dafür treibt der Wettbewerb den Preis. Ein <b>proprietäres</b> Ziel spricht nur mit
            dir — kein Bieterwettbewerb, deshalb günstiger, aber die Zahlen sind lückenhaft und du trägst das
            Risiko, dass nach dem Kauf etwas auftaucht.
          </Def>
          <Def t="Red Flag und Angle">
            Jedes Ziel trägt höchstens ein Merkmal. Ein <b>Red Flag</b> (rot) ist ein Problem, das den Preis
            drückt — etwa ein Kunde mit zu großem Umsatzanteil oder aufgeschobene Investitionen. Ein
            <b> Angle</b> (gold) ist das Gegenteil: ein Grund, mehr zu zahlen, weil sich darauf eine Strategie
            bauen lässt.
          </Def>
          <Def t="Due Diligence">
            0,6 % des Transaktionswerts für die Prüfung vor dem Kauf, fällig unabhängig vom Ausgang. Sie bestätigt die Zahlen, deckt versteckte Probleme
            auf und liefert vor allem die <b>Branchenreferenz</b>: wie hoch die Marge in dieser Branche üblicherweise
            ist und wie schnell der Markt wächst. Ohne diese beiden Werte kennst du zwar die Zahlen deines Ziels,
            kannst sie aber nicht einordnen — und das bleibt auch nach dem Kauf so.
          </Def>
          <Def t="Eigenkapital und Fremdkapital">
            Du finanzierst jeden Kauf teils aus dem Fonds, teils über Bankschulden. Mehr Schulden heißt weniger
            eigenes Kapital je Deal und damit ein höherer Faktor auf dein Geld — aber die Bank setzt eine
            Obergrenze, den <b>Covenant</b>. Steht die Verschuldung zwei Halbjahre über dieser Grenze, übernehmen
            die Kreditgeber und dein Eigenkapital ist vollständig verloren.
          </Def>
          <Def t="Trophy Asset">
            Einmal je Fondsgeneration kommt ein außergewöhnlich großes Ziel auf den Markt. Doppeltes Ticket,
            ein Jahr Vorlauf zum Sparen, alle bieten mit.
          </Def>
        </div>

        {/* ---------- 2 · Value Creation ---------- */}
        <div className="secthead"><span className="eyebrow">2 · Value Creation</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>Entwickeln</span></div>
        <div className="card">
          <Def t="Drei Reifegrade">
            Jede Beteiligung hat drei Werte auf einer Skala von 0 bis 5. <b>People</b> ist die Qualität des
            Managements, <b>Performance</b> die operative Verfassung (Marge, Investitionen, Working Capital),
            <b> Growth</b> die Fähigkeit zu wachsen. Stufe 2 ist Branchendurchschnitt: dort wächst das Unternehmen
            mit seinem Markt und hält seine Marge. Darüber wird es besser als der Wettbewerb, darunter schlechter.
            Erreichte Stufen bleiben — was ein Programm aufgebaut hat, fällt nicht wieder zurück. Dafür bringt
            jede weitere Stufe über dem Branchenniveau weniger als die davor.
          </Def>
          <Def t="Growth trägt nur, was darunter steht">
            Wachstum wirkt höchstens so weit, wie People und Performance es tragen — konkret bis zum niedrigeren
            der beiden Werte plus eins. Wer den Vertrieb hochfährt, ohne Management und Prozesse mitzuziehen,
            zahlt für Stufen, die nichts bringen, und verliert zusätzlich Marge. Das ist die zentrale Entscheidung
            des Spiels.
          </Def>
          <Def t="Positionen besetzen">
            CEO, CFO und eine branchenspezifische Rolle. Das Rating dieser drei bestimmt, wie schnell und wie
            zuverlässig jedes Programm läuft. Eine Suche dauert ein Halbjahr und kostet 30 % eines Jahresgehalts;
            mehrere Suchen laufen parallel. Eine unbesetzte Stelle spart nichts — sie wird interimistisch besetzt,
            und das ist teurer als eine reguläre Besetzung.
          </Def>
          <Def t="Programme und ihr Risiko">
            Jedes Programm steht je Beteiligung <b>genau einmal</b> zur Verfügung. Über eine Halteperiode
            lassen sich also höchstens vier Performance- und drei Growth-Maßnahmen fahren — die Auswahl
            ist damit eine echte Entscheidung, keine Wiederholung.
            <br /><br />
            <b>Verlässliche</b> Programme liegen im Zugriff des Managements — Kosten senken, Working Capital
            freisetzen, Preise durchsetzen. Sie gelingen in 70–97 % der Fälle, und selbst wenn sie das Ziel
            verfehlen, kommt ein Drittel an. <b>Transformationen</b> wie ERP oder KI sind aufwendig und gehen
            binär aus: 50–90 % je nach Team, ein Fehlschlag bringt nichts außer Kosten. <b>Marktabhängige</b>
            Programme — neuer Markt, Zukauf — hängen an Dritten und gelingen nur in 20–86 % der Fälle.
            Alle drei Spannen hängen fast vollständig am Rating der zuständigen Position.
          </Def>
          <Def t="Assetqualität">
            Eine Note von 0 bis 100, die den Preis beim Verkauf steuert. Sie steigt, wenn das Unternehmen
            schneller wächst als sein Markt und die Marge stabil bleibt, und fällt bei hoher Verschuldung,
            vakanten Positionen oder überdehntem Wachstum.
          </Def>
        </div>

        {/* ---------- 3 · Exit ---------- */}
        <div className="secthead"><span className="eyebrow">3 · Exit</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>Verkaufen</span></div>
        <div className="card">
          <Def t="Vier Wege hinaus">
            <b>Auktion</b> — ein Jahr Vorlauf, dann drei Gebote. Höchster Preis, aber der Markt kann sich in der
            Zwischenzeit drehen. <b>Bilateral</b> — sofort, dafür ein halber Multiple-Punkt Abschlag, kein Risiko.
            <b> GP-led Secondary</b> — 60 % der Beteiligung mit 5 % Abschlag verkaufen und den Rest behalten,
            jedes Halbjahr wiederholbar. <b>IPO</b> — nur bei offenem Börsenfenster, 40 % werden platziert,
            der Rest bleibt ein Jahr gesperrt.
          </Def>
          <Def t="Verhandeln">
            Liegt ein Gebot vor, kannst du annehmen, nachverhandeln oder abbrechen. Nachverhandeln bringt
            meistens mehr, kostet dich aber in einem von vier Fällen den Bieter. Höchstens {MAX_PROC} Prozesse
            laufen gleichzeitig.
          </Def>
          <Def t="Laufzeitende">
            Was nach zehn Jahren noch im Portfolio steht, wird zwangsweise verwertet: 1,5× Abschlag auf das
            Marktmultiple, kein Verhandlungsspielraum, rund 15 % unter Buchwert. Wer rechtzeitig einen Prozess
            startet, bekommt deutlich mehr.
          </Def>
        </div>

        {/* ---------- Wertung ---------- */}
        <div className="secthead"><span className="eyebrow">Wertung</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--gold)" }}>50 % TVPI · 50 % IRR</span></div>
        <div className="card">
          <Def t="Zwei Kennzahlen, je zur Hälfte">
            <b>TVPI</b> misst, wie viel du aus jedem abgerufenen Euro gemacht hast. <b>IRR</b> misst, wie
            schnell er zurückkam. Beide werden gegen den Anspruch eines guten Buyout-Fonds normiert —
            2,00× und 15 % ergeben je einen Punkt. Eine Wertung von 1,00 ist Benchmarkniveau, 1,50 ein
            außergewöhnlicher Jahrgang, unter 0,60 wird das nächste Fundraising schwierig.
          </Def>
          <Def t="Das Exitfenster schließt sich">
            Käufer kennen die Laufzeit deines Fonds. Ab Jahr 8 preisen sie ein, dass du verkaufen musst —
            der erzielbare Multiple sinkt bis zum Laufzeitende um bis zu {LIQ_DISC.toFixed(1).replace(".", ",")} Turns.
            Wer alles bis zum Schluss liegen lässt, verkauft an einen Markt, der das weiß: gemessen 1,02
            Wertung gegen 1,12 bei aktiver Exitsteuerung.
          </Def>
          <Def t="Warum nicht nur der Multiple">
            Weil ein Fonds, der nur auf den Multiple schaut, jedes Asset bis zum Laufzeitende hält — es wird
            ja immer noch ein bisschen mehr. Der IRR bepreist die Zeit und macht aus dem Verkauf wieder eine
            Entscheidung: Ein Unternehmen bei 2,2× nach vier Jahren zu verkaufen ist besser, als bei 2,8×
            nach neun. Umgekehrt schützt der TVPI davor, alles nach drei Jahren wegzuwerfen.
          </Def>
          <Def t="Kapital wird abgerufen, nicht geschenkt">
            Die {eur(CAPITAL)} liegen nicht auf dem Konto, sie sind zugesagt. Abgerufen wird, wenn du kaufst —
            und der IRR läuft ab diesem Tag. Nicht abgerufenes Kapital kostet nichts. Wer spät und gezielt
            investiert, hat es in der Verzinsung leichter, im Multiple aber schwerer.
          </Def>
          <Def t="Bei jedem Exit entscheidest du über die Verwendung">
            Wie viel zurück an die Investoren geht und wie viel im Fonds bleibt, ist deine Entscheidung —
            innerhalb von zwei Schranken: nur bis Jahr 5, und kumuliert höchstens bis zur Höhe des
            Commitments. Danach wird zwingend voll ausgeschüttet.
          </Def>
          <Def t="Einbehalten kauft TVPI mit IRR">
            Bleibt der Erlös im Fonds, arbeitet mehr Kapital je abgerufenem Euro — das hebt den Multiple.
            Es kostet aber systematisch Verzinsung: Ausschütten und später neu abrufen ergibt einen
            Rückfluss heute und einen Abruf morgen, Einbehalten ergibt beides nicht. Der frühere Rückfluss
            gewinnt im IRR immer. Gemessen: durchgehend ausschütten bringt 1,94× bei 17,1 %, durchgehend
            einbehalten 2,20× bei 15,8 %. Beides ist vertretbar — die Frage ist, ob du einen Deal hast,
            der das Geld verdient.
          </Def>
          <Def t="Das Commitment ist eine harte Grenze">
            Mehr als {eur(CAPITAL)} kannst du nicht abrufen. Und die Management Fee liegt innerhalb dieser
            Summe: Über die Laufzeit sind das rund 70 Mio. €, die von Anfang an reserviert werden.
            Investierbar sind ohne Recycling also rund 430 Mio. €, nicht 500. Das angezeigte Dry Powder
            ist bereits um diese Reserve bereinigt.
          </Def>
        </div>

        <div className="card">
          <h3 className="disp">Fondsökonomie</h3>
          <table className="ledger"><tbody>
            <tr><td className="lab">Commitment</td><td style={{ textAlign: "left" }}>{eur(CAPITAL)}, abgerufen bei Bedarf, max. {MAX_SLOTS} Beteiligungen</td></tr>
            <tr><td className="lab">Gebührenreserve</td><td style={{ textAlign: "left" }}>rund 70 Mio. €, vom Dry Powder abgezogen</td></tr>
            <tr><td className="lab">Management Fee</td><td style={{ textAlign: "left" }}>2 % p.a., ab Jahr 6 auf Anschaffungswerte, innerhalb des Commitments</td></tr>
            <tr><td className="lab">Gebührenreserve</td><td style={{ textAlign: "left" }}>rund 70 Mio. €, vom Dry Powder abgezogen</td></tr>
            <tr><td className="lab">Transaktionskosten</td><td style={{ textAlign: "left" }}>2 % beim Kauf, 2–3 % beim Verkauf</td></tr>
            <tr><td className="lab">Carried Interest</td><td style={{ textAlign: "left" }}>20 % über 8 % Hurdle auf die Abrufe</td></tr>
            <tr><td className="lab">Exitfenster</td><td style={{ textAlign: "left" }}>ab Jahr 8 sinkt der erzielbare Preis, bis zu −{LIQ_DISC.toFixed(1).replace(".", ",")}× am Laufzeitende</td></tr>
            <tr><td className="lab">Recycling</td><td style={{ textAlign: "left" }}>frei wählbar bis Jahr 5, kumuliert max. 100 % des Commitments</td></tr>
            <tr><td className="lab">Investitionsperiode</td><td style={{ textAlign: "left" }}>Jahr 1–5</td></tr>
          </tbody></table>
          <p className="hint" style={{ padding: "13px 16px 16px" }}>
            Bewertungskette: EBITDA × Multiple = Unternehmenswert, minus Schulden = Eigenkapitalwert,
            mal deiner Quote = dein Anteil.
          </p>
        </div>

        <div className="card lm">
          <h3 className="disp">Geführter Durchlauf</h3>
          <div className="pad" style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink2)" }}>
            Value Creation einmal an einer einzigen Beteiligung durchspielen — zehn Halbjahre, dieselbe
            Logik wie in der Partie, aber ohne Wettbewerb um Deals und mit eingefrorenen Marktmultiples.
            Was am Ende in der Value Bridge steht, ist ausschließlich deine eigene Arbeit. Ein Coach
            kommentiert jede Periode im Meldungsbereich und erklärt, warum etwas funktioniert hat
            oder eben nicht.
          </div>
          <div className="pad" style={{ paddingTop: 4 }}>
            <button className="solid" style={{ width: "100%", padding: 12 }} onClick={onStart}>
              Erklärmodus starten
            </button>
          </div>
        </div>

        <div style={{ margin: "18px 16px 40px" }}>
          <p className="hint" style={{ margin: "0 0 10px" }}>
            Wenn du stattdessen ohne Führung spielen willst: Der Übungsmodus stellt eine vollständige
            Solopartie gegen vier Fonds derselben Kohorte.
          </p>
          <Link href="/practice" className="btn-secondary"
            style={{ display: "block", width: "100%", textAlign: "center", boxSizing: "border-box" }}>
            Zum Übungsmodus
          </Link>
        </div>
      </div>
    </div>
  );
}



/* ============================================================
   ERKLÄRMODUS — Value Creation an einer Beteiligung
   Läuft auf denselben Funktionen wie die Partie: stepCompany,
   maturePeople, initSuccess, effSkill, markMultiple, makeBridge.
   Unterschied: ein Unternehmen, eingefrorene Marktmultiples und
   ein Coach, der jede Periode kommentiert.
   ============================================================ */

const PRAC_PERIODS = 10;                                  // fünf Jahre Halteperiode
const PRAC_SLOTS = 2;                                     // Performance und Growth parallel
const PRAC_EXIT_FROM = 6;                                 // ab drei Jahren liegt ein Angebot vor
const PRAC_ATTRS = DEFAULT_HUMAN_ATTRS;

function practiceMarket() {
  const m = {};
  SECNAMES.forEach((s) => (m[s] = SECTORS[s].m));         // eingefroren: keine Marktbewegung
  return m;
}

/* Fester Übungsfall: Sondermaschinenbau, knapp über Benchmarkmarge, beide
   Reifegrade unter Branchenniveau, CFO vakant, Gründer-CEO vor dem Rückzug.
   Damit sind alle drei Dimensionen in einer Partie erfahrbar.               */
/* Ein Ziel für den geführten Durchlauf. Bewusst mit Margenlücke zur Branche und
   moderatem Leverage: So gibt es für jede Werkbank etwas zu tun, und der
   Covenant ist nah genug, dass Verschuldung spürbar bleibt.                  */
function practiceDeal(type) {
  const a = BOOK.Industrials[1];
  const quality = type === "prop" ? 56 : 44;
  const revenue = (type === "prop" ? 78 : 52) * SIZE_SCALE;
  const margin = (a.m[0] + a.m[1]) / 2 - (type === "prop" ? 2.2 : 0.4);
  const growth = SECTORS.Industrials.g + (type === "prop" ? 2.4 : 0.3);
  const navF = 0.7 + QUAL_COEF * quality;
  const disc = type === "prop" ? 1.1 : 0;
  return {
    id: "prac_" + type, type, sector: "Industrials", revenue, margin, quality,
    growth, drift: type === "prop" ? 1.1 : -0.4, dnoise: 0,
    askMult: clamp(SECTORS.Industrials.m * navF - disc, 4, 19),
    levCap: clamp(a.lev[1] - 0.3, 3, 5.5),
    capexPct: a.cx, nwcPct: a.nw,
    benchMargin: (a.m[0] + a.m[1]) / 2, benchCapex: a.cx, benchNwc: a.nw,
    flag: type === "prop" ? "Nachfolgesituation" : null,
    desc: a.d,
    name: type === "prop" ? "Hollmann Präzisionstechnik Gruppe" : "Vierbeck Zulieferwerke Gruppe",
  };
}

function makePracticeCo(rng: Rng, d, mult, lev, hadDD) {
  const eb = (d.revenue * d.margin) / 100;
  // Ohne Datenraum dasselbe Post-Closing-Risiko wie in der Partie
  const hit = !hadDD && rng.rnd() < clamp(0.5 - 0.09 * PRAC_ATTRS.analysis, 0.05, 0.5)
    ? 0.10 + rng.rnd() * 0.14 : 0;
  const c = {
    uid: "prac", name: d.name, sector: d.sector, desc: d.desc,
    revenue: d.revenue, margin: d.margin * (1 - hit), quality: d.quality * (1 - hit / 2),
    netDebt: eb * lev, rate: BASE_RATE - 0.25 * PRAC_ATTRS.financing,
    holdQ: 0, flag: d.flag, dd: !!hadDD, hit: hit > 0,
    ceo: { skill: 2.4 }, cfo: { skill: 0 }, r3: { skill: 1.4 },
    plat: 1.1 + rng.rnd() * 0.4, acc: 1.2 + rng.rnd() * 0.4, nwcFix: 0,
    addonSize: 0.24, addonComp: 0,
    ltip: false, searches: [], initP: null, initA: null, onboard: 0,
    st: 1, proc: null, block: 0, lockUntil: null, cv: false, breach: 0,
    covLimit: Math.max(COV_FLOOR, lev + COV_HEADROOM + 0.10 * PRAC_ATTRS.financing),
    capexPct: d.capexPct, nwcPct: d.nwcPct,
    benchMargin: d.benchMargin, benchCapex: d.benchCapex, benchNwc: d.benchNwc,
    drift: d.drift, marginDrift: 0, entryQuality: d.quality * (1 - hit / 2),
    entryMult: mult, entryEbitda: eb, entryDebt: eb * lev,
    entryEV: eb * mult, entryFees: eb * mult * ENTRY_FEE,
    cashOut: 0, recapOut: 0, done: [],
    hist: [{ rev: d.revenue, eb, nd: eb * lev, mg: d.margin, ql: d.quality, eq: eb * mult - eb * lev, mult, st: 1, out: 0 }],
  };
  c.entryEquity = eb * mult - eb * lev + eb * mult * ENTRY_FEE;
  c.costTotal = c.entryEquity; c.costLeft = c.entryEquity;
  c.baseLoad = seatLoad(c);
  return c;
}

const COACH = [
  { id: "base", when: (o) => o.q === 2,
    t: "Oben in der Leiste läuft eine <b>Kontrollrechnung</b> mit: dieselbe Beteiligung, unangetastet gehalten. Ein moderat gehebeltes, cashstarkes Asset liefert auch ohne jedes Zutun einen Rückfluss — allein aus Entschuldung. Dein Maßstab ist nicht 1,0×, sondern dieser Wert. Alles darunter heißt: die Arbeit hat weniger gebracht, als sie gekostet hat." },
  { id: "bench", when: (o) => !o.c.dd,
    t: "Die <b>Branchenreferenz</b> fehlt noch. Ohne sie steht bei Marge, Capex und Working Capital nur der Ist-Wert — ob 12 % Marge für dieses Geschäftsmodell gut oder schlecht sind, weißt du nicht. Genau daran hängt aber die Priorisierung: Cost-out bringt dort viel, wo die Marge unter dem Branchenniveau liegt, und wenig, wo sie schon darüber steht. Die Studie kostet 1 Mio. € und ist die billigste Entscheidung im ganzen Katalog." },
  { id: "cost", when: (o) => o.q === 1,
    t: "Erste Periode gelaufen. Beachte: die <b>2 % Transaktionskosten</b> beim Kauf sind sofort weg und stecken bereits im Einstieg — die ersten Prozentpunkte verdienst du zurück, bevor du überhaupt Wert schaffst. Deshalb ist der Einstiegspreis die wichtigste Einzelentscheidung im ganzen Deal." },
  { id: "vac", when: (o) => o.c.cfo.skill <= 0 && !(o.c.searches || []).some((s) => s.seat === "cfo") && o.q <= 3,
    t: "Der <b>CFO ist vakant</b>. Eine unbesetzte Position zieht das People-Niveau nach unten — und über <code>min(Growth, People+1, Performance+1)</code> deckelt sie direkt dein Wachstum. Und sie spart kein Geld: die Position wird interimistisch besetzt, und Interim kostet ein Viertel mehr als der Vorgänger. Ein Mandat kostet 30 % eines Jahresgehalts und ein Halbjahr — gemessen an der Wirkung auf jede spätere Maßnahme die schnellste Rendite im ganzen Katalog. Du darfst auch beide offenen Positionen gleichzeitig ausschreiben." },
  { id: "search", when: (o) => (o.c.searches || []).some((s) => !s.waiting),
    t: "Search läuft. Nach einem Halbjahr bekommst du drei Kandidaten. Das angezeigte Rating ist eine <b>Schätzung</b> — die Spanne hängt an deiner Due-Diligence-Stärke, und der wahre Wert steht erst beim Antritt fest." },
  { id: "cap", when: (o) => ["cfo", "r3"].some((k) => isCapped(o.c, k)),
    t: "Eine Fachposition wirkt höchstens bis <b>CEO-Rating + 1,5</b>. Der Überschuss verpufft — du bezahlst ihn trotzdem. A-Player berichten nicht dauerhaft an C-Player; wenn du oben investieren willst, fang beim CEO an." },
  { id: "init", when: (o) => anyInit(o.c) && o.q >= 1,
    t: "Maßnahme läuft. Zwei Dinge bestimmen den Ausgang: das <b>effektive Rating</b> auf der zuständigen Position — es steuert Erfolgswahrscheinlichkeit, Dauer und Höhe des Gewinns — und die <b>Risikoklasse</b>. Mit einem schwachen Team liefern verlässliche Maßnahmen rund 70 %, Transformationsprogramme wie ERP oder KI 50–60 %, marktabhängige nur 20–37 %. Mit einem A-Team sind es 97 %, 78–88 % und bis 86 %. Die Besetzung entscheidet mehr als die Auswahl." },
  { id: "jcurve", when: (o) => o.q >= 2 && o.c.margin < (o.c.hist[0] ? o.c.hist[0].mg : 0) && o.c.plat > 1.4,
    t: "Die Marge liegt unter dem Einstiegsniveau, obwohl der Reifegrad steigt. Das ist die <b>J-Kurve</b>: Umsetzungskosten fallen sofort an, der Ertrag kommt mit Verzögerung. Der Anlauf kostet in der ersten zusammenhängenden Periode voll, danach nur noch halb — durchlaufen zu lassen ist billiger als stoppen und neu starten. Wer hier abbricht, hat nur bezahlt." },
  { id: "relfail", when: (o) => o.news.some((n) => n.e === "➖"),
    t: "Zielverfehlung, kein Totalausfall: verlässliche Maßnahmen scheitern nicht binär, sie <b>unterliefern</b>. Ein Cost-out-Programm bringt eben nur 3 statt 5 Prozent — das entspricht der Praxis deutlich besser als ein Münzwurf." },
  { id: "hardfail", when: (o) => o.news.some((n) => n.e === "❌"),
    t: "Diese Maßnahme ist gescheitert und hat trotzdem gekostet. Transformations- und marktabhängige Programme kennen keine Teillieferung: entweder der volle Gewinn oder nichts. Mit einem starken Team liegen sie bei 70–90 %, mit einem schwachen unter 60 % — die Besetzung entscheidet mehr als die Auswahl." },
  { id: "stack", when: (o) => o.c.plat >= 3.2 || o.c.acc >= 3.2,
    t: "Ein Reifegrad steht über 3. Erreichte Stufen <b>bleiben</b> — abgeschlossene Programme zahlen dauerhaft ein. Nur bringt jede weitere Stufe über dem Branchenniveau weniger als die davor. Ab hier lohnt es oft mehr, die schwächere Dimension nachzuziehen als die starke weiter auszubauen." },
  { id: "over", when: (o) => overstretch(o.c) > 0,
    t: "<b>Überdehnung.</b> Dein Growth-Reifegrad ist höher, als People und Performance ihn tragen. Nur der gedeckelte Teil wirkt, der Rest kostet 1,4 pp Marge und drückt die Assetqualität. Genau dieser Fehlermodus — skalieren ohne Unterbau — beschäftigt Operating Partner in der Praxis am häufigsten." },
  { id: "gp", when: (o) => growthPrem(o.c) >= 0.08,
    t: "Deine Umsatz-CAGR liegt über dem Sektor, und das zahlt jetzt <b>direkt aufs Multiple</b> — bis zu +35 %. Wachstum ist empirisch der größte Werthebel der Assetklasse, vor Multiple-Expansion und deutlich vor Margenverbesserung. Es wirkt nur langsamer als ein Kostenprogramm." },
  { id: "oplev", when: (o) => opLeverage(o.c) >= 0.5,
    t: "<b>Operating Leverage</b>: der Umsatz wächst schneller als die Kostenbasis, die Zielmarge steigt mit. Wachstum und Marge sind keine Gegner — wachsende Unternehmen weiten ihre Marge häufiger aus als schrumpfende." },
  { id: "founder", when: (o) => o.news.some((n) => n.e === "👋"),
    t: "Der Gründer-CEO ist raus. Die Flagge <b>Nachfolgesituation</b> im Deal war genau dieses Risiko — sie drückt den Einstiegspreis, weil sie dich zu einer Besetzung zwingt, deren Ausgang du beim Kauf nicht kennst." },
  { id: "lev", when: (o) => o.c.netDebt / Math.max(0.5, ebitdaOf(o.c)) > (o.c.covLimit ?? COV_DEFAULT) - 0.5,
    t: "Der Leverage nähert sich dem <b>Covenant</b>. Zwei Perioden darüber und die Kreditgeber vollstrecken — das Eigenkapital wird ausgebucht, unabhängig davon, wie gut die operative Story ist. Entschuldung ist hier kein Nebeneffekt, sondern Risikomanagement." },
  { id: "ceil", when: (o) => o.c.plat > 3 || o.c.acc > 3,
    t: "Über Reifegrad 3 greift die <b>Sättigung</b>: jede weitere Maßnahme bringt weniger, der Verfall wird gleichzeitig steiler. Ab hier lohnt oft die andere Dimension mehr als die nächste Stufe auf derselben." },
  { id: "idle", when: (o) => !anyInit(o.c) && !(o.c.searches || []).length && o.q >= 2,
    t: "Eine Periode ohne Maßnahme und ohne Search. Deine <b>Umsetzungskapazität</b> verfällt ungenutzt, während Zinsen und Verfall weiterlaufen. Leerlauf ist im Portfolio die teuerste Entscheidung, weil sie sich nicht wie eine anfühlt." },
  { id: "exit", when: (o) => o.q >= PRAC_EXIT_FROM,
    t: "Ab jetzt liegt jede Periode ein <b>Verkaufsangebot</b> auf dem Tisch. Der Multiple steigt in aller Regel weiter — die Frage ist nicht, ob mehr drin wäre, sondern ob das zusätzliche Halbjahr die Verzinsung trägt. Faustregel: Solange der erwartete Wertzuwachs über deiner Zielrendite liegt, halten; darunter verkaufen und das Kapital neu einsetzen. Genau daran scheitern in der Partie die meisten Fonds — sie verkaufen zu spät, weil der Multiple noch steigt." },
  { id: "mep", when: (o) => !o.c.ltip && o.q >= 3,
    t: "Die <b>Managementbeteiligung</b> ist noch nicht aufgesetzt. 6 % Sweet Equity vom Exiterlös kosten dich am Ende Geld — halbieren aber das Retention-Risiko und heben jedes effektive Rating um 0,5. Bei langer Halteperiode rechnet sich das fast immer." },
];

function GuidedRun({ dark, setDark, back }) {
  const [c, setC] = useState(null);
  const [q, setQ] = useState(0);
  const [feed, setFeed] = useState([]);
  const [seen, setSeen] = useState([]);
  const [sl, setSl] = useState([]);
  const [initPick, setInitPick] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [over, setOver] = useState(null);
  /* Kontrollrechnung: dieselbe Beteiligung, unangetastet gehalten. Der Übende
     tritt nicht gegen 1,0× an, sondern gegen das, was Entschuldung und
     Cashflow ohne jedes Zutun ohnehin liefern — genau die Frage, die im
     Investment Committee gestellt wird.                                      */
  const [shadow, setShadow] = useState(null);
  /* Der geführte Durchlauf läuft in drei Phasen: Dealflow (prüfen, bieten),
     Halteperiode (besetzen, Programme, Ergebnisse) und Exit (Prozess, Angebot,
     Verwendung des Erlöses). Der Coach begleitet jeden Schritt und markiert das
     Feld, auf das getippt werden muss.                                       */
  const [phase, setPhase] = useState("deal");
  const [deals, setDeals] = useState([]);
  const [dd, setDd] = useState({});
  const [bid, setBidState] = useState(null);
  const [proc, setProc] = useState(null);
  const [offer, setOffer] = useState(null);
  const [prog, setProg] = useState(0);
  const market = useMemo(practiceMarket, []);
  /* Eigene Zufallsinstanz für den Erklärmodus — unabhängig von der Partie,
     damit sich beide nicht denselben Zufallsstrom teilen. reset() legt bei
     jedem Durchlauf wieder denselben festen Startwert fest. */
  const rngRef = React.useRef<Rng | null>(null);
  const rng = rngRef.current as Rng;

  function reset() {
    rngRef.current = createRng(20260601);
    setPhase("deal"); setDd({}); setBidState(null); setProc(null); setOffer(null);
    setDeals([practiceDeal("prop"), practiceDeal("process")]);
    setProg(0);
    setC(null); setShadow(null);
    setQ(0); setSl([]); setInitPick(null); setSheet(null); setOver(null); setSeen([]);
    setFeed([{
      q: 0, e: "🎓", tone: "tip",
      t: "<b>Erklärmodus.</b> Eine Beteiligung, zehn Halbjahre, dieselbe Value-Creation-Logik wie in der Partie. Die Marktmultiples sind eingefroren — was du am Ende siehst, ist ausschließlich deine eigene Wertschöpfung, ohne Rückenwind vom Markt.",
    }, {
      q: 0, e: "📋", tone: "tip",
      t: "Der Fall: Sondermaschinenbau, 70 Mio. € Umsatz, Marge auf Benchmark, gekauft zu 8,6× mit 2,2× Leverage. <b>Performance 1,2</b> und <b>Growth 1,3</b> liegen beide unter Branchenniveau, der <b>CFO ist vakant</b>, und der CEO ist ein Gründer kurz vor dem Rückzug. Drei Baustellen, zwei Slots — du kannst nicht alles gleichzeitig.",
    }]);
  }

  useEffect(() => { if (!c) reset(); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [q]);

  const freeSlots = c ? PRAC_SLOTS - initsOf(c).length : 0;

  function patch(p) { setC((h) => ({ ...h, ...p })); }

  function startSearch(seat) {
    haptic(8);
    const nm = seat === "ceo" ? "CEO" : seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    patch({ ...chargeOff(c, "mgmt", retainerOf(seat, ebitdaOf(c))),
      searches: [...(c.searches || []), { seat, readyQ: q + 1 }] });
    setFeed((p) => [{ q, e: "🔍", tone: "neu", t: `<b>${c.name}</b>: Search-Mandat für einen neuen ${nm} erteilt — Retainer ${eur(retainerOf(seat, ebitdaOf(c)))}.` }, ...p]);
  }

  function hire(item, cand) {
    haptic(10);
    const had = c[item.seat].skill > 0;
    const nm = item.seat === "ceo" ? "CEO" : item.seat === "cfo" ? "CFO" : ROLE3[c.sector].n;
    patch({
      ...chargeOff(c, "mgmt", signBonusOf(item.seat, cand.skill, ebitdaOf(c))
        + (had ? severanceOf(item.seat, c[item.seat].skill, ebitdaOf(c)) : 0)),
      [item.seat]: { skill: cand.skill, dev: cand.dev, poach: cand.poach }, onboard: 1,
      searches: (c.searches || []).filter((se) => se.seat !== item.seat),
    });
    setSl((p) => p.slice(1));
    setFeed((p) => [{ q, e: "🤝", tone: "pos", t: `<b>${c.name}</b>: Neuer ${nm} an Bord — Rating ${cand.skill.toFixed(1)}, Signing Bonus ${eur(signBonusOf(item.seat, cand.skill, ebitdaOf(c)))}, Gehalt ${eur(payOf(item.seat, cand.skill, ebitdaOf(c)))} p.a.${had ? " Plus zwölf Monatsgehälter Abfindung für den Vorgänger." : ""}` }, ...p]);
  }

  function reject(item) {
    patch({ ...chargeOff(c, "mgmt", retainerOf(item.seat, ebitdaOf(c)) * 0.5),
      searches: (c.searches || []).map((se) => se.seat === item.seat ? { seat: item.seat, readyQ: q + 1 } : se) });
    setSl((p) => p.slice(1));
    setFeed((p) => [{ q, e: "🔍", tone: "neu", t: `<b>${c.name}</b>: Shortlist abgelehnt, Suchmandat wird neu aufgesetzt.` }, ...p]);
  }

  function startInit(dim, id) {
    haptic(8);
    const spec = initById(dim, id);
    if (initRuns(c, id) >= REPEAT_MAX) return;
    const seat = dim === "plat" ? "cfo" : "r3";
    const E = effSkill(c, seat) * (c.onboard > 0 ? 0.7 : 1);
    const dur = Math.max(1, initDur(E) + (spec.dm || 0));
    const p = clamp(initSuccess(E, spec.cls) + (spec.sm || 0), 0.1, 0.97);
    const ok = rng.rnd() < p;
    const sp = spec.spread ? spec.spread[0] + rng.rnd() * (spec.spread[1] - spec.spread[0])
      : dim === "acc" ? ACC_SPREAD[0] + rng.rnd() * (ACC_SPREAD[1] - ACC_SPREAD[0]) : 1;
    let pt = { drag: spec.drag || 0, cx: spec.cx || 0, nwcRun: spec.nwcRun || 0 };
    let debt = ebitdaOf(c) * (spec.oneOff || 0), msg = "";
    // Der Zukaufspreis wird getrennt geführt: in der Berichtsansicht ist er eine
    // Akquisition, während die Programmkosten Einmalaufwand sind.
    let addonPrice = 0;
    if (spec.ma) {
      const chk = addonCheck(c, market);
      if (!chk.ok) {
        setFeed((f2) => [{ q, e: "🏦", tone: "neg", t: `<b>${c.name}</b>: Der Zukauf scheitert an der Finanzierung. Pro forma ${x(chk.lev)} Leverage gegen einen Covenant von ${x(chk.limit)} — die Banken steigen aus.` }, ...f2]);
        return;
      }
      addonPrice = chk.price;
      debt += chk.price;
      pt = { ...pt, ma: true, addEb: chk.addEb, mult: chk.mult, price: chk.price, gain: 1.0, ok };
      msg = ` Add-on mit ${eur(chk.addEb)} EBITDA zu ${x(chk.mult)} für ${eur(chk.price)}, fremdfinanziert. Leverage pro forma ${x(chk.lev)}. Integrationswahrscheinlichkeit ${Math.round(p * 100)} %.`;
    } else {
      pt = { ...pt, gain: initGain(E) * sp * (spec.gm || 1) * ceilingFactor(dim === "plat" ? c.plat : c.acc), ok };
      msg = ` Erfolgswahrscheinlichkeit ${Math.round(p * 100)} %, ${hj(dur)}.${spec.oneOff ? ` Einmalaufwand ${eur(ebitdaOf(c) * spec.oneOff)}.` : ""}`;
    }
    patch({ ...chargeOff(chargeOff(c, "restr", debt - addonPrice), "addon", addonPrice),
      [dim === "plat" ? "initP" : "initA"]: { dim, id, name: spec.n, doneQ: q + dur, ...pt } });
    setFeed((f2) => [{ q, e: spec.ma ? "🏢" : "🛠️", tone: "neu", t: `<b>${c.name}</b>: ${spec.n} gestartet.${msg}` }, ...f2]);
  }

  /* Benchmarkstudie: dieselbe Mechanik wie in der Partie, nur wird sie hier
     nicht aus der Fondsliquidität bezahlt — der Erklärmodus kennt keinen Fonds.
     Die Kosten laufen wie alle Beratungskosten über die Beteiligung.        */
  /* Zuschlag: dieselbe Konstruktion wie in der Partie, nur ohne Wettbewerber.
     Ohne Datenraum greift dasselbe Informationsrisiko wie dort.             */
  function closeDeal(d, mult, lev) {
    haptic(14);
    const co = makePracticeCo(rng, d, mult, lev, !!dd[d.id]);
    setC(co); setShadow(JSON.parse(JSON.stringify(co)));
    setPhase("run");
    setFeed((p) => [{
      q: 0, e: "🤝", tone: "pos",
      t: `Zuschlag für <b>${co.name}</b> bei ${x(mult)} EBITDA — Eigenkapital ${eur(co.entryEquity)}, Fremdkapital ${x(lev)}.${co.hit ? " Nach dem Closing zeigt sich, was der Datenraum verhindert hätte: die Marge liegt niedriger als im Verkaufsmemorandum." : ""} Jetzt beginnt die Halteperiode.`,
    }, ...p]);
  }

  function runDD(d) {
    haptic(8);
    setDd((p) => ({ ...p, [d.id]: true }));
    setFeed((p) => [{ q: 0, e: "🔍", tone: "neu",
      t: `Datenraum zu <b>${d.name}</b> geöffnet (${eur(ddCostOf(d))}). Branchenreferenzen und die erwartete Performance gegenüber dem Markt liegen jetzt vor — und das Post-Closing-Risiko ist ausgeschlossen.` }, ...p]);
  }

  function runStudy() {
    const cost = DD_COST / 2;
    patch({ ...chargeOff(c, "mgmt", cost), dd: true });
    setFeed((p) => [{ q, e: "📊", tone: "neu",
      t: `<b>${c.name}</b>: Benchmarkstudie beauftragt (${eur(cost)}) — Branchenmarge ${pct(c.benchMargin)}, Marktwachstum ${pct(SECTORS[c.sector].g)}, typischer Capex ${pct(c.benchCapex)} vom Umsatz. Erst damit lässt sich beurteilen, wo dieses Unternehmen wirklich steht.` }, ...p]);
  }

  /* Vorzeitiger Verkauf. Ohne diese Möglichkeit trainiert der Erklärmodus
     genau die Gewohnheit, die die Wertung bestraft: durchhalten bis zum Ende,
     weil der Multiple ja noch steigt. Ab Halbjahr 6 liegt jede Periode ein
     Angebot auf dem Tisch — dieselbe Preisbildung wie in der Partie.        */
  function startProc() {
    haptic(12);
    setProc({ resolveQ: q + PROC_Q });
    setFeed((p) => [{ q, e: "📣", tone: "neu",
      t: `Verkaufsprozess für <b>${c.name}</b> eröffnet. Die Bank spricht Käufer an, der Datenraum wird aufbereitet — Gebote liegen in ${hj(PROC_Q)} vor. Bis dahin läuft das Unternehmen weiter, und du kannst weiter daran arbeiten.` }, ...p]);
  }

  function acceptOffer() {
    haptic(12);
    finishExit(c, q, shadow, q < PRAC_PERIODS);
    setOffer(null); setProc(null);
  }

  function toggleLtip() {
    patch({ ltip: true });
    setFeed((p) => [{ q, e: "📜", tone: "neu", t: `<b>${c.name}</b>: Managementbeteiligung (MEP) aufgesetzt — ${Math.round(LTIP_SHARE * 100)} % Sweet Equity, dafür halbes Retention-Risiko und +0,5 effektives Rating.` }, ...p]);
  }

  /* Periodenlauf — Reihenfolge identisch zur Partie */
  function step() {
    if (over || sl.length) return;
    haptic(14);
    const n = { ...c, ceo: { ...c.ceo }, cfo: { ...c.cfo }, r3: { ...c.r3 }, hist: [...c.hist] };
    const before = { plat: n.plat, acc: n.acc, nav: navValueOf(n, market), eb: ebitdaOf(n) };
    const nq = q + 1;
    const news = [], lists = [];

    /* Seed vor dem Periodenschritt sichern: die Kontrollrechnung muss exakt
       dieselben Umweltzüge ziehen (Wachstumsrauschen, Margenrauschen), sonst
       vergleicht man zwei verschiedene Welten statt zweier Entscheidungen.   */
    const seedBefore = rng.seed;
    stepCompany(rng, n, market, PRAC_ATTRS.operations);
    let hitEvent = null;
    if (rng.rnd() < EVENT_P) {
      const pool = EVENTS.filter((e) => !e.ok || e.ok(n, rng));
      if (pool.length) {
        const e = rng.pick(pool);
        if (!(e.m && PRAC_ATTRS[e.m] >= 4 && rng.rnd() < 0.5)) {
          hitEvent = e;
          e.f(n);
          const seat = e.t.startsWith("CEO") ? "ceo" : e.t.startsWith("CFO") ? "cfo" : null;
          news.push({ q: nq, e: e.bad ? (seat ? "🚪" : "🔻") : "🔺", tone: e.bad ? "neg" : "pos",
            t: `<b>${n.name}</b>: ${e.t}${seat ? " — die Position ist vakant." : ""}` });
        }
      }
    }
    maturePeople(rng, n, market, nq, true, news, lists);

    /* Kontrollrechnung mitziehen: gleiche Ereignisse, aber keine Maßnahmen,
       keine Besetzungen, kein MEP. Eigener Zufallsstrang, damit der Schatten
       den Verlauf der echten Beteiligung nicht verschiebt.                   */
    let sh = null;
    if (shadow) {
      const keep = rng.seed;
      rng.setSeed(seedBefore);
      sh = { ...shadow, ceo: { ...shadow.ceo }, cfo: { ...shadow.cfo }, r3: { ...shadow.r3 }, hist: [...shadow.hist] };
      stepCompany(rng, sh, market, PRAC_ATTRS.operations);
      // Vorbedingung erneut prüfen: das Ereignis traf die echte Beteiligung,
      // muss aber auf die Kontrollrechnung nicht zutreffen (etwa "Team zieht ein
      // Projekt vor", während dort gar keine Maßnahme läuft).
      if (hitEvent && (!hitEvent.ok || hitEvent.ok(sh, rng))) hitEvent.f(sh);
      maturePeople(rng, sh, market, nq, false, [], []);
      if (sh.netDebt < -0.5) {
        sh.cashOut = (sh.cashOut || 0) - sh.netDebt; bookOff(sh, "dist", -sh.netDebt); sh.netDebt = 0;
      }
      sh.hist = [...sh.hist, { rev: sh.revenue, eb: ebitdaOf(sh), nd: sh.netDebt, mg: sh.margin, ql: sh.quality,
        eq: navValueOf(sh, market), st: 1, out: sh.cashOut || 0, fin: periodFin(sh) }];
      resetPeriod(sh);
      rng.setSeed(keep);
    }

    if ((n.breach || 0) >= 2) {
      news.push({ q: nq, e: "☠️", tone: "neg", t: `Covenant Breach bei <b>${n.name}</b>: Enforcement durch die Kreditgeber, das Eigenkapital wird ausgebucht.` });
      setOver({ net: 0, moic: 0, bridge: null });
    } else if ((n.breach || 0) === 1) {
      news.push({ q: nq, e: "⚠️", tone: "neg", t: `<b>${n.name}</b> reißt den Covenant von ${x(n.covLimit ?? COV_DEFAULT)} bei ${x(n.netDebt / Math.max(0.5, ebitdaOf(n)))}. Noch ein Halbjahr bis zum Enforcement.` });
    }
    if (n.netDebt < -0.5) {
      const sweep = -n.netDebt;
      bookOff(n, "dist", sweep);
      n.netDebt = 0; n.cashOut = (n.cashOut || 0) + sweep; n.recapOut = (n.recapOut || 0) + sweep;
      news.push({ q: nq, e: "💵", tone: "pos", t: `<b>${n.name}</b> kehrt ${eur(sweep)} Überschussliquidität aus — Nettoverschuldung bei null.` });
    }
    n.hist = [...n.hist, { rev: n.revenue, eb: ebitdaOf(n), nd: n.netDebt, mg: n.margin, ql: n.quality,
      eq: navValueOf(n, market) + (n.cashOut || 0), st: 1, out: n.cashOut || 0, fin: periodFin(n) }];
    resetPeriod(n);

    // Coach
    const ctx = { c: n, q: nq, before, news };
    const fresh = [];
    COACH.forEach((r) => {
      if (fresh.length >= 2 || seen.indexOf(r.id) >= 0) return;
      let hit = false;
      try { hit = r.when(ctx); } catch (err) { hit = false; }
      if (hit) fresh.push(r);
    });
    fresh.forEach((r) => news.push({ q: nq, e: "🎓", tone: "tip", t: r.t }));
    if (fresh.length) setSeen((p) => [...p, ...fresh.map((r) => r.id)]);

    /* Auflösung des Verkaufsprozesses. Die Gebote kommen aus demselben Preis,
       den auch der bilaterale Weg ergäbe — der Unterschied liegt im Wettbewerb
       unter den Käufern, der in der Partie über makeOffers abgebildet ist.   */
    if (proc && nq >= proc.resolveQ && (n.breach || 0) < 2) {
      const g2 = Math.max(0, eqvOf(n, dealMultiple(n, market, PRAC_ATTRS.negotiation)));
      const n2 = g2 * (1 - PROC_FEE) * (n.ltip ? 1 - LTIP_SHARE : 1);
      setOffer({ gross: g2, net: n2, moic: dealMoic(n, n2) });
      news.push({ q: nq, e: "📨", tone: "neu",
        t: `Gebote für <b>${n.name}</b> liegen vor: ${eur(n2)} netto, ${dealMoic(n, n2).toFixed(2)}× auf das eingesetzte Eigenkapital. Der Wettbewerb im Prozess hat den Preis über das getrieben, was ein bilateraler Zuruf gebracht hätte.` });
    }

    setC(n); setQ(nq); if (sh) setShadow(sh);
    if (lists.length) setSl((p) => [...p, ...lists]);
    setFeed((p) => [...news.reverse(), ...p].slice(0, 80));
    /* Läuft ein Prozess, wird am Laufzeitende nicht zwangsabgewickelt — das
       Gebot liegt dann vor und der Spieler entscheidet.                      */
    if (nq >= PRAC_PERIODS && (n.breach || 0) < 2 && !proc && !offer) finishExit(n, nq, sh);
  }

  function exitMoic(z) {
    if (!z) return null;
    const g = Math.max(0, eqvOf(z, dealMultiple(z, market, PRAC_ATTRS.negotiation)));
    return dealMoic(z, g * (1 - PROC_FEE) * (z.ltip ? 1 - LTIP_SHARE : 1));
  }

  /* Deal-IRR auf Halbjahresbasis: eine Auszahlung am Anfang, ein Rückfluss am
     Ende. Zwischenausschüttungen aus dem Cash Sweep werden vereinfachend dem
     Exitzeitpunkt zugerechnet — im Erklärmodus geht es um die Größenordnung,
     nicht um die dritte Nachkommastelle.                                     */
  function pracIrr(moic, holdQ) {
    if (!(moic > 0) || holdQ < 1) return 0;
    return Math.pow(moic, 2 / holdQ) - 1;
  }
  const pracScore = (moic, holdQ) =>
    0.5 * clamp(moic / TVPI_BENCH, -1, 4) + 0.5 * clamp(pracIrr(moic, holdQ) / IRR_BENCH, -1, 4);

  /* Die eigentliche Lektion beim vorzeitigen Verkauf: Was wäre gewesen, wenn
     man gehalten hätte? Dazu wird die Beteiligung ohne weitere Maßnahmen bis
     zum Laufzeitende fortgeschrieben — auf einem eigenen Zufallsstrang, damit
     die Gegenrechnung den tatsächlichen Verlauf nicht beeinflusst.          */
  function holdToEnd(n, nq) {
    if (nq >= PRAC_PERIODS) return null;
    const keep = rng.seed;
    const z = { ...n, ceo: { ...n.ceo }, cfo: { ...n.cfo }, r3: { ...n.r3 }, hist: [...n.hist] };
    for (let t = nq; t < PRAC_PERIODS; t++) {
      stepCompany(rng, z, market, PRAC_ATTRS.operations);
      if (rng.rnd() < EVENT_P) {
        const pool = EVENTS.filter((e) => !e.ok || e.ok(z, rng));
        if (pool.length) rng.pick(pool).f(z);
      }
      maturePeople(rng, z, market, t + 1, false, [], []);
      if (z.netDebt < -0.5) { z.cashOut = (z.cashOut || 0) + -z.netDebt; bookOff(z, "dist", -z.netDebt); z.netDebt = 0; }
      z.hist = [...z.hist, { rev: z.revenue, eb: ebitdaOf(z), nd: z.netDebt, mg: z.margin, ql: z.quality,
        eq: navValueOf(z, market), st: 1, out: z.cashOut || 0, fin: periodFin(z) }];
      resetPeriod(z);
    }
    rng.setSeed(keep);
    if ((z.breach || 0) >= 2) return { moic: 0, score: pracScore(0, PRAC_PERIODS) };
    const g = Math.max(0, eqvOf(z, dealMultiple(z, market, PRAC_ATTRS.negotiation)));
    const nt = g * (1 - PROC_FEE) * (z.ltip ? 1 - LTIP_SHARE : 1);
    const mo = dealMoic(z, nt);
    return { moic: mo, irr: pracIrr(mo, PRAC_PERIODS), score: pracScore(mo, PRAC_PERIODS) };
  }


  /* ---------- Der Coach ----------
     Der Fortschritt ist ein Zähler, keine Zustandsabfrage. Die erste Fassung
     prüfte Bedingungen wie "keine Performance-Maßnahme läuft" — die wird wieder
     wahr, sobald ein Programm fertig ist, und der Coach sprang zurück auf
     Schritt 6. Jetzt hakt jeder Schritt genau einmal ab und der Zähler geht nur
     vorwärts.                                                                */
  const GUIDE = [
    { id: "dd", spot: "dd", sat: () => Object.keys(dd).length > 0,
      eyebrow: "Dealflow", title: "Zwei Ziele, ein Prüfbudget",
      body: () => (<>
        <p>Oben steht ein Off-Market-Deal, darunter eine Auktion. Lies zuerst die Kennzahlen:</p>
        <dl>
          <Kpi t="EBITDA">Der Ertrag, auf den alles gerechnet wird. Kaufpreis und Verschuldung sind Vielfache davon.</Kpi>
          <Kpi t="Preiserwartung">Was der Verkäufer erwartet, in EBITDA-Vielfachen. Deine Verhandlungsbasis, keine Vorschrift.</Kpi>
          <Kpi t="Assetqualität">Marktstellung und Widerstandsfähigkeit, 10 bis 97. Sie treibt das Bewertungsmultiple beim Verkauf.</Kpi>
          <Kpi t="Debt Capacity">Wie viel Fremdkapital die Banken auf dieses Geschäftsmodell geben. Mehr Leverage heißt weniger Eigenkapital je Deal — und weniger Luft, wenn es schlecht läuft.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Beauftrage die Due Diligence beim oberen Deal. Sie kostet Geld, aber ohne Datenraum siehst du weder die Branchenreferenz noch die erwartete Performance gegenüber dem Markt — und trägst das volle Risiko, dass die Zahlen im Memorandum geschönt sind.</p>
      </>) },
    { id: "bid", spot: "bid", sat: () => !!bid,
      eyebrow: "Preis", title: "Der Einstiegspreis ist die wichtigste Zahl des Deals",
      body: () => (<>
        <p>Jetzt sind zwei Zeilen dazugekommen, die vorher fehlten:</p>
        <dl>
          <Kpi t="Erwartete Performance vs. Markt">Wächst dieses Unternehmen dauerhaft schneller oder langsamer als sein Sektor. Ein Punkt davon macht am Ende leicht 0,3× MOIC aus.</Kpi>
          <Kpi t="Branchenreferenz">Marge, Capex und Working Capital im Vergleich zum Sektor. Erst dadurch weißt du, wo Arbeit möglich ist.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Stell den Regler auf die Preiserwartung oder knapp darunter und gib das Angebot ab. Jeder Turn, den du zu viel zahlst, muss später durch operative Arbeit wieder verdient werden — und unter der Schmerzgrenze des Verkäufers kommt gar kein Abschluss zustande.</p>
      </>) },
    { id: "close", spot: "close", sat: () => phase === "run",
      eyebrow: "Vollzug", title: "Angebot liegt vor",
      body: () => <p className="why"><b>Tu jetzt das:</b> Schließ den Kauf ab. Danach beginnt die Halteperiode, und aus dem Ziel wird eine Beteiligung, an der du arbeitest.</p> },
    { id: "study", spot: "study", sat: () => !!(c && c.dd),
      eyebrow: "Bestandsaufnahme", title: "Zuerst wissen, wo das Unternehmen steht",
      body: () => (<>
        <p>Ohne Vergleichsmaßstab sagt eine Marge von {c ? pct(c.margin) : "—"} nichts. Erst die Branchenreferenz zeigt, ob das gut oder schlecht ist — und daran hängt, welche Maßnahme überhaupt etwas bringt.</p>
        <p className="why"><b>Tu jetzt das:</b> Beauftrage die Benchmarkstudie. Sie ist die billigste Entscheidung im ganzen Katalog und die Voraussetzung für alles Weitere.</p>
      </>) },
    { id: "hire", spot: "hire", sat: () => !!(c && (c.cfo.skill > 0 || (c.searches || []).some((se) => se.seat === "cfo"))),
      eyebrow: "Team", title: "Ohne CFO liefert kein Programm",
      body: () => (<>
        <p>Die CFO-Position ist vakant. Das effektive Rating dieser Rolle bestimmt drei Dinge zugleich: wie wahrscheinlich ein Performance-Programm gelingt, wie lange es dauert und wie viel es bringt.</p>
        <dl><Kpi t="Effektives Rating">Rating der Rolle, gedämpft während der Einarbeitung, gehoben durch die Managementbeteiligung.</Kpi></dl>
        <p className="why"><b>Tu jetzt das:</b> Starte den Search für den CFO. Er kostet Retainer und Antrittsprämie und dauert ein Halbjahr — aber ein Programm mit unbesetztem CFO ist verlorene Zeit.</p>
      </>) },
    { id: "ltip", spot: "ltip", sat: () => !!(c && c.ltip),
      eyebrow: "Anreize", title: "Managementbeteiligung aufsetzen",
      body: () => (<>
        <p>{Math.round(LTIP_SHARE * 100)} % Sweet Equity vom Exiterlös kosten dich am Ende Geld. Dafür halbiert sich das Risiko, dass dir Schlüsselpersonen wegbrechen, und jedes effektive Rating steigt um 0,5.</p>
        <p className="why"><b>Tu jetzt das:</b> Setz die MEP auf. Bei einer Halteperiode von mehreren Jahren rechnet sich das fast immer — und die Wirkung beginnt sofort, nicht erst beim Exit.</p>
      </>) },
    { id: "plat", spot: "plat", sat: () => !!(c && c.initP),
      eyebrow: "Performance", title: "Die erste Werkbank belegen",
      body: () => (<>
        <p>Performance und Growth laufen parallel, je eine Werkbank. Im Katalog steht bei jeder Maßnahme, ob sie zu diesem Fall passt:</p>
        <dl>
          <Kpi t="Eignung">Ob überhaupt ein Defizit da ist, an dem die Maßnahme ansetzen kann. Cost-out auf einer Marge über Branchenniveau bringt nichts.</Kpi>
          <Kpi t="Reifegrad">Wie weit diese Dimension ausgebaut ist, 0 bis 5. Über Stufe 3 bringt jede weitere Auflage spürbar weniger.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Öffne Performance und wähle die Maßnahme mit der höchsten Eignung. Programme mit geringer Eignung kosten Geld und Zeit und liefern kaum etwas — das Weglassen ist hier eine echte Entscheidung.</p>
      </>) },
    { id: "acc", spot: "acc", sat: () => !!(c && c.initA),
      eyebrow: "Growth", title: "Wachstum wirkt nur, soweit es getragen wird",
      body: () => (<>
        <p>Growth ist gedeckelt durch Team und Prozessreife: <b>wirksam ist der kleinste Wert aus Growth-Stufe, People + 1 und Performance + 1</b>. Alles darüber ist Überdehnung — es kostet Marge und Assetqualität, ohne zu wirken.</p>
        <p className="why"><b>Tu jetzt das:</b> Belege auch die zweite Werkbank. Wachstum ist empirisch der größte Werthebel der Assetklasse, wirkt aber langsamer als ein Kostenprogramm — deshalb früh anfangen.</p>
      </>) },
    { id: "hold", spot: "close", sat: () => q >= PRAC_EXIT_FROM,
      eyebrow: "Halteperiode", title: "Laufen lassen und beobachten",
      body: () => (<>
        <p>Beim Periodenschluss passiert alles auf einmal: Umsatz und Marge entwickeln sich, Zinsen laufen, Cashflow tilgt Schulden, Programme lösen sich auf. Verfolge dabei:</p>
        <dl>
          <Kpi t="Leverage vs. Covenant">Zwei Perioden über der Grenze und die Kreditgeber vollstrecken — dann ist das Eigenkapital weg, egal wie gut die operative Story war.</Kpi>
          <Kpi t="Cash Conversion">Was vom EBITDA nach Investitionen und Working Capital übrig bleibt. Sie entscheidet, wie schnell du entschuldest.</Kpi>
          <Kpi t="Total Value">NAV plus bereits ausgeschüttete Beträge, geteilt durch dein eingesetztes Eigenkapital.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Schließ die Halbjahre ab. Wird eine Werkbank frei, belege sie neu — Maßnahmen lassen sich wiederholen, jede weitere Auflage bringt aber weniger. Leerlauf ist die teuerste Entscheidung im Portfolio, weil sie sich nicht wie eine anfühlt.</p>
      </>) },
    { id: "proc", spot: "proc", sat: () => !!proc || !!offer || !!over,
      eyebrow: "Exit", title: "Wann verkaufen ist die eigentliche Frage",
      body: () => (<>
        <p>Der Multiple steigt in aller Regel weiter. Die Frage ist nicht, ob mehr drin wäre, sondern ob das zusätzliche Halbjahr die Verzinsung trägt.</p>
        <dl>
          <Kpi t="MOIC">Was aus jedem eingesetzten Euro geworden ist. Steigt mit der Haltedauer fast immer weiter.</Kpi>
          <Kpi t="IRR">Wie schnell er zurückkam. Sinkt mit jedem Halbjahr, in dem das Kapital gebunden bleibt.</Kpi>
        </dl>
        <p className="why"><b>Tu jetzt das:</b> Eröffne den Verkaufsprozess. Er dauert {hj(PROC_Q)} — in dieser Zeit läuft das Unternehmen weiter, und du kannst weiter daran arbeiten. Faustregel: Solange der erwartete Wertzuwachs über deiner Zielrendite liegt, halten; darunter verkaufen.</p>
      </>) },
    { id: "wait", spot: "close", sat: () => !!offer || !!over,
      eyebrow: "Prozess läuft", title: "Bis zu den Geboten weiterarbeiten",
      body: () => <p className="why"><b>Tu jetzt das:</b> Schließ die Halbjahre ab. Ein laufender Prozess hindert dich nicht daran, weiter am Unternehmen zu arbeiten — im Gegenteil, jede Verbesserung bis zum Signing zahlt auf den Preis ein.</p> },
    { id: "accept", spot: "accept", sat: () => !!over,
      eyebrow: "Angebot", title: "Der Erlös und was danach damit passiert",
      body: () => (<>
        <p>Vom Bruttoerlös gehen {Math.round(PROC_FEE * 100)} % Transaktionskosten ab, dazu die Managementbeteiligung. Was übrig bleibt, fließt in der Partie an den Fonds — und dort entscheidest du, ob es an die Investoren zurückgeht oder für den nächsten Deal im Fonds bleibt.</p>
        <p className="why"><b>Tu jetzt das:</b> Nimm das Angebot an. Danach siehst du die Value Bridge: welcher Teil des Ergebnisses aus EBITDA-Wachstum kam, welcher aus dem Multiple, welcher aus Entschuldung — und was dieselbe Beteiligung gebracht hätte, wenn du sie nie angefasst hättest.</p>
      </>) },
  ];

  /* Der Zähler geht nur vorwärts und überspringt Schritte, die beim Aufrufen
     schon erledigt sind — wer den CFO vor der Benchmarkstudie besetzt, wird
     nicht zurückgeschickt.                                                   */
  useEffect(() => {
    let i = prog;
    while (i < GUIDE.length && GUIDE[i].sat()) i++;
    if (i !== prog) setProg(i);
  });

  function guide() {
    if (over || prog >= GUIDE.length) return null;
    const g = GUIDE[prog];
    return { step: prog + 1, total: GUIDE.length, spot: g.spot,
      eyebrow: `Schritt ${prog + 1} — ${g.eyebrow}`, title: g.title, body: g.body() };
  }

  function finishExit(n, nq, sh, early) {
    // Exit über einen strukturierten Prozess: kein Kanalabschlag, damit in der
    // Value Bridge ausschließlich die eigene Arbeit sichtbar wird.
    const gross = Math.max(0, eqvOf(n, dealMultiple(n, market, PRAC_ATTRS.negotiation)));
    const net = gross * (1 - PROC_FEE) * (n.ltip ? 1 - LTIP_SHARE : 1);
    const bridge = makeBridge(n, gross, net);
    const moic = dealMoic(n, net);
    const base = exitMoic(sh);
    const held = early ? holdToEnd(n, nq) : null;
    setOver({ net, moic, bridge, base, holdQ: nq, early: !!early, held,
      irr: pracIrr(moic, nq), score: pracScore(moic, nq),
      baseScore: base != null ? pracScore(base, nq) : null });
    setSheet({ kind: "bridge", c: n, price: net, buyer: "Strategischer Käufer", bridge });
    setFeed((p) => [{
      q: nq, e: "🎓", tone: "tip",
      t: `<b>Fazit.</b> ${moic.toFixed(2)}× nach ${hj(nq)} — ${(pracIrr(moic, nq) * 100).toFixed(0)} % IRR, Wertung ${pracScore(moic, nq).toFixed(2)}.${held ? ` Hättest du bis zum Laufzeitende gehalten, ohne weiter einzugreifen: ${held.moic.toFixed(2)}× bei ${(held.irr * 100).toFixed(0)} % — Wertung ${held.score.toFixed(2)}. ${held.score > pracScore(moic, nq) ? "Zu früh verkauft: die verbleibende Wertsteigerung war den zusätzlichen Zeitaufwand wert." : "Richtig verkauft: der Multiple wäre zwar weiter gestiegen, aber langsamer als dein Kapital anderswo verdient."}` : ""} ${moic.toFixed(2)}× auf das eingesetzte Eigenkapital${(n.recapOut || 0) > 0.5 ? ` — davon ${eur(n.recapOut)} bereits während der Haltezeit ausgeschüttet, der Rest beim Exit` : ""}.${base != null ? ` Dieselbe Beteiligung unangetastet gehalten: <b>${base.toFixed(2)}×</b> — allein aus Entschuldung und Cashflow. Deine Arbeit hat ${moic >= base ? "" : "−"}${Math.abs(Math.round((moic - base) * 100))} Prozentpunkte ${moic >= base ? "hinzugefügt" : "gekostet"}. Genau diese Frage stellt das Investment Committee: Was wäre ohne dich passiert?` : ""} Lies die Value Bridge von oben nach unten: Der <b>EBITDA-Balken</b> ist deine operative Arbeit, <b>Multiple-Expansion</b> kommt hier ausschließlich aus Assetqualität und Wachstumsprämie — der Markt stand still. <b>Entschuldung</b> ist der Cashflow, den das Unternehmen selbst erwirtschaftet hat. Der Kostenbalken ist der Teil, den du nie zurückverdienst.`,
    }, ...p]);
  }

  const G = guide();

  /* Dealflow: eigener Bildschirm, damit der Kauf nicht zwischen Portfolioarbeit
     untergeht. Fondsobjekt nur so weit, wie die Dealkarte es braucht.        */
  if (phase === "deal") {
    const meStub = { holdings: [], undrawn: CAPITAL, recyc: 0, cash: CAPITAL, attrs: PRAC_ATTRS };
    return (
      <CoachCtx.Provider value={G && G.spot}>
        <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
          <div className="bar">
            <div className="barrow">
              <div>
                <div className="stat">Erklärmodus · Dealflow</div>
                <div className="statv mono">{eur(CAPITAL)} <span style={{ fontSize: 11, opacity: .6 }}>Dry Powder</span></div>
              </div>
              <button className="theme" onClick={() => { haptic(6); setDark(!dark); }} aria-label="Darstellung wechseln">
                {dark ? "☀" : "☾"}
              </button>
            </div>
          </div>
          <div className="wrap">
            {G && <Coach {...G}>{G.body}</Coach>}
            {deals.map((d) => (
              <DealCard key={d.id} d={d} me={meStub} bid={bid && bid.id === d.id ? bid : null}
                dd={!!dd[d.id]} onDD={() => runDD(d)} market={market} quarter={0}
                ddUsed={Object.keys(dd).length} ddCap={ddCapOf(PRAC_ATTRS.analysis)}
                setBid={(b2) => setBidState({ id: d.id, ...b2 })} clear={() => setBidState(null)} />
            ))}
            {bid && (
              <div style={{ margin: "8px 16px 40px" }}>
                <button className={"solid cta-big" + (G && G.spot === "close" ? " spot" : "")}
                  style={{ width: "100%", padding: 14 }}
                  onClick={() => { const d = deals.find((x2) => x2.id === bid.id); closeDeal(d, bid.mult, bid.lev); }}>
                  Kauf abschließen
                </button>
              </div>
            )}
            <div style={{ margin: "0 16px 40px" }}>
              <button style={{ width: "100%" }} onClick={back}>Zurück zum Briefing</button>
            </div>
          </div>
        </div>
      </CoachCtx.Provider>
    );
  }

  if (!c) return null;
  const nav = navValueOf(c, market), moic = (nav + (c.cashOut || 0)) / c.costTotal;
  const offerGross = Math.max(0, eqvOf(c, dealMultiple(c, market, PRAC_ATTRS.negotiation)));
  const offerNet = offerGross * (1 - PROC_FEE) * (c.ltip ? 1 - LTIP_SHARE : 1);
  const offerMoic = dealMoic(c, offerNet);

  return (
    <CoachCtx.Provider value={G && G.spot}>
    <div className={"pel" + (dark ? " dark" : "")}><style>{CSS}</style>
      <div className="bar">
        <div className="barrow">
          <div>
            <div className="stat">Erklärmodus · Jahr {Math.floor(q / 2) + 1} · H{(q % 2) + 1}</div>
            <AnimatedNumber className="statv mono" value={moic}
              format={(v) => <>{v.toFixed(2)}× <span style={{ fontSize: 11, opacity: .6 }}>MOIC</span></>} />
            {q > 0 && (
              <div className="mono" style={{ fontSize: 11, opacity: .6, marginTop: 2 }}>
                bei Verkauf jetzt: {(pracIrr(moic, q) * 100).toFixed(0).replace("-", "−")} % IRR ·
                {" "}Wertung {pracScore(moic, q).toFixed(2)}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="theme" onClick={() => { haptic(6); setDark(!dark); }} aria-label="Darstellung wechseln">
              {dark ? "☀" : "☾"}
            </button>
          </div>
        </div>
        <div className="barrow" style={{ marginTop: 4, fontSize: 11, opacity: .6 }}>
          <span className="mono">NAV {eur(navValueOf(c, market))}
            {shadow && q > 0 ? ` · unangetastet ${((navValueOf(shadow, market) + (shadow.cashOut || 0)) / shadow.costTotal).toFixed(2)}×` : ""}</span>
          <span className="mono">{freeSlots}/{PRAC_SLOTS} Kapazität · HJ {q}/{PRAC_PERIODS}</span>
        </div>
        <div className="prog"><i style={{ width: `${(q / PRAC_PERIODS) * 100}%` }} /></div>
      </div>

      <div className="wrap">
        {G && <Coach {...G}>{G.body}</Coach>}
        <News feed={feed} quarter={q} practice />

        {over && (
          <div className="tomb">
            <div className="sub">Übung abgeschlossen</div>
            <div className="amt">{over.moic.toFixed(2)}×</div>
            <div className="sub">
              {over.bridge ? "auf das eingesetzte Eigenkapital" : "Totalverlust nach Covenant Breach"}
            </div>
            <div className="sub" style={{ marginTop: 6 }}>
              nach {hj(over.holdQ)} · {(over.irr * 100).toFixed(0).replace("-", "−")} % IRR · Wertung {over.score.toFixed(2)}
            </div>
            {over.base != null && (
              <div className="sub" style={{ marginTop: 6, color: over.moic >= over.base ? "var(--teal)" : "var(--ox)" }}>
                Unangetastet gehalten: {over.base.toFixed(2)}× · Delta {over.moic >= over.base ? "+" : "−"}
                {Math.abs(Math.round((over.moic - over.base) * 100))} pp
              </div>
            )}
            {over.held && (
              <div className="sub" style={{ marginTop: 6, color: over.score >= over.held.score ? "var(--teal)" : "var(--ox)" }}>
                Bis zum Ende gehalten wären es {over.held.moic.toFixed(2)}× bei {(over.held.irr * 100).toFixed(0)} % gewesen —
                Wertung {over.held.score.toFixed(2)}
              </div>
            )}
          </div>
        )}

        <Holding c={c} market={market} neg={PRAC_ATTRS.negotiation} quarter={q}
          procCount={0} freeSlots={over ? 0 : freeSlots} practice
          act={{
            proc: () => {}, bil: () => {}, cv: () => {}, ipo: () => {},
            search: (seat) => startSearch(seat), init: (dim) => setInitPick({ dim }), ltip: toggleLtip,
            study: c.dd ? null : runStudy,
          }} />

        <div className="card">
          <h3 className="disp">Archiv</h3>
          {feed.filter((f) => f.q < q).length === 0 && <div className="quiet">Noch keine älteren Meldungen.</div>}
          {feed.filter((f) => f.q < q).slice(0, 20).map((f, i) => (
            <div className={"item " + (f.tone || "neu")} key={i}>
              <span className="em">{f.e || "·"}</span>
              <span dangerouslySetInnerHTML={{ __html: `<span class="mono" style="opacity:.5">HJ ${f.q}</span> ${f.t}` }} />
            </div>
          ))}
        </div>

        {!over && !offer && q >= PRAC_EXIT_FROM && !proc && (
          <div className="card">
            <h3 className="disp">Exit vorbereiten</h3>
            <p className="hint" style={{ marginTop: 4 }}>
              Bei sofortigem Verkauf stünden {offerMoic.toFixed(2).replace(".", ",")}× auf dem Papier —
              {" "}{(pracIrr(offerMoic, q) * 100).toFixed(0).replace("-", "−")} % IRR, Wertung {pracScore(offerMoic, q).toFixed(2).replace(".", ",")}.
              Ein strukturierter Prozess braucht {hj(PROC_Q)}, bringt aber Wettbewerb unter die Käufer
              und damit den besseren Preis als ein bilateraler Zuruf.
            </p>
            <button className={"solid" + (G && G.spot === "proc" ? " spot" : "")}
              style={{ width: "100%", marginTop: 10 }} disabled={sl.length > 0} onClick={startProc}>
              📣 Verkaufsprozess eröffnen
            </button>
          </div>
        )}
        {!over && proc && !offer && (
          <div className="card">
            <h3 className="disp">Verkaufsprozess läuft</h3>
            <p className="hint" style={{ marginTop: 4 }}>
              Gebote in {hj(Math.max(0, proc.resolveQ - q))}. Das Unternehmen läuft weiter — jede
              Verbesserung bis zum Signing zahlt auf den Preis ein.
            </p>
          </div>
        )}
        {!over && offer && (
          <div className="card">
            <h3 className="disp">Gebot eingegangen</h3>
            <table className="kv"><tbody>
              <tr><td className="lab">Bruttoerlös</td><td>{eur(offer.gross)}</td></tr>
              <tr><td className="lab">Transaktionskosten</td><td>− {eur(offer.gross * PROC_FEE)}</td></tr>
              {c.ltip && <tr><td className="lab">Managementbeteiligung</td>
                <td>− {eur(offer.gross * (1 - PROC_FEE) * LTIP_SHARE)}</td></tr>}
              <tr><td className="lab">Nettoerlös an den Fonds</td>
                <td style={{ fontWeight: 600 }}>{eur(offer.net)}</td></tr>
              <tr><td className="lab">Ergebnis</td>
                <td style={{ color: offer.moic >= 1 ? "var(--teal)" : "var(--ox)", fontWeight: 600 }}>
                  {offer.moic.toFixed(2).replace(".", ",")}× · {(pracIrr(offer.moic, q) * 100).toFixed(0).replace("-", "−")} % IRR
                  · Wertung {pracScore(offer.moic, q).toFixed(2).replace(".", ",")}</td></tr>
            </tbody></table>
            <button className={"solid" + (G && G.spot === "accept" ? " spot" : "")}
              style={{ width: "100%", marginTop: 10 }} onClick={acceptOffer}>
              🤝 Annehmen · {eur(offer.net)}
            </button>
          </div>
        )}

        <div style={{ margin: "18px 16px 8px" }}>
          {!over ? (
            <button className={"solid cta-big" + (G && G.spot === "close" ? " spot" : "")}
              style={{ width: "100%", padding: 14 }}
              disabled={sl.length > 0} onClick={step}>
              {sl.length > 0 ? "Erst die Shortlist entscheiden" : "Halbjahr abschließen"}
            </button>
          ) : (
            <button className="solid" style={{ width: "100%", padding: 14 }} onClick={reset}>
              Übung wiederholen
            </button>
          )}
        </div>
        <div style={{ margin: "0 16px 40px" }}>
          <button style={{ width: "100%" }} onClick={back}>Zurück zum Briefing</button>
        </div>
      </div>

      {sheet && <Sheet sheet={sheet} close={() => setSheet(null)} onConfirm={() => setSheet(null)} />}
      {initPick && (
        <InitPicker c={c} dim={initPick.dim} market={market}
          start={(id) => { startInit(initPick.dim, id); setInitPick(null); }} close={() => setInitPick(null)} />
      )}
      {!sheet && !initPick && sl.length > 0 && (
        <Shortlist item={sl[0]} holding={c} analysis={PRAC_ATTRS.analysis} hire={hire} reject={reject} />
      )}
    </div>
    </CoachCtx.Provider>
  );
}


/* Der Erklärmodus als Ganzes: Briefing, dann der geführte Durchlauf. Die
   Darstellung (hell/dunkel) gehört hierher, damit sie über beide Schritte
   erhalten bleibt. */
export default function ExplainMode() {
  const [dark, setDark] = useState(true);
  const [started, setStarted] = useState(false);

  if (!started) return <Briefing dark={dark} setDark={setDark} onStart={() => setStarted(true)} />;
  return <GuidedRun dark={dark} setDark={setDark} back={() => setStarted(false)} />;
}
