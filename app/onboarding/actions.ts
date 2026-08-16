"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setDisplayName(_prevState: unknown, formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (displayName.length < 3 || displayName.length > 24) {
    return { error: "Der Anzeigename muss zwischen 3 und 24 Zeichen lang sein." };
  }
  if (!/^[\w äöüÄÖÜß.-]+$/.test(displayName)) {
    return { error: "Bitte nur Buchstaben, Zahlen, Leerzeichen, . _ - verwenden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Dieser Anzeigename ist bereits vergeben. Bitte wähle einen anderen." };
    }
    return { error: "Anzeigename konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  redirect("/dashboard");
}
