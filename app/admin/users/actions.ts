"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../adminAuth";
import { createAdminClient } from "@/lib/supabase/adminClient";

export async function deleteUserAction(userId: string): Promise<{ error: string | null }> {
  const { supabase, user } = await requireAdmin();

  if (userId === user.id) {
    return { error: "Der eigene Admin-Account kann hier nicht gelöscht werden." };
  }

  /* Erst die Verweise freigeben, an denen das Löschen sonst scheitert
     (seasons.created_by, siehe Migration 20261119150000) — die Funktion
     schützt außerdem den Root-Account und andere Admins und schreibt den
     Eingriff ins Protokoll. */
  const { error: prepError } = await supabase.rpc("admin_prepare_user_deletion", { p_user_id: userId });
  if (prepError) {
    const known: Record<string, string> = {
      root_admin_cannot_be_deleted: "Der Haupt-Administrator kann nicht gelöscht werden.",
      not_root_admin: "Einen Administrator kann nur der Haupt-Administrator löschen.",
      user_not_found: "Dieses Konto gibt es nicht mehr.",
    };
    const hit = Object.keys(known).find((k) => prepError.message.includes(k));
    return { error: hit ? known[hit] : prepError.message };
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
  if (!error) {
    await supabase.rpc("admin_log", {
      p_action: "user.access",
      p_target: profileId.slice(0, 8),
      p_details: { profile_id: profileId, status, universes: universeIds.length },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { error: error ? error.message : null };
}

/** Admin-Rolle vergeben oder entziehen — nur der Haupt-Administrator (admin_set_admin prüft es). */
export async function setAdminAction(userId: string, isAdmin: boolean): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_admin", { p_user_id: userId, p_is_admin: isAdmin });
  revalidatePath("/admin/users");
  if (error?.message.includes("not_root_admin")) {
    return { error: "Administratoren ernennt nur der Haupt-Administrator." };
  }
  return { error: error ? error.message : null };
}
