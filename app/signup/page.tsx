"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "./actions";
import Logo from "@/components/Logo";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, null);

  if (state?.success) {
    return (
      <main className="authwrap">
        <div className="authcard">
          <h1>Fast geschafft</h1>
          <p>
            Wir haben dir eine E-Mail geschickt. Bitte öffne den Bestätigungslink darin, um dein
            Konto zu aktivieren.
          </p>
          <p className="authhint">
            Zeigt der Link &bdquo;abgelaufen&ldquo; oder &bdquo;ungültig&ldquo;? Das passiert, wenn dein Mail-Programm
            ihn schon beim Anzeigen der Nachricht öffnet. Dein Konto ist dann trotzdem bestätigt
            — melde dich einfach ganz normal an.
          </p>
          <div className="authlinks">
            <Link href="/login">Zur Anmeldung</Link>
            <Link href="/confirm-email">Link kam nicht an?</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="authwrap">
      <form className="authcard" action={formAction}>
        <Logo />
        <h1>Konto erstellen</h1>
        <label>
          E-Mail-Adresse
          <input type="email" name="email" autoComplete="email" required />
        </label>
        <label>
          Passwort
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          Passwort wiederholen
          <input
            type="password"
            name="passwordConfirm"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {state?.error && <p className="autherror">{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Erstelle Konto …" : "Registrieren"}
        </button>
        <div className="authlinks">
          <Link href="/login">Schon registriert? Anmelden</Link>
        </div>
        <div className="authlinks">
          <Link href="/practice">Ohne Anmeldung: Übungsmodus</Link>
        </div>
      </form>
    </main>
  );
}
