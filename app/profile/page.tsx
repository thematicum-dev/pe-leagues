import Link from "next/link";
import { requireAccess } from "@/lib/access/context";
import type { RankingRow } from "@/app/season/[id]/seasonReport";
import CareerView from "@/components/career/CareerView";
import type { CareerRow } from "@/lib/career/career";
import ProfileSettings from "./ProfileSettings";

export const metadata = { title: "Profil" };

/* Profil mit dem eigenen Track Record.

   Oben die Karriere (Stufe, Punkte, Bestwerte, Auszeichnungen) aus
   my_career() und lib/career/career.ts. Darunter alle Partien, an denen man
   teilgenommen hat, und von jeder beendeten oder abgebrochenen der Weg zurück
   zur Abschlussauswertung (Rendite und Value Bridge auf /season/[id]).

   Das Dashboard listet nur Lobbys und laufende Partien. Eine Partie, die
   endete, während man nicht hinsah, war danach nirgends mehr erreichbar —
   und mit ihr die Auswertung. Hier bleibt sie stehen.

   Sichtbar sind über RLS (seasons_select) nur Partien in Universen, denen
   man zugeteilt ist; die Liste geht deshalb bewusst über alle davon. Ganz
   unten die Einstellungen des Kontos. */

interface SeasonRow {
  id: string;
  status: string;
  started_at: string | null;
  lobby_opened_at: string;
  current_half_year: number;
  final_ranking: RankingRow[] | null;
  cancelled_reason: string | null;
  universe_id: string;
}

const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

export default async function ProfilePage() {
  const { supabase, user, profile, universes } = await requireAccess("/profile");

  const [{ data: rows }, { data: career, error: careerError }, { data: prefs }, { data: isRoot }] = await Promise.all([
    supabase
      .from("season_players")
      .select(
        "slot, seasons!inner(id, status, started_at, lobby_opened_at, current_half_year, final_ranking, cancelled_reason, universe_id)",
      )
      .eq("profile_id", user.id)
      .in("seasons.status", ["running", "finished", "cancelled"]),
    supabase.rpc("my_career"),
    supabase.rpc("my_preferences").maybeSingle<{ analytics_opt_out: boolean }>(),
    supabase.rpc("is_root_admin"),
  ]);

  const played = (rows ?? [])
    .map((r) => ({ slot: r.slot as number, s: (Array.isArray(r.seasons) ? r.seasons[0] : r.seasons) as SeasonRow | null }))
    .filter((r): r is { slot: number; s: SeasonRow } => r.s != null)
    // Aus einer geschlossenen Lobby ist nie eine Partie geworden.
    .filter(({ s }) => s.status !== "cancelled" || s.cancelled_reason === "aborted")
    .sort((a, b) => (b.s.started_at ?? b.s.lobby_opened_at).localeCompare(a.s.started_at ?? a.s.lobby_opened_at));

  const results = played.map(({ slot, s }) => {
    const ranking = Array.isArray(s.final_ranking) ? s.final_ranking : [];
    const idx = ranking.findIndex((r) => r.slot === slot);
    return { slot, s, rank: idx >= 0 ? idx + 1 : null, row: idx >= 0 ? ranking[idx] : null, field: ranking.length };
  });

  const universeName = new Map(universes.map((u) => [u.id, u.name]));
  const showUniverse = universes.length > 1;

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>{profile.displayName}</h1>
            <div className="dashsub">{user.email}</div>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Zum Dashboard
          </Link>
        </div>

        <CareerView rows={(career ?? []) as CareerRow[]} error={careerError?.message ?? null} showGames={false} />

        <div className="dashsection">
          <h2>Gespielte Partien</h2>
          <span className="dashsub">Auswertung mit Rendite und Value Bridge</span>
        </div>
        <div className="dashcard">
          {results.length === 0 && (
            <p className="dashsub" style={{ paddingTop: 16 }}>
              Noch keine Partie gespielt. Sobald eine Partie startet, steht sie hier — und nach dem Ende
              bleibt ihre Auswertung hier abrufbar.
            </p>
          )}
          {results.map(({ s, rank, row, field }) => {
            const date = dateFmt.format(new Date(s.started_at ?? s.lobby_opened_at));
            const aborted = s.status === "cancelled";
            const running = s.status === "running";
            const label = running
              ? `Läuft · Halbjahr ${s.current_half_year}`
              : aborted
                ? `Abgebrochen nach Halbjahr ${Math.max(0, s.current_half_year - 1)}`
                : rank != null ? `Platz ${rank} von ${field}` : "Beendet";
            return (
              <Link href={`/season/${s.id}`} className="seasonrow profrow" key={s.id}>
                <span className="profmain">
                  <span>
                    Partie {s.id.slice(0, 8)}
                    {showUniverse && universeName.get(s.universe_id) ? ` · ${universeName.get(s.universe_id)}` : ""}
                  </span>
                  <span className="dashsub">
                    {date} · {label}
                    {row ? ` · TVCC ${(row.tvcc ?? row.tvpi).toFixed(2).replace(".", ",")}× · IRR ${(row.irr * 100).toFixed(1).replace(".", ",")} %` : ""}
                  </span>
                </span>
                <span className="profright">
                  {row && (
                    <span className="mono" style={{ color: row.score >= 1 ? "var(--teal)" : "var(--ox)" }}>
                      {row.score.toFixed(2)}
                    </span>
                  )}
                  <span className="seasonstatus">{running ? "Weiterspielen" : "Auswertung"}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="dashsection">
          <h2>Einstellungen</h2>
        </div>
        <ProfileSettings
          displayName={profile.displayName}
          email={user.email ?? ""}
          analyticsOptOut={prefs?.analytics_opt_out ?? false}
          canDelete={!isRoot}
        />
      </div>
    </main>
  );
}
