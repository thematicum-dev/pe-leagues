import { requireAdmin } from "../adminAuth";
import DeleteUserButton from "./DeleteUserButton";
import UserAccessControls, { type UniverseOption } from "./UserAccessControls";

interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  access_status: "pending" | "approved" | "rejected" | "none";
  access_requested_at: string | null;
  access_decided_at: string | null;
  access_note: string | null;
  request_message: string | null;
  universes: { id: string; key: string; name: string }[];
  seasons_played: number;
  seasons_won: number;
  max_score: number | null;
  avg_score: number | null;
  max_tvpi: number | null;
  avg_tvpi: number | null;
  max_irr: number | null;
  avg_irr: number | null;
}

const STATUS_LABEL: Record<AdminUserRow["access_status"], string> = {
  pending: "Wartet auf Freigabe",
  approved: "Freigegeben",
  rejected: "Gesperrt",
  none: "Ohne Anfrage",
};

function fmtScore(v: number | null): string {
  return v == null ? "—" : v.toFixed(2);
}
function fmtTvpi(v: number | null): string {
  return v == null ? "—" : v.toFixed(2) + "×";
}
function fmtIrr(v: number | null): string {
  return v == null ? "—" : (v * 100).toFixed(1).replace(".", ",") + " %";
}
function fmtDate(v: string | null): string {
  return v == null ? "—" : new Date(v).toLocaleDateString("de-DE");
}

export default async function AdminUsersPage() {
  const { supabase, user } = await requireAdmin();

  const [{ data: userData, error }, { data: universeData }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.rpc("admin_list_universes"),
  ]);

  const users = (userData ?? []) as AdminUserRow[];
  const universes = ((universeData ?? []) as UniverseOption[]).map((u) => ({
    id: u.id,
    key: u.key,
    name: u.name,
    is_active: u.is_active,
  }));

  const pending = users.filter((u) => u.access_status === "pending");
  const rest = users.filter((u) => u.access_status !== "pending");

  function renderUser(u: AdminUserRow) {
    return (
      <div className="seasonrow adminuser" key={u.id} style={{ alignItems: "flex-start" }}>
        <div style={{ width: "100%" }}>
          <div>
            {u.display_name ?? "(noch kein Anzeigename)"}{" "}
            <span className="seasonstatus">{STATUS_LABEL[u.access_status]}</span>
          </div>
          <div className="dashsub">{u.email}</div>
          <div className="dashsub">
            Registriert {fmtDate(u.created_at)}
            {u.access_status !== "none" && ` · angefragt ${fmtDate(u.access_requested_at)}`}
            {u.access_decided_at && ` · entschieden ${fmtDate(u.access_decided_at)}`}
          </div>
          {u.request_message && (
            <div className="dashsub">Nachricht: „{u.request_message}&ldquo;</div>
          )}
          <div className="dashsub">
            Universen:{" "}
            {u.universes.length === 0 ? "keine" : u.universes.map((x) => x.name).join(", ")}
          </div>
          <div className="dashsub mono">
            {u.seasons_played} Partien · {u.seasons_won} gewonnen · Score max {fmtScore(u.max_score)} / ⌀ {fmtScore(u.avg_score)}
            {" · TVPI max "}{fmtTvpi(u.max_tvpi)}{" / ⌀ "}{fmtTvpi(u.avg_tvpi)}
            {" · IRR max "}{fmtIrr(u.max_irr)}{" / ⌀ "}{fmtIrr(u.avg_irr)}
          </div>

          {u.access_status === "none" ? (
            <p className="dashsub">
              Dieses Konto hat das Onboarding noch nicht abgeschlossen — es gibt noch nichts
              freizugeben.
            </p>
          ) : (
            <UserAccessControls
              profileId={u.id}
              status={u.access_status}
              grantedUniverseIds={u.universes.map((x) => x.id)}
              universes={universes}
              note={u.access_note}
            />
          )}
        </div>
        {u.id !== user.id && (
          <DeleteUserButton userId={u.id} displayName={u.display_name ?? u.email} />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="dashcard">
        <h2>Offene Zugangsanfragen ({pending.length})</h2>
        {error && <p className="autherror">{error.message}</p>}
        {pending.length === 0 && !error && (
          <div className="quiet">Keine offene Anfrage.</div>
        )}
        {pending.map(renderUser)}
      </div>

      <div className="dashcard">
        <h2>Alle Konten ({users.length})</h2>
        {rest.map(renderUser)}
      </div>
    </>
  );
}
