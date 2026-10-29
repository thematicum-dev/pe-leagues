"use client";

import { useState, useTransition } from "react";
import { advanceSeasonAction } from "./actions";

const ERROR_LABEL: Record<string, string> = {
  evaluation_running: "Das Halbjahr wird gerade ausgewertet.",
  season_not_running: "Die Partie läuft nicht (mehr).",
};

export default function AdvanceSeasonButton({
  seasonId,
  halfYear,
  missingCount,
}: {
  seasonId: string;
  halfYear: number;
  missingCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClick() {
    const ok = window.confirm(
      missingCount > 0
        ? `Halbjahr ${halfYear} jetzt auswerten? ${missingCount === 1 ? "Ein Spieler hat" : `${missingCount} Spieler haben`} noch nicht abgegeben — sie spielen dieses Halbjahr ohne Gebote und Maßnahmen, wie nach Ablauf der Frist.`
        : `Halbjahr ${halfYear} jetzt auswerten?`,
    );
    if (!ok) return;
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await advanceSeasonAction(seasonId);
      if (res.error) setError(ERROR_LABEL[res.error] ?? res.error);
      else setDone(true);
    });
  }

  return (
    <div>
      <button className="btn-secondary" onClick={handleClick} disabled={pending}>
        {pending ? "Stoße an …" : "Nächstes HJ"}
      </button>
      {done && <p className="dashsub" style={{ margin: "6px 0 0" }}>Auswertung angestoßen — gleich neu laden.</p>}
      {error && <p className="autherror" style={{ margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
