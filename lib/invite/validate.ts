/**
 * Eingaben einer Einladung prüfen, bevor irgendetwas verschickt wird.
 *
 * Steht außerhalb der Server Action, damit es sich ohne Supabase testen
 * lässt. Die Datenbank prüft Format und Länge noch einmal
 * (invitations_email_format, invitations_message_length) -- das hier ist die
 * freundliche Meldung davor, nicht die Schranke.
 */
export const INVITE_MESSAGE_MAX = 500;
/** Einladungen je Spieler in 24 Stunden. */
export const INVITE_DAILY_LIMIT = 5;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type InviteInput =
  | { ok: true; email: string; message: string | null }
  | { ok: false; error: string };

export function validateInvite(rawEmail: unknown, rawMessage: unknown, ownEmail?: string | null): InviteInput {
  const email = String(rawEmail ?? "").trim().toLowerCase();
  // Zeilenumbrüche bleiben erhalten, nur außen wird gekürzt
  const message = String(rawMessage ?? "").trim();

  if (!email) return { ok: false, error: "Bitte eine E-Mail-Adresse eintragen." };
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Das sieht nicht nach einer gültigen E-Mail-Adresse aus." };
  }
  if (ownEmail && email === ownEmail.trim().toLowerCase()) {
    return { ok: false, error: "Das ist deine eigene Adresse." };
  }
  if (message.length > INVITE_MESSAGE_MAX) {
    return { ok: false, error: `Die Nachricht ist zu lang (höchstens ${INVITE_MESSAGE_MAX} Zeichen).` };
  }
  return { ok: true, email, message: message || null };
}
