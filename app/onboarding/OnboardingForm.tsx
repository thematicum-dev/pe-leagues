"use client";

import { useActionState } from "react";
import { requestAccess } from "./actions";

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState(requestAccess, null);

  return (
    <main className="authwrap">
      <form className="authcard" action={formAction}>
        <h1>Zugang beantragen</h1>
        <p className="authhint">
          PE Leagues ist ein geschlossener Kreis: Ein Administrator gibt jeden Zugang einzeln
          frei. Wähle zuerst deinen Anzeigenamen — unter ihm erscheint dein Fonds später in der
          Rangliste. Er muss eindeutig sein und 3–24 Zeichen lang.
        </p>
        <label>
          Anzeigename
          <input type="text" name="displayName" minLength={3} maxLength={24} required autoFocus />
        </label>
        <label>
          Nachricht an den Administrator (optional)
          <input
            type="text"
            name="message"
            maxLength={500}
            placeholder="z. B. wer dich eingeladen hat"
          />
        </label>
        {state?.error && <p className="autherror">{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Sende Anfrage …" : "Zugang beantragen"}
        </button>
      </form>
    </main>
  );
}
