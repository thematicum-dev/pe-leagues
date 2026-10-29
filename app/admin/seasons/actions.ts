"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../adminAuth";

export async function resetSeasonAction(seasonId: string): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();

  // admin_reset_season() prüft is_admin() selbst noch einmal (siehe
  // supabase/migrations/20260819110200_admin_reset_season.sql) -- der
  // requireAdmin()-Aufruf oben ist nur für den sofortigen Redirect da.
  const { error } = await supabase.rpc("admin_reset_season", { p_season_id: seasonId });

  revalidatePath("/admin/seasons");
  return { error: error ? error.message : null };
}

export async function advanceSeasonAction(seasonId: string): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();

  // admin_advance_season() prüft is_admin() ebenfalls selbst (siehe
  // supabase/migrations/20261029090100_admin_advance_season.sql). Sie zieht
  // nur die Frist vor und stößt die Auswertung an; die Edge Function rechnet
  // asynchron, der neue Stand erscheint nach einem Neuladen.
  const { error } = await supabase.rpc("admin_advance_season", { p_season_id: seasonId });

  revalidatePath("/admin/seasons");
  return { error: error ? error.message : null };
}
