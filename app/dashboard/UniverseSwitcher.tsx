"use client";

import { useActionState, useRef, useState } from "react";
import { setActiveUniverse, UNIVERSE_SWITCH_IDLE } from "./actions";
import type { Universe } from "@/lib/access/context";

export default function UniverseSwitcher({
  universes,
  activeUniverseId,
}: {
  universes: Universe[];
  activeUniverseId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(setActiveUniverse, UNIVERSE_SWITCH_IDLE);

  /* Das Feld war ein unkontrolliertes <select defaultValue>. React schreibt
     defaultValue nur beim Einhängen in das DOM, danach nie wieder -- die
     Auswahl konnte deshalb dauerhaft etwas anderes anzeigen als den
     tatsächlich aktiven Wert vom Server. Jetzt ist der Serverwert die
     Wahrheit; die Vormerkung hält nur, solange die Abgabe läuft, damit das
     Feld beim Tippen sofort reagiert. */
  const [staged, setStaged] = useState<string | null>(null);
  // Die Vormerkung zählt nur, solange die Abgabe läuft. Danach gilt wieder der
  // Serverwert -- bei Erfolg der neue, bei Ablehnung der alte, und daneben
  // steht dann die Meldung, warum.
  const shown = pending && staged ? staged : activeUniverseId;

  if (universes.length < 2) return null;

  return (
    <form ref={formRef} action={formAction} className="universeswitch">
      <label htmlFor="universeId">Universum</label>
      <select
        id="universeId"
        name="universeId"
        value={shown}
        disabled={pending}
        onChange={(e) => {
          setStaged(e.target.value);
          formRef.current?.requestSubmit();
        }}
      >
        {universes.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
            {u.isActive ? "" : " (stillgelegt)"}
          </option>
        ))}
      </select>
      {state.error && (
        <p className="autherror" style={{ flexBasis: "100%", margin: "6px 0 0" }}>
          {state.error}
        </p>
      )}
      <noscript>
        <button type="submit" className="btn-secondary">
          Wechseln
        </button>
      </noscript>
    </form>
  );
}
