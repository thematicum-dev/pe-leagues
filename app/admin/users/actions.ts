"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../adminAuth";
import { createAdminClient } from "@/lib/supabase/adminClient";

export async function deleteUserAction(userId: string): Promise<{ error: string | null }> {
  const { user } = await requireAdmin();

  if (userId === user.id) {
    return { error: "Der eigene Admin-Account kann hier nicht gelöscht werden." };
  }

  // Löscht über die Auth-Admin-API (nicht per SQL direkt auf auth.users):
  // das räumt zuverlässig auch Sessions, Refresh-Tokens und Identitäten auf.
  // profiles wird über die Fremdschlüssel-Kaskade (on delete cascade)
  // automatisch mitgelöscht.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  revalidatePath("/admin/users");
  return { error: error ? error.message : null };
}

/**
 * Freigabe/Ablehnung samt Universums-Zuteilung. Die übergebene Liste ersetzt
 * die bisherige Zuteilung vollständig. admin_set_user_access() prüft
 * is_admin() selbst noch einmal serverseitig (siehe
 * supabase/migrations/20260830100300_access_admin_functions.sql).
 */
export async function setUserAccessAction(
  profileId: string,
  status: "approved" | "rejected" | "pending",
  universeIds: string[],
  note: string,
): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.rpc("admin_set_user_access", {
    p_profile_id: profileId,
    p_status: status,
    p_universe_ids: universeIds,
    p_note: note.trim() || null,
  });

  revalidatePath("/admin/users");
  return { error: error ? error.message : null };
}
