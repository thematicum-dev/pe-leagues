"use client";

import { useState, useTransition } from "react";
import { resetSeasonAction } from "./actions";

export default function ResetSeasonButton({ seasonId }: { seasonId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const ok = window.confirm(
      "Diese Partie wirklich zurücksetzen? Spielstand, Abgaben, Ergebnisse und alle Fondsplätze werden unwiderruflich gelöscht — die Partie startet danach als leere Lobby.",
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await resetSeasonAction(seasonId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <button className="btn-secondary" onClick={handleClick} disabled={pending}>
        {pending ? "Setze zurück …" : "Zurücksetzen"}
      </button>
      {error && <p className="autherror" style={{ margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
