"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/forms";
import { ACCESS_CODE_COOKIE } from "@/lib/access/code";


const CODE_ERRORS: Record<string, string> = {
  invalid_code: "Diesen Zugangscode gibt es nicht. Bitte prüfe die Schreibweise.",
  code_expired: "Dieser Zugangscode ist abgelaufen.",
  code_exhausted: "Dieser Zugangscode wurde bereits so oft eingelöst wie vorgesehen.",
  too_many_attempts: "Zu viele Fehlversuche. Bitte versuche es in einer Stunde erneut.",
  rejected: "Dein Zugang wurde gesperrt — ein Zugangscode hebt das nicht auf.",
};

export async function requestAccess(_prevState: FormState, formData: FormData): Promise<FormState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  if (displayName.length < 3 || displayName.length > 24) {
    return { error: "Der Anzeigename muss zwischen 3 und 24 Zeichen lang sein." };
  }
  if (!/^[\w äöüÄÖÜß.-]+$/.test(displayName)) {
    return { error: "Bitte nur Buchstaben, Zahlen, Leerzeichen, . _ - verwenden." };
  }
  if (message.length > 500) {
    return { error: "Die Nachricht darf höchstens 500 Zeichen lang sein." };
  }
  if (formData.get("terms") !== "on") {
    return { error: "Bitte bestätige die Nutzungsbedingungen und die Datenschutzhinweise." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  /* Mit Zugangscode: sofort freigegeben (redeem_access_code legt das Profil
     selbst an). Ohne: Anfrage an den Admin wie bisher — request_access() ist
     dafür der einzige Weg und erzeugt immer access_status = 'pending'.
     Siehe supabase/migrations/20261110090200_access_codes.sql. */
  if (code) {
    const { data: status, error } = await supabase.rpc("redeem_access_code", { p_code: code, p_display_name: displayName });
    if (error) {
      if (error.code === "23505") return { error: "Dieser Anzeigename ist bereits vergeben. Bitte wähle einen anderen." };
      return { error: "Der Zugangscode konnte nicht eingelöst werden. Bitte versuche es erneut." };
    }
    if (status !== "ok") return { error: CODE_ERRORS[String(status)] ?? "Der Zugangscode konnte nicht eingelöst werden." };
    await supabase.rpc("accept_terms");
    (await cookies()).delete(ACCESS_CODE_COOKIE);
    redirect("/dashboard");
  }

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
  await supabase.rpc("accept_terms");

  redirect("/access");
}

/** Auf der Wartesteite: Wer inzwischen einen Code bekommen hat, löst ihn hier ein. */
export async function redeemCode(_prevState: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Bitte gib den Zugangscode ein." };
  const supabase = await createClient();
  const { data: status, error } = await supabase.rpc("redeem_access_code", { p_code: code, p_display_name: null });
  if (error) return { error: "Der Zugangscode konnte nicht eingelöst werden. Bitte versuche es erneut." };
  if (status !== "ok") return { error: CODE_ERRORS[String(status)] ?? "Der Zugangscode konnte nicht eingelöst werden." };
  redirect("/dashboard");
}
