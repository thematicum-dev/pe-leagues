"use client";

import { useActionState, useState, useTransition } from "react";
import { createCodeAction, setCodeActiveAction } from "./actions";

export function CreateCodeForm({ universes }: { universes: { id: string; name: string; is_active: boolean }[] }) {
  const [state, action, pending] = useActionState(createCodeAction, null);
  return (
    <>
      <form action={action} className="dashform">
        <label>
          Bezeichnung (Kunde, Kurs, Anlass)
          <input type="text" name="label" minLength={2} maxLength={80} required placeholder="z. B. HSG Corporate Finance HS26" />
        </label>
        <label>
          Universum
          <select name="universeId" required defaultValue="">
            <option value="" disabled>wählen …</option>
            {universes.map((u) => <option key={u.id} value={u.id}>{u.name}{u.is_active ? "" : " (stillgelegt)"}</option>)}
          </select>
        </label>
        <label>
          Höchstzahl Einlösungen (leer = unbegrenzt)
          <input type="number" name="maxUses" min={1} step={1} />
        </label>
        <label>
          Gültig bis (leer = unbefristet)
          <input type="date" name="expiresAt" />
        </label>
        <label>
          Eigener Code (leer = erzeugen)
          <input type="text" name="code" maxLength={32} placeholder="PEL-XXXX-XXXX" autoComplete="off" />
        </label>
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Lege an …" : "Zugangscode anlegen"}</button>
      </form>
      {state?.error && <p className="autherror">{state.error}</p>}
      {state?.code && (
        <p className="notice">
          Angelegt: <span className="codebox">{state.code}</span> — weitergeben, eingelöst wird er beim Onboarding
          oder später im Zugangsbildschirm.
        </p>
      )}
    </>
  );
}

export function CodeActiveButton({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button type="button" className="btn-quiet" disabled={pending}
        onClick={() => start(async () => { const r = await setCodeActiveAction(id, !active); setError(r.error); })}>
        {pending ? "…" : active ? "Deaktivieren" : "Aktivieren"}
      </button>
      {error && <div className="autherror">{error}</div>}
    </>
  );
}
