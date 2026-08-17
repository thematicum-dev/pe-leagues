"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  if (state?.success) {
    return (
      <main className="authwrap">
        <div className="authcard">
          <h1>E-Mail unterwegs</h1>
          <p>
            Falls für diese Adresse ein Konto existiert, haben wir dir einen Link zum
            Zurücksetzen des Passworts geschickt.
          </p>
          <div className="authlinks">
            <Link href="/login">Zur Anmeldung</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="authwrap">
      <form className="authcard" action={formAction}>
        <h1>Passwort vergessen</h1>
        <p className="authhint">
          Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein neues
          Passwort setzen kannst.
        </p>
        <label>
          E-Mail-Adresse
          <input type="email" name="email" autoComplete="email" required />
        </label>
        {state?.error && <p className="autherror">{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Sende …" : "Link anfordern"}
        </button>
        <div className="authlinks">
          <Link href="/login">Zurück zur Anmeldung</Link>
        </div>
      </form>
    </main>
  );
}
