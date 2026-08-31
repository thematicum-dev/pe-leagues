"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Wechselt das aktive Universum. Ob der Nutzer das darf, entscheidet nicht
 * diese Funktion, sondern die Datenbank: der Trigger
 * profiles_guard_access_columns() lehnt jedes nicht zugeteilte Universum ab
 * (Fehler 'universe_not_granted').
 */
export async function setActiveUniverse(formData: FormData) {
  const universeId = String(formData.get("universeId") ?? "");
  if (!universeId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  await supabase.from("profiles").update({ active_universe_id: universeId }).eq("id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
}
