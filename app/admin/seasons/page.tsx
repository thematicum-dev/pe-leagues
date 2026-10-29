import { requireAdmin } from "../adminAuth";
import ResetSeasonButton from "./ResetSeasonButton";

interface AdminSeasonRow {
  id: string;
  status: string;
  current_half_year: number;
  current_half_year_deadline: string | null;
  lobby_opened_at: string;
  started_at: string | null;
  created_by_name: string | null;
  universe_name: string | null;
  human_count: number;
  ai_count: number;
  submitted_count: number;
  cancelled_reason: string | null;
}

// Eine Zeile je menschlichem Spieler einer laufenden Partie (admin_season_submissions)
interface AdminSubmissionRow {
  season_id: string;
  slot: number;
  profile_id: string;
  display_name: string | null;
  email: string | null;
  submitted_at: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  lobby: "Lobby offen",
  running: "Läuft",
  finished: "Beendet",
  cancelled: "Geschlossen",
};

function progressLabel(s: AdminSeasonRow): string {
  if (s.status === "lobby") return `${s.human_count}/5 Plätze belegt`;
  if (s.status === "running") return `Halbjahr ${s.current_half_year}/20 · ${s.submitted_count}/${s.human_count} abgegeben`;
  if (s.status === "cancelled") {
    if (s.cancelled_reason === "aborted") return "Im Spiel abgebrochen";
    return s.cancelled_reason === "empty" ? "Ohne Mitspieler geschlossen" : "Vom Ersteller aufgelöst";
  }
  return "—";
}

// Fristen gelten in Europe/Berlin (lib/engine/deadline.ts), unabhängig von der Serverzeitzone
const berlin = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtTime = (v: string) => berlin.format(new Date(v));

function SubmissionStatus({ season, players }: { season: AdminSeasonRow; players: AdminSubmissionRow[] }) {
  const done = players.filter((p) => p.submitted_at);
  const missing = players.filter((p) => !p.submitted_at);
  const name = (p: AdminSubmissionRow) => p.display_name ?? p.email ?? `Platz ${p.slot}`;

  return (
    <div className="adminsubs">
      {season.current_half_year_deadline && (
        <div className="dashsub">Frist HJ {season.current_half_year}: {fmtTime(season.current_half_year_deadline)}</div>
      )}
      <div className="dashsub">
        <span className="adminsubs-done">Abgegeben ({done.length}):</span>{" "}
        {done.length === 0
          ? "noch niemand"
          : done.map((p, i) => (
              <span key={p.profile_id} title={p.email ?? undefined}>
                {i > 0 && ", "}
                {name(p)} <span className="mono">({fmtTime(p.submitted_at!)})</span>
              </span>
            ))}
      </div>
      <div className="dashsub">
        <span className={missing.length ? "adminsubs-missing" : "adminsubs-done"}>Fehlt noch ({missing.length}):</span>{" "}
        {missing.length === 0
          ? "niemand — die Auswertung steht an"
          : missing.map((p, i) => (
              <span key={p.profile_id} title={p.email ?? undefined}>
                {i > 0 && ", "}
                {name(p)}
              </span>
            ))}
      </div>
    </div>
  );
}

export default async function AdminSeasonsPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: subData, error: subError }] = await Promise.all([
    supabase.rpc("admin_list_seasons"),
    supabase.rpc("admin_season_submissions"),
  ]);
  const seasons = (data ?? []) as AdminSeasonRow[];
  const subsBySeason = new Map<string, AdminSubmissionRow[]>();
  for (const row of (subData ?? []) as AdminSubmissionRow[]) {
    const list = subsBySeason.get(row.season_id) ?? [];
    list.push(row);
    subsBySeason.set(row.season_id, list);
  }

  return (
    <div className="dashcard">
      <h2>Alle Partien ({seasons.length})</h2>
      {error && <p className="autherror">{error.message}</p>}
      {subError && <p className="autherror">Abgabestand je Spieler: {subError.message}</p>}
      {seasons.length === 0 && !error && <div className="quiet">Noch keine Partien.</div>}
      {seasons.map((s) => (
        <div className="seasonrow" key={s.id} style={{ alignItems: "flex-start" }}>
          <div>
            <div>
              Partie {s.id.slice(0, 8)} <span className="seasonstatus">{STATUS_LABEL[s.status] ?? s.status}</span>
            </div>
            <div className="dashsub">
              {s.universe_name ?? "—"} · {progressLabel(s)} · {s.ai_count} KI-Plätze · erstellt von{" "}
              {s.created_by_name ?? "—"}
            </div>
            {s.status === "running" && subsBySeason.has(s.id) && (
              <SubmissionStatus season={s} players={subsBySeason.get(s.id)!} />
            )}
          </div>
          <ResetSeasonButton seasonId={s.id} />
        </div>
      ))}
    </div>
  );
}
