"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/forms";
import { ACCESS_CODE_COOKIE } from "@/lib/access/code";

export async function signup(_prevState: FormState, formData: FormData): Promise<FormState> {
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

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
    });

    if (error) {
      // Serverseitig geloggt (in den Vercel Runtime Logs sichtbar), damit sich
      // die Ursache nachvollziehen lässt, ohne dem Nutzer interne Details
      // dauerhaft anzuzeigen.
      console.error("Supabase signUp error:", error.status, error.code, error.message);

      if (error.message.toLowerCase().includes("already registered")) {
        return { error: "Für diese E-Mail-Adresse existiert bereits ein Konto." };
      }
      // Bis die genaue Ursache bekannt ist, zeigen wir den echten Fehlertext
      // von Supabase an statt einer generischen Meldung.
      return {
        error: `Registrierung fehlgeschlagen: ${error.message} (Status ${error.status ?? "?"}, Code ${error.code ?? "?"})`,
      };
    }

    /* Zugangscode aus dem Einladungslink merken, bis das Onboarding ihn
       einlöst — die Bestätigungsmail liegt dazwischen, und safeNext() lässt
       bewusst keine Parameter am Rücksprungziel zu. Nur das Format wird
       geprüft; ob der Code gilt, entscheidet redeem_access_code(). */
    const code = String(formData.get("code") ?? "").trim();
    if (/^[A-Za-z0-9][A-Za-z0-9-]{5,31}$/.test(code)) {
      (await cookies()).set(ACCESS_CODE_COOKIE, code.toUpperCase(), {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 14, path: "/",
      });
    }

    return { success: true };
  } catch (err) {
    console.error("Unerwarteter Fehler bei der Registrierung:", err);
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Unerwarteter Fehler: ${message}` };
  }
}
