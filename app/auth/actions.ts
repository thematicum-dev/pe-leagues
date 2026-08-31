"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Schickt den Bestätigungslink der Registrierung noch einmal. Antwortet
 * immer gleich, egal ob die Adresse existiert oder längst bestätigt ist --
 * sonst ließe sich damit ausspähen, welche Adressen registriert sind (dasselbe
 * Vorgehen wie bei "Passwort vergessen").
 */
export async function resendConfirmation(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Bitte E-Mail-Adresse eingeben." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  });

  return { success: true };
}
