"use client";

import { useActionState } from "react";
import { setDisplayName } from "./actions";

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState(setDisplayName, null);

  return (
    <main className="authwrap">
      <form className="authcard" action={formAction}>
        <h1>Wähle deinen Anzeigenamen</h1>
        <p className="authhint">
          Unter diesem Namen erscheint dein Fonds in der Rangliste. Er muss eindeutig sein, 3–24
          Zeichen lang, und lässt sich später jederzeit ändern.
        </p>
        <label>
          Anzeigename
          <input type="text" name="displayName" minLength={3} maxLength={24} required autoFocus />
        </label>
        {state?.error && <p className="autherror">{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Speichere …" : "Weiter"}
        </button>
      </form>
    </main>
  );
}
