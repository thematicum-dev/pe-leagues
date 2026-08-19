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
