import { requireAdmin } from "./adminAuth";
import AdminOverview, { type AdminStats, type AuditRow } from "@/components/admin/AdminOverview";

export default async function AdminIndexPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: audit }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.rpc("admin_list_audit", { p_limit: 8 }),
  ]);

  if (error || !data) {
    return (
      <div className="dashcard">
        <h2>Übersicht</h2>
        <p className="autherror">{error?.message ?? "Keine Kennzahlen verfügbar."}</p>
      </div>
    );
  }
  return <AdminOverview stats={data as AdminStats} audit={(audit ?? []) as AuditRow[]} />;
}
