"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Bitte E-Mail-Adresse eingeben." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  // Immer denselben Erfolgstext zeigen, unabhängig davon, ob die
  // E-Mail-Adresse existiert — sonst ließe sich damit ausspähen, welche
  // Adressen registriert sind.
  return { success: true };
}
