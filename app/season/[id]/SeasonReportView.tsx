import Link from "next/link";
import { SeasonDrivers } from "@/components/pel/ui";
import type { SeasonReport } from "./seasonReport";

const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;
const mult = (v: number) => `${v.toFixed(2).replace(".", ",")}×`;
const mio = (v: number) => `${Math.round(v).toLocaleString("de-DE")} Mio. €`;

/**
 * Abschlussauswertung einer Partie: die eigene Rendite (Wertung, TVCC, IRR,
 * TVPI, DPI), der Endstand der Kohorte und die Value Bridge, woher die
 * Rendite kam. Dieselbe Ansicht für beendete Partien und — ohne Wertung —
 * für abgebrochene, damit beide über das Profil wieder aufrufbar sind.
 */
export default function SeasonReportView({ report, backHref = "/profile" }: { report: SeasonReport; backHref?: string }) {
  const { kind, me, myRank, ranking, halfYear } = report;
  const aborted = kind === "aborted";
  return (
    <div className="pel dark">
      <style dangerouslySetInnerHTML={{ __html: FINISHED_CSS }} />
      <div className="wrap" style={{ maxWidth: 520, margin: "0 auto" }}>
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
            <div className="kpis">
              {me.tvcc != null && <Kpi label="TVCC" value={mult(me.tvcc)} good={me.tvcc >= 1} />}
              <Kpi label="Netto-IRR" value={pct(me.irr)} good={me.irr >= 0} />
              <Kpi label="TVPI" value={mult(me.tvpi)} good={me.tvpi >= 1} />
              {me.dpi != null && <Kpi label="DPI" value={mult(me.dpi)} good={me.dpi >= 1} />}
              {me.gross != null && <Kpi label="Brutto-MOIC" value={mult(me.gross)} good={me.gross >= 1} />}
              <Kpi label="Wertung" value={me.score.toFixed(2).replace(".", ",")} good={me.score >= 1} />
            </div>
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
            <div className={"lb" + (r.slot === report.myFund?.slot ? " me" : "")} key={r.slot}>
              <span className="rk">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
              <span className="nm">
                {r.name}
                <small>
                  {/* Geschützte Leerzeichen: umbrochen wird zwischen den Kennzahlen, nicht in ihnen */}
                  {[r.tvcc != null ? `TVCC\u00a0${mult(r.tvcc)}` : null, `IRR\u00a0${pct(r.irr).replace(" ", "\u00a0")}`, `TVPI\u00a0${mult(r.tvpi)}`]
                    .filter(Boolean).join(" · ")}
                </small>
              </span>
              <span className="mo" style={{ color: r.score >= 1 ? "var(--teal)" : "var(--ox)" }}>
                {r.score.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <SeasonDrivers fund={report.myFund} market={report.market} quarter={halfYear}
          prev={report.prev} title="Woher deine Rendite kam" />

        <div style={{ margin: "18px 16px 40px", display: "grid", gap: 10 }}>
          <Link href={backHref} className="btn-primary" style={{ display: "block", textAlign: "center" }}>
            {backHref === "/profile" ? "Zu deinen Partien" : "Zurück"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="kpi">
      <div className="eyebrow">{label}</div>
      <div className="mono kv" style={{ color: good ? "var(--teal)" : "var(--ox)" }}>{value}</div>
    </div>
  );
}

// Minimaler Ausschnitt aus dem .pel-Stylesheet, nur für die statischen Klassen
// (tomb/card/lb), die die Abschlussauswertung braucht — der volle Satz lebt
// in components/pel/ui.tsx und wird dort geladen, sobald die Partie läuft.
const FINISHED_CSS = `
.pel{--paper:#0C1214;--card:#161F22;--ink:#EDF1EE;--ink2:#8E9C9B;--rule:#243033;--ox:#E3897F;--teal:#5FC4B1;--gold:#DCB264;--panel:#080D0F;--onpanel:#EDF1EE;--glow:rgba(0,0,0,.4);font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:var(--paper);min-height:100%;}
.pel *{box-sizing:border-box;}
.pel .disp{font-weight:600;letter-spacing:-.025em;}
.pel .card{background:var(--card);border:1px solid var(--rule);margin:14px 16px;border-radius:10px;}
.pel .card h3{margin:0;padding:18px 16px 10px;font-size:17px;}
.pel .pad{padding:0 16px 16px;}
.pel .hint{font-size:13px;line-height:1.55;color:var(--ink2);}
.pel .tomb{background:var(--panel);color:var(--onpanel);padding:20px 16px;text-align:center;border:1px solid var(--panel);position:relative;}
.pel .tomb .amt{font-size:40px;font-weight:600;letter-spacing:-.035em;margin:8px 0 5px;}
.pel .tomb .sub{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);}
.pel .lb{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--rule);}
.pel .lb .rk{font-size:16px;width:20px;}
.pel .lb .nm{flex:1;font-size:13px;}
.pel .lb .mo{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;}
.pel .lb .nm small{display:block;font-size:11px;color:var(--ink2);margin-top:3px;
  font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;}
.pel .lb.me{background:color-mix(in srgb,var(--gold) 9%,transparent);}
.pel .lb:last-child{border-bottom:0;}
.pel .kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 10px;padding:4px 16px 4px;}
.pel .kpi .kv{font-size:17px;font-weight:500;margin-top:4px;}
.pel .btn-primary{display:inline-block;text-decoration:none;}
.pel .mono{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;}
.pel .eyebrow{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);font-weight:600;}
/* Vergleichstabelle und Erklär-Punkte für die Value Bridge auf dem Endstand —
   Ausschnitt aus dem vollen Stylesheet in components/pel/ui.tsx. Ändert sich
   dort table.cmp, muss dieser Ausschnitt mitgezogen werden. */
.pel table.cmp{width:100%;border-collapse:collapse;}
.pel table.cmp th,.pel table.cmp td{font-size:12.5px;padding:8px 10px;text-align:right;
  border-bottom:1px solid var(--rule);white-space:nowrap;
  font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;}
/* Aussen bündig zur Karte, innen enger — sonst passen drei Spalten auf einem
   schmalen Gerät nicht nebeneinander. */
.pel table.cmp th:first-child,.pel table.cmp td:first-child{padding-left:16px;}
.pel table.cmp th:last-child,.pel table.cmp td:last-child{padding-right:16px;}
.pel table.cmp th{font-family:'Inter',system-ui,sans-serif;font-size:9.5px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--ink2);font-weight:600;padding-top:0;padding-bottom:6px;}
.pel table.cmp th:first-child,.pel table.cmp td:first-child{text-align:left;color:var(--ink2);
  font-family:'Inter',system-ui,sans-serif;white-space:normal;}
.pel table.cmp tr:last-child td{border-bottom:0;}
.pel table.cmp th small{display:block;font-weight:500;font-size:8.5px;letter-spacing:.08em;
  text-transform:none;color:var(--ink2);opacity:.7;margin-top:2px;}
.pel table.cmp tr.seg td{font-family:'Inter',system-ui,sans-serif;font-size:9.5px;
  letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);font-weight:600;
  padding-top:17px;padding-bottom:5px;border-bottom:0;}
.pel table.cmp tr.sum td,.pel table.cmp tr.sum td:first-child{font-weight:600;color:var(--ink);
  border-top:1px solid var(--rule);}
/* Aufklappbare Gruppe: Die Kopfzeile trägt die Summe, damit die Aufstellung
   auch zugeklappt vollständig ist; die Einzelposten begründen sie. */
.pel table.cmp tr.grp td{padding-top:13px;padding-bottom:11px;}
.pel table.cmp tr.grp td:first-child{padding:0;}
.pel table.cmp tr.grp button{display:flex;align-items:center;gap:6px;width:100%;
  padding:13px 10px 11px 16px;background:none;border:0;cursor:pointer;text-align:left;
  font-family:'Inter',system-ui,sans-serif;font-size:9.5px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--ink2);font-weight:600;}
.pel table.cmp tr.grp .grpcar{display:inline-block;font-size:13px;line-height:1;
  transition:transform .15s;transform:rotate(0deg);opacity:.7;}
.pel table.cmp tr.grp.on .grpcar{transform:rotate(90deg);}
.pel table.cmp tr.det td{font-size:12px;}
.pel table.cmp tr.det td:first-child{padding-left:28px;}
.pel .finnote{font-size:11px;line-height:1.6;color:var(--ink2);margin:0;padding:12px 16px 0;}
.pel .infb{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;
  border-radius:50%;border:1px solid var(--rule);background:transparent;color:var(--ink2);
  font-size:9.5px;font-weight:700;font-family:inherit;line-height:1;padding:0;margin-left:5px;
  vertical-align:middle;cursor:pointer;flex:none;}
.pel .infb.on{background:var(--gold);border-color:var(--gold);color:var(--panel);}
.pel .modal{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:40;display:flex;
  align-items:flex-end;justify-content:center;}
.pel .sheet{background:var(--paper);width:100%;max-width:520px;max-height:92vh;overflow:auto;
  border-radius:16px 16px 0 0;}
.pel .infgrip{width:34px;height:4px;border-radius:2px;background:var(--rule);margin:10px auto 4px;}
.pel .infsheet{padding:20px 18px 26px;}
.pel .infsheet .it{font-size:15px;font-weight:600;letter-spacing:-.015em;margin:0 0 10px;}
.pel .infsheet .ib{font-size:13.5px;line-height:1.65;color:var(--ink2);}
.pel .infsheet .ib b{color:var(--ink);font-weight:600;}
.pel .infsheet .ic{width:100%;margin-top:18px;font-family:inherit;font-size:13px;cursor:pointer;
  padding:11px 18px;border:1px solid var(--rule);background:var(--card);color:var(--ink);border-radius:8px;}
`;
