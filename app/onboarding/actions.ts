"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestAccess(_prevState: unknown, formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (displayName.length < 3 || displayName.length > 24) {
    return { error: "Der Anzeigename muss zwischen 3 und 24 Zeichen lang sein." };
  }
  if (!/^[\w äöüÄÖÜß.-]+$/.test(displayName)) {
    return { error: "Bitte nur Buchstaben, Zahlen, Leerzeichen, . _ - verwenden." };
  }
  if (message.length > 500) {
    return { error: "Die Nachricht darf höchstens 500 Zeichen lang sein." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // request_access() ist der einzige Weg, ein Profil anzulegen: es entsteht
  // immer als Zugangsanfrage (access_status = 'pending'), niemals als
  // freigegebener Zugang. Siehe supabase/migrations/20260830100100_access_control.sql.
  const { error } = await supabase.rpc("request_access", {
    p_display_name: displayName,
    p_message: message || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Dieser Anzeigename ist bereits vergeben. Bitte wähle einen anderen." };
    }
    if (error.message.includes("profile_exists")) {
      redirect("/access");
    }
    return { error: "Die Anfrage konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  redirect("/access");
}
