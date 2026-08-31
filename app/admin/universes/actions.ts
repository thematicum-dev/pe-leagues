"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../adminAuth";

export async function createUniverseAction(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error: string | null; success?: boolean }> {
  const { supabase } = await requireAdmin();

  const key = String(formData.get("key") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!/^[a-z0-9][a-z0-9_-]{1,30}$/.test(key)) {
    return {
      error:
        "Der Schlüssel darf nur Kleinbuchstaben, Ziffern, - und _ enthalten (2–31 Zeichen, Beginn mit Buchstabe oder Ziffer).",
    };
  }
  if (name.length < 2 || name.length > 60) {
    return { error: "Der Name muss zwischen 2 und 60 Zeichen lang sein." };
  }

  const { error } = await supabase.rpc("admin_create_universe", {
    p_key: key,
    p_name: name,
    p_description: description || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Diesen Schlüssel gibt es bereits." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/universes");
  return { error: null, success: true };
}

export async function updateUniverseAction(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error: string | null; success?: boolean }> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("universeId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (name.length < 2 || name.length > 60) {
    return { error: "Der Name muss zwischen 2 und 60 Zeichen lang sein." };
  }

  const { error } = await supabase.rpc("admin_update_universe", {
    p_universe_id: id,
    p_name: name,
    p_description: description || null,
    p_is_active: isActive,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/universes");
  return { error: null, success: true };
}
