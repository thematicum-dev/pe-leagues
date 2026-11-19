import { requireAdmin } from "../adminAuth";
import FeedbackOverview, { type FeedbackRow } from "./FeedbackOverview";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireAdmin();
  const [{ data, error }, sp] = await Promise.all([supabase.rpc("admin_list_feedback"), searchParams]);
  return <FeedbackOverview rows={(data ?? []) as FeedbackRow[]} searchParams={sp} error={error?.message} />;
}
