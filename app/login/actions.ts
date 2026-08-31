"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Bitte E-Mail-Adresse und Passwort eingeben." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    // Eine noch nicht bestätigte Adresse ist kein Tippfehler beim Passwort --
    // dieser Fall braucht den Weg zum neuen Bestätigungslink, nicht die
    // Standardmeldung (siehe app/confirm-email/page.tsx).
    if (error?.code === "email_not_confirmed") {
      return {
        error: "Diese E-Mail-Adresse ist noch nicht bestätigt.",
        needsConfirmation: email,
      };
    }
    return { error: "E-Mail-Adresse oder Passwort ist falsch." };
  }

  // Zugangskontrolle: Angemeldet bleibt nur, wer vom Admin freigegeben wurde
  // UND mindestens ein Universum zugeteilt bekommen hat. Wer noch wartet oder
  // abgelehnt wurde, wird sofort wieder abgemeldet und erfährt hier, woran es
  // liegt. Wer noch gar kein Profil hat, kommt ins Onboarding und stellt dort
  // seine Anfrage.
  //
  // Von Universen ist in den Meldungen bewusst nicht die Rede: Für den
  // wartenden Nutzer ist das eine interne Einteilung, die ihn erst etwas
  // angeht, wenn er tatsächlich in mehreren Universen spielt.
  const { data: profile } = await supabase.rpc("my_access").maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  if (profile.access_status === "rejected") {
    await supabase.auth.signOut();
    return {
      error: profile.access_note
        ? `Dein Zugang wurde nicht freigegeben: ${profile.access_note}`
        : "Dein Zugang wurde nicht freigegeben. Bitte wende dich an den Administrator.",
    };
  }

  if (profile.access_status !== "approved") {
    await supabase.auth.signOut();
    return {
      error:
        "Deine Zugangsanfrage liegt noch beim Administrator. Sobald sie freigegeben ist, kannst du dich anmelden.",
    };
  }

  const { count } = await supabase
    .from("profile_universes")
    .select("universe_id", { count: "exact", head: true });

  if (!count) {
    await supabase.auth.signOut();
    return {
      error:
        "Dein Zugang ist noch nicht vollständig freigegeben. Bitte wende dich an den Administrator.",
    };
  }

  redirect(next);
}
