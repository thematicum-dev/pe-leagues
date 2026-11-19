"use client";

import { useActionState, useState, useTransition } from "react";
import { changeDisplayName, deleteMyAccount, setAnalyticsOptOut } from "./actions";

export default function ProfileSettings({
  displayName, email, analyticsOptOut, canDelete,
}: { displayName: string; email: string; analyticsOptOut: boolean; canDelete: boolean }) {
  const [nameState, nameAction, namePending] = useActionState(changeDisplayName, null);
  const [delState, delAction, delPending] = useActionState(deleteMyAccount, null);
  const [optOut, setOptOut] = useState(analyticsOptOut);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);

  function toggle(next: boolean) {
    setOptOut(next);
    setPrefError(null);
    startTransition(async () => {
      const { error } = await setAnalyticsOptOut(next);
      if (error) { setOptOut(!next); setPrefError(error); }
    });
  }

  return (
    <>
      <div className="dashcard">
        <h2>Konto</h2>
        <div className="dashsub">Angemeldet als {email}</div>
        <form action={nameAction} className="dashform">
          <label>
            Anzeigename
            <input type="text" name="displayName" defaultValue={displayName} minLength={3} maxLength={24} required />
          </label>
          <button type="submit" className="btn-secondary" disabled={namePending}>
            {namePending ? "Speichere …" : "Anzeigenamen ändern"}
          </button>
        </form>
        {nameState?.error && <p className="autherror">{nameState.error}</p>}
        {nameState?.success && <p className="dashsub">Gespeichert. In Ranglisten erscheinst du ab sofort unter dem neuen Namen.</p>}
      </div>

      <div className="dashcard">
        <h2>Datenschutz</h2>
        <label className="checkrow">
          <input type="checkbox" checked={!optOut} disabled={pending} onChange={(e) => toggle(!e.target.checked)} />
          <span>
            Nutzungsauswertung erlauben
            <span className="dashsub" style={{ display: "block" }}>
              Wir zeichnen auf, welche Bereiche der App genutzt werden (z. B. Übungsmodus geöffnet), um
              das Spiel zu verbessern — in unserer eigenen Datenbank, ohne Drittanbieter und ohne
              Cookies. Schaltest du das ab, löschen wir die bisher aufgezeichneten Ereignisse.
            </span>
          </span>
        </label>
        {prefError && <p className="autherror">{prefError}</p>}
        <p className="dashsub">
          Einzelheiten stehen in der <a href="/datenschutz">Datenschutzerklärung</a>.
        </p>
      </div>

      <div className="dashcard">
        <h2>Konto löschen</h2>
        <p className="dashsub">
          Löscht dein Konto, dein Profil, deine Abgaben und deine Plätze in allen Partien — endgültig.
          Partien, in denen du der einzige Mensch warst, verschwinden mit; laufende Partien mit
          Mitspielern gehen ohne dich weiter.
        </p>
        {!canDelete ? (
          <p className="dashsub">Der Haupt-Administrator kann hier nicht gelöscht werden.</p>
        ) : !showDelete ? (
          <button type="button" className="btn-danger" onClick={() => setShowDelete(true)}>
            Konto löschen …
          </button>
        ) : (
          <form action={delAction} className="dashform">
            <label>
              Tippe LÖSCHEN zur Bestätigung
              <input type="text" name="confirm" autoComplete="off" required />
            </label>
            <button type="submit" className="btn-danger" disabled={delPending}>
              {delPending ? "Lösche …" : "Endgültig löschen"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowDelete(false)} disabled={delPending}>
              Abbrechen
            </button>
          </form>
        )}
        {delState?.error && <p className="autherror">{delState.error}</p>}
      </div>
    </>
  );
}
