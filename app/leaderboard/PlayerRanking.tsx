import { IRR_BENCH, TVCC_BENCH } from "@/lib/engine/engine";

/* Die erste Tabelle der Rangliste: alle Spieler, gerankt nach der Wertung des
   Spiels (scoreOf in lib/engine/engine.ts), also je zur Hälfte TVCC und IRR.
   Diese beiden stehen deshalb vorn, der TVPI nur noch klein zur Information.
   tvcc ist null für Spieler, deren Partien alle vor dem 18.10.2026 endeten --
   damals stand er noch nicht im Endstand (Migration 20261024090000). Eigene
   Komponente wie BestDeals, damit sie sich ohne Datenbank ansehen lässt. */
export interface LeaderboardRow {
  profile_id: string;
  display_name: string;
  seasons_played: number;
  seasons_won: number;
  max_score: number | null;
  avg_score: number | null;
  max_tvcc: number | null;
  avg_tvcc: number | null;
  max_irr: number | null;
  avg_irr: number | null;
  max_tvpi: number | null;
  avg_tvpi: number | null;
}

const de = (v: number, digits: number) => Number(v).toFixed(digits).replace(".", ",");

function fmtScore(v: number | null): string {
  return v == null ? "—" : de(v, 2);
}
function fmtMultiple(v: number | null): string {
  return v == null ? "—" : de(v, 2) + "×";
}
function fmtIrr(v: number | null): string {
  return v == null ? "—" : de(v * 100, 1) + " %";
}

export default function PlayerRanking({
  rows, error, emptyText,
}: { rows: LeaderboardRow[]; error: string | null; emptyText: string }) {
  return (
    <div className="dashcard">
      <h2>Alle Spieler ({rows.length})</h2>
      <div className="dashsub" style={{ marginBottom: 8 }}>
        Gerankt nach der durchschnittlichen Wertung je Partie: zur Hälfte TVCC, zur Hälfte IRR, gegen
        {" "}{de(TVCC_BENCH, 1)}× und {de(IRR_BENCH * 100, 0)} % normiert — 1,00 ist Benchmark-Niveau. Der TVPI
        zählt nicht für die Wertung und steht nur zur Information dabei.
      </div>
      {error && <p className="autherror">{error}</p>}
      {rows.length === 0 && !error && <div className="quiet">{emptyText}</div>}
      {rows.map((r, i) => (
        /* Wertung rechts wie bei den Einzeldeals; links darunter die beiden
           Kennzahlen, aus denen sie besteht, und leiser der TVPI. */
        <div className="seasonrow" key={r.profile_id} style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}>
            <div>
              <span className="mono" style={{ marginRight: 8, opacity: 0.6 }}>
                {["🥇", "🥈", "🥉"][i] ?? i + 1}
              </span>
              {r.display_name}
            </div>
            <div className="dashsub">
              {r.seasons_played} Partien · {r.seasons_won} gewonnen
            </div>
            <div className="dashsub mono">
              TVCC ⌀ {fmtMultiple(r.avg_tvcc)} / max {fmtMultiple(r.max_tvcc)}
              <br />
              IRR ⌀ {fmtIrr(r.avg_irr)} / max {fmtIrr(r.max_irr)}
            </div>
            <div className="dashsub mono" style={{ fontSize: 11, opacity: 0.6 }}>
              TVPI ⌀ {fmtMultiple(r.avg_tvpi)} / max {fmtMultiple(r.max_tvpi)} (info)
            </div>
          </div>
          <div className="mono" style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
            <div>{fmtScore(r.avg_score)}</div>
            <div className="dashsub">⌀ Wertung</div>
            <div className="dashsub">max {fmtScore(r.max_score)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
