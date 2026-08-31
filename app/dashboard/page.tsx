import { signOut } from "@/app/auth/actions";
import { requireAccess } from "@/lib/access/context";
import LobbyOverview, { type LobbySummary, type MySeasonSummary } from "./LobbyOverview";
import UniverseSwitcher from "./UniverseSwitcher";

export default async function DashboardPage() {
  // Schranke für den gesamten Spielbereich: angemeldet, Profil vorhanden,
  // vom Admin freigegeben, mindestens ein Universum zugeteilt.
  const { supabase, user, profile, universes, activeUniverse } = await requireAccess("/dashboard");

  const { data: isAdmin } = await supabase.rpc("is_admin");

  // Alles ab hier ist auf das aktive Universum beschränkt -- in der Abfrage
  // wie auch in der Datenbank (siehe seasons_select in
  // supabase/migrations/20260830100200_universe_seasons.sql).
  const { data: myRow } = await supabase
    .from("season_players")
    .select("season_id, seasons!inner(id, status, lobby_opened_at, universe_id)")
    .eq("profile_id", user.id)
    .in("seasons.status", ["lobby", "running"])
    .eq("seasons.universe_id", activeUniverse.id)
    .maybeSingle();

  const myActiveSeason = myRow
    ? (Array.isArray(myRow.seasons) ? myRow.seasons[0] : myRow.seasons)
    : null;

  let mySeason: MySeasonSummary | null = null;
  let openLobbies: LobbySummary[] = [];

  if (myActiveSeason) {
    const { count } = await supabase
      .from("season_players")
      .select("id", { count: "exact", head: true })
      .eq("season_id", myActiveSeason.id);

    mySeason = {
      id: myActiveSeason.id,
      status: myActiveSeason.status as "lobby" | "running",
      lobbyOpenedAt: myActiveSeason.lobby_opened_at,
      occupancy: count ?? 0,
    };
  } else {
    const { data: lobbies } = await supabase
      .from("seasons")
      .select("id, lobby_opened_at")
      .eq("status", "lobby")
      .eq("universe_id", activeUniverse.id)
      .order("lobby_opened_at", { ascending: true });

    const lobbyIds = (lobbies ?? []).map((l) => l.id);
    const occupancy = new Map<string, number>();

    if (lobbyIds.length > 0) {
      const { data: playerRows } = await supabase
        .from("season_players")
        .select("season_id")
        .in("season_id", lobbyIds);
      for (const row of playerRows ?? []) {
        occupancy.set(row.season_id, (occupancy.get(row.season_id) ?? 0) + 1);
      }
    }

    openLobbies = (lobbies ?? []).map((l) => ({
      id: l.id,
      lobbyOpenedAt: l.lobby_opened_at,
      occupancy: occupancy.get(l.id) ?? 0,
    }));
  }

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>Willkommen, {profile.displayName}</h1>
            <div className="dashsub">{user.email}</div>
            <div className="dashsub">
              Universum: <strong>{activeUniverse.name}</strong>
              {activeUniverse.description ? ` — ${activeUniverse.description}` : ""}
            </div>
          </div>
          <div className="landingactions">
            <a href="/leaderboard" className="btn-secondary">
              Rangliste
            </a>
            <a href="/practice" className="btn-secondary">
              Übungsmodus
            </a>
            {isAdmin && (
              <a href="/admin" className="btn-secondary">
                Admin
              </a>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="btn-secondary"
                style={{ border: "1px solid var(--rule)" }}
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>

        <UniverseSwitcher universes={universes} activeUniverseId={activeUniverse.id} />

        <LobbyOverview
          initialMySeason={mySeason}
          initialOpenLobbies={openLobbies}
          universeId={activeUniverse.id}
          universeName={activeUniverse.name}
          universeActive={activeUniverse.isActive}
        />
      </div>
    </main>
  );
}
