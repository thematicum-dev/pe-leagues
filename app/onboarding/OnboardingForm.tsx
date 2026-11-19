"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestAccess } from "./actions";

export default function OnboardingForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, formAction, pending] = useActionState(requestAccess, null);

  return (
    <main className="authwrap">
      <form className="authcard" action={formAction}>
        <h1>Dein Fonds braucht einen Namen</h1>
        <p className="authhint">
          Unter deinem Anzeigenamen erscheinst du in Lobbys und in der Rangliste. Er muss eindeutig sein
          und 3–24 Zeichen lang.
        </p>
        <label>
          Anzeigename
          <input type="text" name="displayName" minLength={3} maxLength={24} required autoFocus />
        </label>
        <label>
          Zugangscode (falls du einen bekommen hast)
          <input type="text" name="code" maxLength={40} defaultValue={initialCode} placeholder="PEL-XXXX-XXXX"
            autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </label>
        <p className="authhint">
          Mit Zugangscode spielst du sofort. Ohne Code geht deine Anfrage an einen Administrator, der
          jeden Zugang einzeln freigibt.
        </p>
        <label>
          Nachricht an den Administrator (optional, nur ohne Code)
          <input
            type="text"
            name="message"
            maxLength={500}
            placeholder="z. B. wer dich eingeladen hat"
          />
        </label>
        <label className="checkrow">
          <input type="checkbox" name="terms" required />
          <span>
            Ich akzeptiere die <Link href="/agb" target="_blank">Nutzungsbedingungen</Link> und habe die{" "}
            <Link href="/datenschutz" target="_blank">Datenschutzhinweise</Link> gelesen.
          </span>
        </label>
        {state?.error && <p className="autherror">{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Einen Moment …" : "Weiter"}
        </button>
      </form>
    </main>
  );
}
