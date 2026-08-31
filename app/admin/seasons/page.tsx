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

const STATUS_LABEL: Record<string, string> = {
  lobby: "Lobby offen",
  running: "Läuft",
  finished: "Beendet",
  cancelled: "Geschlossen",
};

function progressLabel(s: AdminSeasonRow): string {
  if (s.status === "lobby") return `${s.human_count}/5 Plätze belegt`;
  if (s.status === "running") return `Halbjahr ${s.current_half_year}/20 · ${s.submitted_count}/${s.human_count} abgegeben`;
  if (s.status === "cancelled") return s.cancelled_reason === "empty" ? "Ohne Mitspieler geschlossen" : "Vom Ersteller aufgelöst";
  return "—";
}

export default async function AdminSeasonsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_seasons");
  const seasons = (data ?? []) as AdminSeasonRow[];

  return (
    <div className="dashcard">
      <h2>Alle Partien ({seasons.length})</h2>
      {error && <p className="autherror">{error.message}</p>}
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
          </div>
          <ResetSeasonButton seasonId={s.id} />
        </div>
      ))}
    </div>
  );
}
