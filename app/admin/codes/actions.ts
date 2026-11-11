"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../adminAuth";
import type { FormState } from "@/lib/forms";

export type CodeFormState = (NonNullable<FormState> & { code?: string }) | null;

export async function createCodeAction(_prev: CodeFormState, formData: FormData): Promise<CodeFormState> {
  const { supabase } = await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const universeId = String(formData.get("universeId") ?? "");
  const maxRaw = String(formData.get("maxUses") ?? "").trim();
  const expRaw = String(formData.get("expiresAt") ?? "").trim();
  const custom = String(formData.get("code") ?? "").trim();

  if (label.length < 2 || label.length > 80) return { error: "Die Bezeichnung muss zwischen 2 und 80 Zeichen lang sein." };
  if (!universeId) return { error: "Bitte ein Universum wählen." };
  const maxUses = maxRaw === "" ? null : Number(maxRaw);
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) return { error: "Die Höchstzahl muss eine ganze Zahl ab 1 sein." };
  if (custom && !/^[A-Za-z0-9][A-Za-z0-9-]{5,31}$/.test(custom)) {
    return { error: "Ein eigener Code braucht 6–32 Zeichen: Buchstaben, Ziffern und Bindestriche." };
  }
  // Das Ablaufdatum gilt bis zum Ende des gewählten Tages (Europe/Berlin liegt
  // höchstens zwei Stunden vor UTC — 23:59 UTC ist also nie zu früh)
  const expiresAt = expRaw ? new Date(expRaw + "T23:59:59Z").toISOString() : null;

  const { data, error } = await supabase.rpc("admin_create_access_code", {
    p_label: label, p_universe_id: universeId, p_max_uses: maxUses, p_expires_at: expiresAt, p_code: custom || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "Diesen Code gibt es bereits." };
    return { error: error.message };
  }
  revalidatePath("/admin/codes");
  return { success: true, code: String(data) };
}

export async function setCodeActiveAction(id: string, active: boolean): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_access_code_active", { p_id: id, p_is_active: active });
  revalidatePath("/admin/codes");
  return { error: error ? error.message : null };
}
