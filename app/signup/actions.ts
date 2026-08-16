"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signup(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !password) {
    return { error: "Bitte E-Mail-Adresse und Passwort eingeben." };
  }
  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }
  if (password !== passwordConfirm) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Für diese E-Mail-Adresse existiert bereits ein Konto." };
    }
    return { error: "Registrierung fehlgeschlagen. Bitte versuche es erneut." };
  }

  return { success: true };
}
