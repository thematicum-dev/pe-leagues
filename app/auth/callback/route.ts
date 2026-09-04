import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/next";

// Ziel des Bestätigungslinks aus E-Mails (Registrierung, Passwort-vergessen).
//
// Warum das hier mehrere Wege probiert: Ein Bestätigungslink gilt genau
// einmal. Manche Mail-Programme (Apple Mail, Gmail, Firmen-Spamfilter) öffnen
// Links schon beim Anzeigen der Nachricht im Hintergrund und verbrauchen ihn
// damit; wird er danach wirklich angeklickt, ist er "abgelaufen" -- obwohl
// die E-Mail-Adresse in Supabase längst bestätigt ist. Genauso schlägt der
// Code-Tausch fehl, wenn die Mail auf einem anderen Gerät oder in einem
// In-App-Browser geöffnet wird als dem, auf dem die Registrierung lief: der
// dafür nötige PKCE-Cookie liegt dann woanders.
//
// Deshalb: erst OTP, dann Code, dann die Frage, ob ohnehin schon eine Session
// besteht -- und erst wenn all das nichts ergibt, die Hilfeseite.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const failure = searchParams.get("error_code") ?? searchParams.get("error");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();

  if (!failure && tokenHash && type) {
    // Weg über den Einmal-Token: braucht keinen Cookie vom Registriergerät
    // und funktioniert deshalb auch, wenn die E-Mail woanders geöffnet wird.
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (!failure && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Doppelt geöffneter Link oder verbrauchte Vorschau: Wenn schon eine
  // gültige Session da ist, ist alles in Ordnung -- dann einfach weiter,
  // statt eine Fehlermeldung zu zeigen.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const help = new URL(`${origin}/confirm-email`);
  help.searchParams.set("next", next);
  if (failure) {
    help.searchParams.set("reason", failure);
  }
  return NextResponse.redirect(help);
}
