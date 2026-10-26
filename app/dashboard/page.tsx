import { signOut } from "@/app/auth/actions";
import Link from "next/link";
import { headers } from "next/headers";
import { requireAccess } from "@/lib/access/context";
import LobbyOverview, { type LobbySummary, type MySeasonSummary, type SeasonLimits } from "./LobbyOverview";
import UniverseSwitcher from "./UniverseSwitcher";
import InviteFriends from "./InviteFriends";

export default async function DashboardPage() {
  // Schranke für den gesamten Spielbereich: angemeldet, Profil vorhanden,
  // vom Admin freigegeben, mindestens ein Universum zugeteilt.
  const { supabase, user, profile, universes, activeUniverse } = await requireAccess("/dashboard");

  const { data: isAdmin } = await supabase.rpc("is_admin");

  // Anmeldelink zum Weitergeben, auf derselben Adresse, unter der das
  // Dashboard gerade läuft (Produktion wie Preview)
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const signupUrl = `${proto}://${host}/signup`;

  // Universen sind eine interne Einteilung. Wer nur in einem spielt, soll
  // davon gar nichts mitbekommen -- erst ab zwei zugeteilten Universen wird
  // die Zugehörigkeit angezeigt und umschaltbar.
  const showUniverse = universes.length > 1;

  // Alles ab hier ist auf das aktive Universum beschränkt -- in der Abfrage
  // wie auch in der Datenbank (siehe seasons_select in
  // supabase/migrations/20260830100200_universe_seasons.sql).
  const { data: myRows } = await supabase
    .from("season_players")
    .select("season_id, seasons!inner(id, status, lobby_opened_at, universe_id)")
    .eq("profile_id", user.id)
    .in("seasons.status", ["lobby", "running"])
    .eq("seasons.universe_id", activeUniverse.id);

  const myActiveSeasons = (myRows ?? [])
    .map((row) => (Array.isArray(row.seasons) ? row.seasons[0] : row.seasons))
    .filter((s): s is NonNullable<typeof s> => s != null)
    .sort((a, b) => a.lobby_opened_at.localeCompare(b.lobby_opened_at));
  const myIds = new Set(myActiveSeasons.map((s) => s.id));

  // Grenzen aus der Datenbank, die sie auch durchsetzt (join_season,
  // create_and_join_season) -- die Oberfläche rechnet nichts davon selbst nach.
  const { data: limitsRow } = await supabase
    .rpc("my_season_limits", { p_universe_id: activeUniverse.id })
    .maybeSingle();
  const limitsData = limitsRow as {
    active_count: number; active_max: number; opened_today: number; opened_max: number;
  } | null;
  const limits: SeasonLimits = {
    activeMax: limitsData?.active_max ?? 3,
    openedToday: limitsData?.opened_today ?? 0,
    openedMax: limitsData?.opened_max ?? 3,
  };

  const { data: lobbies } = await supabase
    .from("seasons")
    .select("id, lobby_opened_at")
    .eq("status", "lobby")
    .eq("universe_id", activeUniverse.id)
    .order("lobby_opened_at", { ascending: true });

  // Belegung für eigene Partien und offene Lobbys in einer Abfrage.
  const occupancyIds = [...new Set([...myIds, ...(lobbies ?? []).map((l) => l.id)])];
  const occupancy = new Map<string, number>();
  if (occupancyIds.length > 0) {
    const { data: playerRows } = await supabase
      .from("season_players")
      .select("season_id")
      .in("season_id", occupancyIds);
    for (const row of playerRows ?? []) {
      occupancy.set(row.season_id, (occupancy.get(row.season_id) ?? 0) + 1);
    }
  }

  const mySeasons: MySeasonSummary[] = myActiveSeasons.map((s) => ({
    id: s.id,
    status: s.status as "lobby" | "running",
    lobbyOpenedAt: s.lobby_opened_at,
    occupancy: occupancy.get(s.id) ?? 0,
  }));

  // Lobbys, in denen man schon sitzt, stehen oben unter "Deine Partien".
  const openLobbies: LobbySummary[] = (lobbies ?? [])
    .filter((l) => !myIds.has(l.id))
    .map((l) => ({
      id: l.id,
      lobbyOpenedAt: l.lobby_opened_at,
      occupancy: occupancy.get(l.id) ?? 0,
    }));

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>Willkommen, {profile.displayName}</h1>
            <div className="dashsub">{user.email}</div>
            {showUniverse && (
              <div className="dashsub">
                Universum: <strong>{activeUniverse.name}</strong>
                {activeUniverse.description ? ` — ${activeUniverse.description}` : ""}
              </div>
            )}
          </div>
          <div className="dashtools">
            <Link href="/leaderboard" className="btn-quiet">
              Rangliste
            </Link>
            {isAdmin && (
              <a href="/admin" className="btn-quiet">
                Admin
              </a>
            )}
            <form action={signOut}>
              <button type="submit" className="btn-quiet">
                Abmelden
              </button>
            </form>
          </div>
        </div>

        <UniverseSwitcher universes={universes} activeUniverseId={activeUniverse.id} />

        {/* Der Spielmodus steht oben und ist die einzige farbig hervorgehobene
            Karte -- alles andere ist Vorbereitung darauf. */}
        <div className="dashsection">
          <h2>Spielmodus</h2>
          <span className="dashsub">Gegen vier Mitspieler, ein Halbjahr je Zug</span>
        </div>

        {/* key je Universum: LobbyOverview setzt mySeason und openLobbies über
            useState aus den Props auf. Das greift nur beim Einhängen -- nach
            einem Universumswechsel lieferte der Server zwar neue Werte, die
            Komponente zeigte aber weiter die Partie des vorigen Universums.
            Nur die Überschrift folgte, weil universeName eine reine Prop ist.
            Der key erzwingt das Neuaufsetzen mit den neuen Daten. */}
        <LobbyOverview
          key={activeUniverse.id}
          initialMySeasons={mySeasons}
          initialOpenLobbies={openLobbies}
          limits={limits}
          universeId={activeUniverse.id}
          universeName={activeUniverse.name}
          universeActive={activeUniverse.isActive}
          showUniverse={showUniverse}
        />

        <div className="dashsection">
          <h2>Üben</h2>
          <span className="dashsub">Allein, jederzeit</span>
        </div>

        <div className="modegrid">
          {/* Link statt <a>: Wechsel innerhalb der App, mit Überblendung
              (app/template.tsx) statt eines harten Neuladens. */}
          <Link href="/explain" className="modecard">
            <h3>Einführung</h3>
            <p>
              Geführt durch alle Entscheidungen: eine Beteiligung über zehn Halbjahre,
              ein Coach erklärt jeden Schritt.
            </p>
          </Link>
          <Link href="/practice" className="modecard">
            <h3>Übungsmodus</h3>
            <p>
              Eine vollständige Solopartie gegen vier Fonds derselben Kohorte — wie im
              Spielmodus, nur ohne Mitspieler.
            </p>
          </Link>
        </div>

        <div className="dashsection">
          <h2>Mitspieler</h2>
          <span className="dashsub">Per Link, jederzeit</span>
        </div>
        <InviteFriends signupUrl={signupUrl} />
      </div>
    </main>
  );
}
