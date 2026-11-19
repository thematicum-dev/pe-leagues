"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/adminClient";
import type { FormState } from "@/lib/forms";

export async function setAnalyticsOptOut(optOut: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_preferences", { p_analytics_opt_out: optOut });
  revalidatePath("/profile");
  return { error: error ? "Die Einstellung konnte nicht gespeichert werden." : null };
}

export async function changeDisplayName(_prev: FormState, formData: FormData): Promise<FormState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (displayName.length < 3 || displayName.length > 24) {
    return { error: "Der Anzeigename muss zwischen 3 und 24 Zeichen lang sein." };
  }
  if (!/^[\w äöüÄÖÜß.-]+$/.test(displayName)) {
    return { error: "Bitte nur Buchstaben, Zahlen, Leerzeichen, . _ - verwenden." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Eigene Zeile, eigene Spalte: Die RLS-Policy profiles_update_own lässt genau
  // das zu, die Wächter-Trigger setzen alles andere zurück.
  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { error: "Dieser Anzeigename ist bereits vergeben." };
    return { error: "Der Anzeigename konnte nicht geändert werden." };
  }
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

/* Konto endgültig löschen (Art. 17 DSGVO). Zwei Schritte:

   1. prepare_my_account_deletion() gibt die Verweise frei, die das Löschen
      sonst blockieren (eröffnete Partien, siehe Migration 20261119150000).
   2. Das Auth-Konto wird über die Admin-API gelöscht; Profil, Plätze, Abgaben
      und Ereignisse folgen über die Fremdschlüssel-Kaskaden.

   Der Service-Role-Key wird hier ausschließlich für die ID benutzt, die
   getUser() gerade verifiziert hat — nie für eine ID aus dem Formular. */
export async function deleteMyAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "LÖSCHEN") {
    return { error: "Bitte tippe LÖSCHEN, um die Löschung zu bestätigen." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: prepError } = await supabase.rpc("prepare_my_account_deletion");
  if (prepError) {
    if (prepError.message.includes("root_admin_cannot_be_deleted")) {
      return { error: "Der Haupt-Administrator kann nicht gelöscht werden." };
    }
    return { error: "Die Löschung konnte nicht vorbereitet werden. Bitte versuche es erneut." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (err) {
    console.error("Kontolöschung fehlgeschlagen:", err);
    return { error: "Das Konto konnte nicht gelöscht werden. Bitte wende dich an den Support." };
  }

  await supabase.auth.signOut();
  redirect("/?geloescht=1");
}
