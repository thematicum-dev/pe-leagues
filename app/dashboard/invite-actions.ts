"use server";

import { headers } from "next/headers";
import { requireAccess } from "@/lib/access/context";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { INVITE_DAILY_LIMIT, validateInvite } from "@/lib/invite/validate";

export type InviteState = { error?: string; success?: string } | null;

/**
 * Einladung an einen Freund. Die Mail verschickt Supabase Auth mit der
 * Vorlage "Invite user" (supabase/templates/invite.html, im Dashboard unter
 * Authentication -> Email Templates hinterlegt). Name des Einladenden und
 * die persönliche Nachricht gehen als Metadaten mit und stehen in der Vorlage
 * als {{ .Data.invited_by }} und {{ .Data.invite_message }}.
 *
 * Der Link führt über /auth/callback (token_hash, type=invite) auf
 * /update-password: Der Eingeladene vergibt dort sein Passwort und landet
 * danach wie jeder neue Spieler im Onboarding und vor der Freigabe durch den
 * Admin. Eine Einladung verschafft keinen Zugang am Admin vorbei.
 */
export async function inviteFriend(_prev: InviteState, formData: FormData): Promise<InviteState> {
  // Nur wer selbst freigegeben spielt, lädt ein (redirect sonst)
  const { supabase, user, profile } = await requireAccess("/dashboard");

  const input = validateInvite(formData.get("email"), formData.get("message"), user.email);
  if ("error" in input) return { error: input.error };

  /* Obergrenze je Spieler und Tag, und dieselbe Adresse nicht zweimal in
     einer Woche: Der Versand läuft über das Mailkontingent des Projekts, und
     eine Einladung soll keine Werbeschleuder sein. Gezählt wird über die
     eigenen Zeilen (RLS invitations_select_own). */
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { count } = await supabase
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= INVITE_DAILY_LIMIT) {
    return { error: `Du hast heute schon ${INVITE_DAILY_LIMIT} Einladungen verschickt. Morgen geht es weiter.` };
  }
  const week = new Date(Date.now() - 7 * 24 * 3600e3).toISOString();
  const { count: dup } = await supabase
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", user.id)
    .eq("email", input.email)
    .gte("created_at", week);
  if ((dup ?? 0) > 0) {
    return { error: "Diese Adresse hast du in den letzten sieben Tagen schon eingeladen." };
  }

  const origin = (await headers()).get("origin");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { invited_by: profile.displayName, invite_message: input.message ?? "" },
    redirectTo: origin ? `${origin}/auth/callback?next=/update-password` : undefined,
  });

  if (error) {
    console.error("Einladung fehlgeschlagen:", error.status, error.code, error.message);
    if (error.code === "email_exists" || /already been registered|already registered/i.test(error.message)) {
      return { error: "Für diese Adresse gibt es schon ein Konto — dein Freund kann sich direkt anmelden." };
    }
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      return { error: "Gerade werden zu viele Mails verschickt. Bitte versuche es später noch einmal." };
    }
    return { error: "Die Einladung konnte nicht verschickt werden. Bitte versuche es später noch einmal." };
  }

  const { error: logError } = await supabase
    .from("invitations")
    .insert({ inviter_id: user.id, email: input.email, message: input.message });
  if (logError) {
    // Die Mail ist raus; nur der Eintrag fehlt -- nicht dem Nutzer anlasten
    console.error("Einladung verschickt, Eintrag fehlgeschlagen:", logError.message);
  }

  return { success: `Einladung an ${input.email} ist unterwegs.` };
}
