"use client";

import { useActionState } from "react";
import { updatePassword } from "./actions";

export default function UpdatePasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, null);

  return (
    <main className="authwrap">
      <form className="authcard" action={formAction}>
        <h1>Neues Passwort setzen</h1>
        <label>
          Neues Passwort
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          Neues Passwort wiederholen
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
          {pending ? "Speichere …" : "Passwort speichern"}
        </button>
      </form>
    </main>
  );
}
