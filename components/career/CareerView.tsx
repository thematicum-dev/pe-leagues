import Link from "next/link";
import { achievementsOf, pointsOf, summarize, tierOf, TIERS, type CareerRow } from "@/lib/career/career";
import { fmtDate, fmtInt, fmtIrr, fmtMultiple, fmtPct, fmtScore } from "@/lib/format";

/* Der Track Record eines Spielers: Karrierestufe, Bestwerte, Auszeichnungen
   und jede beendete Partie. Reine Darstellung über lib/career/career.ts —
   wie BestDeals und PlayerRanking lässt sie sich ohne Datenbank ansehen. */

export function TierBadge({ points, compact = false }: { points: number; compact?: boolean }) {
  const t = tierOf(points);
  return (
    <div className={"tierbox" + (compact ? " tierbox-compact" : "")}>
      <div className="tierhead">
        <span className="tiername">{t.tier.name}</span>
        <span className="mono tierpoints">{fmtInt(points)} Punkte</span>
      </div>
      <div className="tierbar" role="progressbar" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(t.progress * 100)} aria-label="Fortschritt zur nächsten Karrierestufe">
        <i style={{ width: `${Math.round(t.progress * 100)}%` }} />
      </div>
      <div className="dashsub">
        {t.next
          ? <>Noch <span className="mono">{fmtInt(t.toNext)}</span> Punkte bis <strong>{t.next.name}</strong></>
          : "Höchste Stufe erreicht."}
      </div>
    </div>
  );
}

export default function CareerView({ rows, error }: { rows: CareerRow[]; error?: string | null }) {
  const s = summarize(rows);
  const badges = achievementsOf(rows);
  const earned = badges.filter((b) => b.done).length;

  return (
    <>
      <div className="dashcard dashcard-accent">
        <h2>Karriere</h2>
        <TierBadge points={s.points} />
        <div className="statgrid">
          <div className="stat"><b className="mono">{s.played}</b><span>Partien</span></div>
          <div className="stat"><b className="mono">{s.wins}</b><span>Siege</span></div>
          <div className="stat"><b className="mono">{fmtScore(s.bestScore)}</b><span>beste Wertung</span></div>
          <div className="stat"><b className="mono">{fmtScore(s.avgScore)}</b><span>⌀ Wertung</span></div>
          <div className="stat"><b className="mono">{fmtMultiple(s.bestTvcc)}</b><span>bester TVCC</span></div>
          <div className="stat"><b className="mono">{fmtIrr(s.bestIrr)}</b><span>beste IRR</span></div>
          <div className="stat"><b className="mono">{fmtPct(s.benchmarkRate)}</b><span>über Benchmark</span></div>
          <div className="stat"><b className="mono">{s.podiums}</b><span>Podien</span></div>
        </div>
        <details className="tierladder">
          <summary>So funktionieren die Karrierepunkte</summary>
          <p className="dashsub">
            Jede beendete Partie bringt ihre Wertung in Hundertsteln (1,00 = Benchmark = 100 Punkte)
            plus einen Zuschlag für die Platzierung: 50 für Platz 1, 25 für Platz 2, 10 für Platz 3.
            Abgebrochene Partien zählen nicht.
          </p>
          <div className="tiersteps">
            {TIERS.map((t) => (
              <span key={t.key} className={s.points >= t.from ? "on" : ""}>
                {t.name} <i className="mono">{fmtInt(t.from)}</i>
              </span>
            ))}
          </div>
        </details>
      </div>

      <div className="dashcard">
        <h2>Auszeichnungen ({earned}/{badges.length})</h2>
        <div className="badgegrid">
          {badges.map((b) => (
            <div key={b.id} className={"badge" + (b.done ? " badge-on" : "")} title={b.desc}>
              <span className="badgeicon" aria-hidden="true">{b.icon}</span>
              <div>
                <div className="badgename">{b.name}</div>
                <div className="dashsub">{b.desc}</div>
                {!b.done && b.need > 1 && (
                  <div className="dashsub mono">{b.have} / {b.need}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashcard">
        <h2>Beendete Partien ({rows.length})</h2>
        {error && <p className="autherror">{error}</p>}
        {rows.length === 0 && !error && (
          <div className="quiet">
            Noch keine beendete Partie. Dein Track Record beginnt mit der ersten Partie, die über alle
            20 Halbjahre geht.
          </div>
        )}
        {rows.map((r) => (
          <div className="seasonrow" key={r.season_id} style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <div style={{ minWidth: 0 }}>
              <div>
                <span className="mono" style={{ marginRight: 8, opacity: 0.7 }}>
                  {["🥇", "🥈", "🥉"][r.place - 1] ?? `${r.place}.`}
                </span>
                {r.fund_name}
              </div>
              <div className="dashsub">
                {fmtDate(r.finished_at)} · Platz {r.place} von {r.funds} · {r.humans}{" "}
                {r.humans === 1 ? "Mensch" : "Menschen"}
              </div>
              <div className="dashsub mono">
                TVCC {fmtMultiple(r.tvcc)} · IRR {fmtIrr(r.irr)} · +{pointsOf(r)} Punkte
              </div>
            </div>
            <div className="mono" style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
              <div>{fmtScore(r.score)}</div>
              <div className="dashsub">Wertung</div>
              <Link href={`/season/${r.season_id}`} className="rowlink">Endstand</Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
