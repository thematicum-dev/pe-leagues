"use client";

import { useState } from "react";
import { haptic } from "@/components/pel/haptics";
import Link from "next/link";
import {
  CSS, SeasonDrivers, ScoreChart, DeploymentChart, CashflowChart, cashflowScale, KpiTiles,
  Sheet, exitSheetOf, Info,
} from "@/components/pel/ui";
import { SECCOLOR, fairOf, x } from "@/lib/engine";
import type { SeasonReport } from "./seasonReport";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;
const mult = (v: number) => `${v.toFixed(2).replace(".", ",")}×`;
const mio = (v: number) => `${Math.round(v).toLocaleString("de-DE")} Mio. €`;
const tone = (good: boolean) => (good ? "teal" : "ox");

/**
 * Abschlussauswertung einer Partie, für beendete und — ohne Wertung — für
 * abgebrochene Partien. Über das Profil jederzeit wieder aufrufbar.
 *
 * Von oben nach unten: das Ergebnis (Wertung, Platz, Rendite), der Weg
 * dorthin (Wertungsverlauf, Deployment Rate, Value Bridge) und die Deals, aus
 * denen es entstanden ist (eigener Track Record mit Exit-Bridges, Peer Group
 * mit Cashflows und Beteiligungen je Fonds). Grafiken und Zeilen sind
 * dieselben Komponenten wie im Peer-Group-Tab der laufenden Partie.
 */
export default function SeasonReportView({ report, backHref = "/profile" }: { report: SeasonReport; backHref?: string }) {
  const { kind, me, myRank, ranking, halfYear, myFund, market, peers } = report;
  const aborted = kind === "aborted";
  const [openFund, setOpenFund] = useState<number | null>(null);
  const [sheet, setSheet] = useState<Any>(null);
  const cfScale = cashflowScale(peers.map((p) => p.fund));
  const realized: Any[] = (myFund as Any)?.realized ?? [];

  return (
    <div className="pel dark">
      <style>{CSS + REPORT_CSS}</style>
      <div className="wrap" style={{ paddingBottom: 0 }}>
        <div className="tomb" style={{ margin: "24px 16px" }}>
          <div className="sub">{aborted ? `Abgebrochen nach Halbjahr ${halfYear}` : "Fondslaufzeit beendet"}</div>
          {me ? (
            <>
              <div className="amt">{me.score.toFixed(2)}</div>
              <div className="sub">
                {aborted ? "Zwischenwertung · ungewertet" : "Deine Wertung"}
                {myRank != null ? ` · Platz ${myRank} von ${ranking.length}` : ""}
              </div>
            </>
          ) : (
            <>
              <div className="amt">{ranking[0]?.score.toFixed(2) ?? "—"}</div>
              <div className="sub">Höchste Wertung der Kohorte</div>
            </>
          )}
        </div>

        {me && (
          <div className="card">
            <h3 className="disp">Deine Rendite</h3>
            <KpiTiles items={[
              ...(me.tvcc != null ? [{ l: "TVCC", v: mult(me.tvcc), tone: tone(me.tvcc >= 1) }] : []),
              { l: "Netto-IRR", v: pct(me.irr), tone: tone(me.irr >= 0) },
              { l: "TVPI", v: mult(me.tvpi), tone: tone(me.tvpi >= 1) },
              ...(me.dpi != null ? [{ l: "DPI", v: mult(me.dpi), tone: tone(me.dpi >= 1) }] : []),
              ...(me.gross != null ? [{ l: "Brutto-MOIC", v: mult(me.gross), tone: tone(me.gross >= 1) }] : []),
              { l: "Wertung", v: me.score.toFixed(2).replace(".", ","), tone: tone(me.score >= 1) },
            ]} />
            <p className="finnote" style={{ paddingBottom: 16 }}>
              {mio(me.drawn)} abgerufen · {mio(me.distributed)} ausgeschüttet.
              {aborted
                ? " Bewertet zum Stand des letzten ausgewerteten Halbjahres: Nicht verkaufte Beteiligungen stehen zum Marktwert in den Zahlen, eine Tail-End-Verwertung hat nicht stattgefunden."
                : ""}
            </p>
          </div>
        )}

        <div className="card">
          <h3 className="disp">{aborted ? "Stand beim Abbruch" : "Endstand"}</h3>
          {ranking.map((r, i) => (
            <div className={"lb" + (r.slot === myFund?.slot ? " me" : "")} key={r.slot}>
              <span className="rk">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
              <span className="nm">
                {r.name}
                <small>
                  {/* Geschützte Leerzeichen: umbrochen wird zwischen den Kennzahlen, nicht in ihnen */}
                  {[r.tvcc != null ? `TVCC ${mult(r.tvcc)}` : null, `IRR ${pct(r.irr).replace(" ", " ")}`, `TVPI ${mult(r.tvpi)}`]
                    .filter(Boolean).join(" · ")}
                </small>
              </span>
              <span className="mo" style={{ color: r.score >= 1 ? "var(--teal)" : "var(--ox)" }}>
                {r.score.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {report.meIdx >= 0 && (
          <div className="card">
            <h3 className="disp">
              Wertung über die Halbjahre
              <Info k="score" />
            </h3>
            <ScoreChart hist={report.scoreHist} meIdx={report.meIdx} />
          </div>
        )}

        <div className="card">
          <h3 className="disp">Deployment Rate</h3>
          <DeploymentChart funds={peers.map((p) => p.fund)} meKey={myFund?.slot ?? null} quarter={halfYear} />
        </div>

        <SeasonDrivers fund={myFund} market={market} quarter={halfYear}
          prev={report.prev} title="Woher deine Rendite kam" />

        {myFund && (realized.length > 0 || ((myFund as Any).holdings ?? []).length > 0) && (
          <div className="card">
            <h3 className="disp">Deine Deals</h3>
            <p className="hint pad" style={{ paddingBottom: 8, marginTop: -4 }}>
              Eingesetztes Eigenkapital → Rückfluss in Mio. € und Multiple. Antippen öffnet die Value
              Bridge des Exits.
            </p>
            <DealList fund={myFund} market={market}
              onOpen={(r) => setSheet(exitSheetOf(r, report.exitHoldings, report.buyers[r.name] ?? null))} />
          </div>
        )}

        <div className="card">
          <h3 className="disp">Peer Group</h3>
          <p className="hint pad" style={{ paddingBottom: 8, marginTop: -4 }}>
            Antippen zeigt Abrufe und Ausschüttungen sowie die Deals des Fonds.
          </p>
          {peers.map((p, i) => {
            const f = p.fund as Any;
            const mine = f.slot === myFund?.slot;
            const open = openFund === f.slot;
            const toggle = () => setOpenFund(open ? null : f.slot);
            return (
              <div key={f.slot}>
                <div className={"lb" + (mine ? " me" : "")} onClick={toggle} style={{ cursor: "pointer" }}
                  role="button" tabIndex={0} aria-expanded={open} onKeyDown={(e) => e.key === "Enter" && toggle()}>
                  <span className="rk">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                  <span className="nm">{f.name}</span>
                  <span className="mo" style={{ color: p.score >= 1 ? "var(--teal)" : "var(--ox)" }}>{p.score.toFixed(2)}</span>
                  <span style={{ color: "var(--ink2)", fontSize: 11 }}>{open ? "▴" : "▾"}</span>
                </div>
                {open && (
                  <div style={{ background: "var(--zebra)", borderBottom: "1px solid var(--rule)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", columnGap: 12, rowGap: 2, padding: "8px 14px 2px" }}>
                      <span className="eyebrow" style={{ whiteSpace: "nowrap" }}>{mine ? "Dein Fonds" : f.name}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>
                        TVCC {mult(p.tvcc)} · IRR {pct(p.irr)} · TVPI {mult(p.tvpi)} · DPI {mult(p.dpi)}
                      </span>
                    </div>
                    <CashflowChart fund={f} scale={cfScale} />
                    <DealList fund={f} market={market} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ margin: "18px 16px 40px" }}>
          <Link href={backHref} className="btn-primary" style={{ display: "block", textAlign: "center" }}>
            {backHref === "/profile" ? "Zu deinen Partien" : "Zurück"}
          </Link>
        </div>
      </div>
      {sheet && <Sheet sheet={sheet} close={() => setSheet(null)} onConfirm={() => setSheet(null)} />}
    </div>
  );
}

/* Aufschlüsselung der Deals eines Fonds: realisierte Beteiligungen mit
   eingesetztem Eigenkapital, Rückfluss (inkl. Ausschüttungen während der
   Haltedauer, wie in der Value Bridge des Exits) und Multiple, bei einer abgebrochenen Partie dazu, was noch im Portfolio stand
   (Einstiegsmultiple, Haltedauer, Multiple zum letzten Marktwert). */
function DealList({ fund, market, onOpen }: { fund: Any; market: Any; onOpen?: (r: Any) => void }) {
  const realized: Any[] = fund.realized ?? [];
  const holdings: Any[] = fund.holdings ?? [];
  if (!realized.length && !holdings.length) {
    return <div className="quiet" style={{ paddingTop: 4 }}>Keine Beteiligungen.</div>;
  }
  return (
    <div className="deals">
      {realized.length > 0 && <div className="eyebrow dealh">Realisiert · {realized.length}</div>}
      {realized.map((r, i) => {
        const body = (
          <>
            <span className="dn">{r.name}</span>
            {r.bridge && (
              <span className="mono" style={{ color: "var(--ink2)" }}>
                {Math.round(r.bridge.entry)} → {Math.round(r.bridge.exit)}
              </span>
            )}
            <span className="mono" style={{ color: r.moic >= 1 ? "var(--teal)" : "var(--ox)", minWidth: 42, textAlign: "right" }}>
              {r.moic.toFixed(2)}×
            </span>
          </>
        );
        // Mit Value Bridge (Exits seit dem 01.09.2026) lässt sich der Deal öffnen
        return onOpen && r.bridge ? (
          <button type="button" className="dealrow dealbtn" key={"r" + i} aria-label={`${r.name}: Value Bridge öffnen`}
            onClick={() => { haptic(6); onOpen(r); }}>
            {body}<span className="dealgo" aria-hidden="true">›</span>
          </button>
        ) : <div className="dealrow" key={"r" + i}>{body}</div>;
      })}
      {realized.some((r) => r.bridge) && (
        <div className="dealrow dealsum">
          <span className="dn">Summe realisiert</span>
          <span className="mono">
            {Math.round(realized.reduce((a, r) => a + (r.bridge?.entry ?? 0), 0))} → {Math.round(realized.reduce((a, r) => a + (r.bridge?.exit ?? 0), 0))}
          </span>
        </div>
      )}
      {holdings.length > 0 && <div className="eyebrow dealh">Im Portfolio · {holdings.length}</div>}
      {holdings.map((c) => {
        const val = fairOf(c, market, fund.attrs?.negotiation);
        const mo = c.entryEquity > 0 ? val / c.entryEquity : 0;
        return (
          <div className="dealrow" key={c.uid}>
            <i className="sdot" style={{ background: SECCOLOR[c.sector] }} />
            <span className="dn">{c.name}</span>
            <span className="mono" style={{ color: "var(--ink2)" }}>Kauf {x(c.entryMult)}</span>
            <span className="mono" style={{ color: "var(--ink2)" }}>{c.holdQ} HJ</span>
            <span className="mono" style={{ color: mo >= 1 ? "var(--teal)" : "var(--ox)", minWidth: 42, textAlign: "right" }}>
              {mo.toFixed(2)}×
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Ergänzungen zum Spiel-Stylesheet, nur für die Auswertung. */
const REPORT_CSS = `
.pel .lb .nm small{display:block;white-space:normal;font-size:11px;color:var(--ink2);margin-top:3px;
  font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;}
.pel .deals{padding:2px 0 10px;}
.pel .deals .dealh{padding:10px 14px 2px;}
.pel .deals .dealrow{padding:6px 14px;font-size:12.5px;display:flex;gap:8px;align-items:baseline;}
.pel .deals .dealsum{color:var(--ink2);border-top:1px solid var(--rule);margin:2px 14px 0;padding:8px 0 6px;}
.pel .deals .dealbtn{width:100%;background:none;border:0;color:inherit;font-family:inherit;font-size:12.5px;font-weight:400;text-align:left;cursor:pointer;}
.pel .deals .dealbtn:hover{background:var(--shade);}
.pel .deals .dealgo{color:var(--ink2);margin-left:-2px;}
.pel .deals .dn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
`;
