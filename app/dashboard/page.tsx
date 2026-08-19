import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import LobbyOverview, { type LobbySummary, type MySeasonSummary } from "./LobbyOverview";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  const { data: myRow } = await supabase
    .from("season_players")
    .select("season_id, seasons!inner(id, status, lobby_opened_at)")
    .eq("profile_id", user.id)
    .in("seasons.status", ["lobby", "running"])
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
            <h1>Willkommen, {profile.display_name}</h1>
            <div className="dashsub">{user.email}</div>
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

        <LobbyOverview initialMySeason={mySeason} initialOpenLobbies={openLobbies} />
      </div>
    </main>
  );
}
