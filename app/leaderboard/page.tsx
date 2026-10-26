import Link from "next/link";
import { requireAccess } from "@/lib/access/context";
import BestDeals, { type BestDealRow } from "./BestDeals";
import PlayerRanking, { type LeaderboardRow } from "./PlayerRanking";

export default async function LeaderboardPage() {
  const { supabase, universes, activeUniverse } = await requireAccess("/leaderboard");

  // Wie im Dashboard: Das Universum wird erst benannt, wenn der Spieler in
  // mehreren unterwegs ist.
  const showUniverse = universes.length > 1;

  // Jedes Universum hat seine eigene Rangliste -- Ergebnisse aus einem
  // anderen Universum tauchen hier nicht auf.
  const { data, error } = await supabase.rpc("global_leaderboard", {
    p_universe_id: activeUniverse.id,
  });
  const rows = (data ?? []) as LeaderboardRow[];

  const { data: dealData, error: dealError } = await supabase.rpc("best_deals", {
    p_universe_id: activeUniverse.id,
  });
  const deals = (dealData ?? []) as BestDealRow[];

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>Rangliste</h1>
            <div className="dashsub">
              {showUniverse
                ? `${activeUniverse.name} · über alle abgeschlossenen Partien dieses Universums`
                : "Über alle abgeschlossenen Partien"}
            </div>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Zum Dashboard
          </Link>
        </div>

        <PlayerRanking
          rows={rows}
          error={error?.message ?? null}
          emptyText={
            showUniverse
              ? `Noch keine abgeschlossene Partie in ${activeUniverse.name} — die Rangliste füllt sich, sobald die erste Partie beendet ist.`
              : "Noch keine abgeschlossene Partie — die Rangliste füllt sich, sobald die erste Partie beendet ist."
          }
        />

        <BestDeals deals={deals} error={dealError?.message ?? null} />
      </div>
    </main>
  );
}
