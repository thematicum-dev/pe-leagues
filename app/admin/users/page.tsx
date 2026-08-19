import { requireAdmin } from "../adminAuth";
import DeleteUserButton from "./DeleteUserButton";

interface AdminUserRow {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
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

export default async function AdminUsersPage() {
  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_users");
  const users = (data ?? []) as AdminUserRow[];

  return (
    <div className="dashcard">
      <h2>Alle Nutzer ({users.length})</h2>
      {error && <p className="autherror">{error.message}</p>}
      {users.map((u) => (
        <div className="seasonrow" key={u.id} style={{ alignItems: "flex-start" }}>
          <div>
            <div>{u.display_name}</div>
            <div className="dashsub">{u.email}</div>
            <div className="dashsub mono">
              {u.seasons_played} Partien · {u.seasons_won} gewonnen · Score max {fmtScore(u.max_score)} / ⌀ {fmtScore(u.avg_score)}
              {" · TVPI max "}{fmtTvpi(u.max_tvpi)}{" / ⌀ "}{fmtTvpi(u.avg_tvpi)}
              {" · IRR max "}{fmtIrr(u.max_irr)}{" / ⌀ "}{fmtIrr(u.avg_irr)}
            </div>
          </div>
          {u.id !== user.id && <DeleteUserButton userId={u.id} displayName={u.display_name} />}
        </div>
      ))}
    </div>
  );
}
