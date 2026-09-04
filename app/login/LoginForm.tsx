"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "./actions";
import Logo from "@/components/Logo";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <main className="authwrap">
      <form className="authcard" action={formAction}>
        <Logo />
        <p className="tagline">Beweise deine PE Investment Skills - gegen echte Gegner</p>
        <h1>Anmelden</h1>
        <input type="hidden" name="next" value={next} />
        <label>
          E-Mail-Adresse
          <input type="email" name="email" autoComplete="email" required />
        </label>
        <label>
          Passwort
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        {state?.error && <p className="autherror">{state.error}</p>}
        {state?.needsConfirmation && (
          <div className="authlinks">
            <Link href={`/confirm-email?email=${encodeURIComponent(state.needsConfirmation)}`}>
              Neuen Bestätigungslink anfordern
            </Link>
          </div>
        )}
        <button type="submit" disabled={pending}>
          {pending ? "Melde an …" : "Anmelden"}
        </button>
        <div className="authlinks">
          <Link href="/forgot-password">Passwort vergessen?</Link>
          <Link href="/signup">Neu hier? Registrieren</Link>
        </div>
      </form>
    </main>
  );
}
