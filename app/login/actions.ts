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
    return { error: "E-Mail-Adresse oder Passwort ist falsch." };
  }

  // Zugangskontrolle: Angemeldet bleibt nur, wer vom Admin freigegeben wurde
  // UND mindestens ein Universum zugeteilt bekommen hat. Wer noch wartet oder
  // abgelehnt wurde, wird sofort wieder abgemeldet und erfährt hier, woran es
  // liegt. Wer noch gar kein Profil hat, kommt ins Onboarding und stellt dort
  // seine Anfrage.
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
        "Dein Zugang ist freigegeben, dir wurde aber noch kein Universum zugeteilt. Bitte wende dich an den Administrator.",
    };
  }

  redirect(next);
}
