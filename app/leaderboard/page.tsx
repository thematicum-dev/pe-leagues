import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface LeaderboardRow {
  profile_id: string;
  display_name: string;
  seasons_played: number;
  seasons_won: number;
  max_score: number | null;
  avg_score: number | null;
  max_tvpi: number | null;
  avg_tvpi: number | null;
  max_irr: number | null;
  avg_irr: number | null;
}

function fmtScore(v: number | null): string {
  return v == null ? "—" : v.toFixed(2);
}
function fmtTvpi(v: number | null): string {
  return v == null ? "—" : v.toFixed(2) + "×";
}
function fmtIrr(v: number | null): string {
  return v == null ? "—" : (v * 100).toFixed(1).replace(".", ",") + " %";
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/leaderboard");

  const { data, error } = await supabase.rpc("global_leaderboard");
  const rows = (data ?? []) as LeaderboardRow[];

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>Rangliste</h1>
            <div className="dashsub">Über alle abgeschlossenen Partien</div>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Zum Dashboard
          </Link>
        </div>

        <div className="dashcard">
          <h2>Alle Spieler ({rows.length})</h2>
          {error && <p className="autherror">{error.message}</p>}
          {rows.length === 0 && !error && (
            <div className="quiet">Noch keine abgeschlossene Partie — die Rangliste füllt sich, sobald die erste Partie beendet ist.</div>
          )}
          {rows.map((r, i) => (
            <div className="seasonrow" key={r.profile_id} style={{ alignItems: "flex-start" }}>
              <div>
                <div>
                  <span className="mono" style={{ marginRight: 8, opacity: 0.6 }}>
                    {["🥇", "🥈", "🥉"][i] ?? i + 1}
                  </span>
                  {r.display_name}
                </div>
                <div className="dashsub mono">
                  {r.seasons_played} Partien · {r.seasons_won} gewonnen
                  <br />
                  Score max {fmtScore(r.max_score)} / ⌀ {fmtScore(r.avg_score)}
                  {" · TVPI max "}{fmtTvpi(r.max_tvpi)}{" / ⌀ "}{fmtTvpi(r.avg_tvpi)}
                  {" · IRR max "}{fmtIrr(r.max_irr)}{" / ⌀ "}{fmtIrr(r.avg_irr)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
