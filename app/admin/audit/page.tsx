import { requireAdmin } from "../adminAuth";
import { actionLabel } from "@/components/admin/AdminOverview";

interface AuditRow { id: number; admin_email: string | null; action: string; target: string | null; details: Record<string, unknown>; created_at: string }

const stamp = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export default async function AdminAuditPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_audit", { p_limit: 200 });
  const rows = (data ?? []) as AuditRow[];

  return (
    <div className="dashcard">
      <h2>Protokoll der Admin-Eingriffe</h2>
      <p className="dashsub">
        Wer hat wann was getan: Freigaben und Sperren, gelöschte Konten, zurückgesetzte und vorgezogene Partien,
        Zugangscodes, Universen und Admin-Rollen. Die letzten 200 Einträge; das Protokoll lässt sich nicht ändern.
      </p>
      {error && <p className="autherror">{error.message}</p>}
      {rows.length === 0 && !error && <div className="quiet">Noch nichts protokolliert.</div>}
      {rows.length > 0 && (
        <div className="tablewrap">
          <table className="admintable">
            <thead><tr><th>Zeit</th><th>Admin</th><th>Eingriff</th><th>Ziel</th><th>Einzelheiten</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{stamp.format(new Date(r.created_at))}</td>
                  <td>{r.admin_email ?? "(gelöscht)"}</td>
                  <td>{actionLabel(r.action)}</td>
                  <td>{r.target ?? "—"}</td>
                  <td className="mono" style={{ fontSize: 11, opacity: 0.75 }}>
                    {Object.entries(r.details ?? {}).filter(([k]) => !k.endsWith("_id")).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
