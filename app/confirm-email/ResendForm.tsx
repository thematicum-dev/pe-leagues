"use client";

import { useActionState } from "react";
import { resendConfirmation } from "@/app/auth/actions";

export default function ResendForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState(resendConfirmation, null);

  if (state?.success) {
    return (
      <p className="authhint">
        Wenn für diese Adresse ein unbestätigtes Konto existiert, ist der neue Link unterwegs.
        Bitte öffne ihn direkt in deinem Browser.
      </p>
    );
  }

  return (
    <form action={formAction} className="resendform">
      <label>
        E-Mail-Adresse
        <input type="email" name="email" autoComplete="email" defaultValue={defaultEmail} required />
      </label>
      {state?.error && <p className="autherror">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "Sende …" : "Neuen Bestätigungslink schicken"}
      </button>
    </form>
  );
}
