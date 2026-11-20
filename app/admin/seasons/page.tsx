import { requireAdmin } from "../adminAuth";
import SeasonsView, { type AdminSeasonRow, type AdminSubmissionRow } from "./SeasonsView";

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

  // Server-Komponente: pro Anfrage einmal gerendert, die aktuelle Zeit ist hier gewollt.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return (
    <SeasonsView seasons={seasons} subsBySeason={subsBySeason} now={now}
      error={error?.message ?? null} subError={subError?.message ?? null} />
  );
}
