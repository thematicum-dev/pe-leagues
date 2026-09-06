"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface UniverseSwitchState {
  error: string | null;
}

export const UNIVERSE_SWITCH_IDLE: UniverseSwitchState = { error: null };

/**
 * Wechselt das aktive Universum. Ob der Nutzer das darf, entscheidet nicht
 * diese Funktion, sondern die Datenbank: der Trigger
 * profiles_guard_access_columns() lehnt jedes nicht zugeteilte Universum ab
 * (Fehler 'universe_not_granted').
 *
 * Das Ergebnis des UPDATE wird ausgewertet und zurückgegeben. Vorher wurde es
 * verworfen: Ein abgelehnter Wechsel sah dadurch genauso aus wie ein
 * erfolgreicher -- die Seite lud neu und stand unverändert da, ohne dass
 * irgendwo stand, warum.
 */
export async function setActiveUniverse(
  _prev: UniverseSwitchState,
  formData: FormData,
): Promise<UniverseSwitchState> {
  const universeId = String(formData.get("universeId") ?? "");
  if (!universeId) return UNIVERSE_SWITCH_IDLE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_universe_id: universeId })
    .eq("id", user.id);

  if (error) {
    return {
      error: error.message.includes("universe_not_granted")
        ? "Für dieses Universum fehlt dir die Freigabe."
        : "Das Universum konnte nicht gewechselt werden. Bitte versuch es erneut.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return UNIVERSE_SWITCH_IDLE;
}
