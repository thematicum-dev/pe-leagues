"use client";

import { useActionState } from "react";
import { redeemCode } from "@/app/onboarding/actions";

export default function RedeemCodeForm() {
  const [state, action, pending] = useActionState(redeemCode, null);
  return (
    <form action={action} className="resendform">
      <label>
        Du hast einen Zugangscode? Damit geht es sofort weiter.
        <input type="text" name="code" maxLength={40} placeholder="PEL-XXXX-XXXX" autoComplete="off"
          autoCapitalize="characters" spellCheck={false} required />
      </label>
      {state?.error && <p className="autherror">{state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Prüfe …" : "Code einlösen"}</button>
    </form>
  );
}
