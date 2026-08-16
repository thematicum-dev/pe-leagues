import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { createSeason, joinSeason } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  lobby: "Lobby offen",
  running: "Läuft",
  finished: "Beendet",
};

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

  const { data: myMemberships } = await supabase
    .from("season_players")
    .select("season_id, seasons(id, status, current_half_year, lobby_opened_at)")
    .eq("profile_id", user.id);

  const myMembershipSeasonIds = new Set((myMemberships ?? []).map((m) => m.season_id));

  const { data: openLobbies } = await supabase
    .from("seasons")
    .select("id, status, lobby_opened_at")
    .eq("status", "lobby")
    .order("lobby_opened_at", { ascending: false });

  const joinableLobbies = (openLobbies ?? []).filter((s) => !myMembershipSeasonIds.has(s.id));

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>Willkommen, {profile.display_name}</h1>
            <div className="dashsub">{user.email}</div>
          </div>
          <div className="landingactions">
            <Link href="/practice" className="btn-secondary">
              Übungsmodus
            </Link>
            <form action={signOut}>
              <button type="submit" className="btn-secondary" style={{ border: "1px solid var(--rule)" }}>
                Abmelden
              </button>
            </form>
          </div>
        </div>

        <div className="dashcard">
          <h2>Deine Partien</h2>
          {(myMemberships ?? []).length === 0 && (
            <p className="dashsub">Du bist noch in keiner Mehrspieler-Partie.</p>
          )}
          {(myMemberships ?? []).map((m) => {
            const season = Array.isArray(m.seasons) ? m.seasons[0] : m.seasons;
            if (!season) return null;
            return (
              <div className="seasonrow" key={season.id}>
                <span>Partie {season.id.slice(0, 8)}</span>
                <span className="seasonstatus">{STATUS_LABEL[season.status] ?? season.status}</span>
              </div>
            );
          })}
          <form action={createSeason} style={{ marginTop: 14 }}>
            <button type="submit" className="btn-primary">
              Neue Partie eröffnen
            </button>
          </form>
        </div>

        <div className="dashcard">
          <h2>Offene Lobbys zum Beitreten</h2>
          {joinableLobbies.length === 0 && (
            <p className="dashsub">Aktuell keine offenen Lobbys außer deinen eigenen.</p>
          )}
          {joinableLobbies.map((season) => (
            <div className="seasonrow" key={season.id}>
              <span>Partie {season.id.slice(0, 8)}</span>
              <form action={joinSeason.bind(null, season.id)}>
                <button type="submit" className="btn-secondary">
                  Beitreten
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
