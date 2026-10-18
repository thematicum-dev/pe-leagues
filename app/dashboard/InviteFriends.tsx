"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteFriend, type InviteState } from "./invite-actions";
import { INVITE_MESSAGE_MAX } from "@/lib/invite/validate";

export default function InviteFriends() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(inviteFriend, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Nach dem Versand ist das Formular wieder leer für die nächste Einladung
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="dashcard">
      <h2>Freunde einladen</h2>
      <p className="dashsub" style={{ margin: "0 0 14px" }}>
        Dein Freund bekommt eine Einladung per E-Mail mit einem Link zur Registrierung.
      </p>
      <form ref={formRef} action={formAction} className="inviteform">
        <label>
          E-Mail-Adresse
          <input type="email" name="email" autoComplete="off" placeholder="freund@example.com" required />
        </label>
        <label>
          <span>Nachricht <span style={{ opacity: 0.7 }}>(optional)</span></span>
          <textarea name="message" rows={3} maxLength={INVITE_MESSAGE_MAX}
            placeholder="Lust auf eine Partie gegen mich?" />
        </label>
        {state?.error && <p className="autherror">{state.error}</p>}
        {state?.success && <p className="invitesuccess">{state.success}</p>}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Sende …" : "Einladung senden"}
        </button>
      </form>
    </div>
  );
}
