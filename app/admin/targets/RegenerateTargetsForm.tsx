"use client";

import { useActionState } from "react";
import { regenerateTargetsAction, type RegenerateResult } from "./actions";

const initialState: RegenerateResult = { error: null, inserted: 0, requested: 0, warnings: [] };

export default function RegenerateTargetsForm() {
  const [state, formAction, pending] = useActionState(regenerateTargetsAction, initialState);

  return (
    <form
      action={formAction}
      className="dashform"
      onSubmit={(e) => {
        if (!window.confirm("Neue Zielunternehmen generieren? Das kann je nach Anzahl einige Minuten dauern und ersetzt den bisherigen Pool erst, sobald die neue Liste vollständig da ist.")) {
          e.preventDefault();
        }
      }}
    >
      <label>
        Anzahl
        <input type="number" name="count" defaultValue={200} min={20} max={1000} step={20} className="bidinput" style={{ width: 90 }} />
      </label>
      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Generiere …" : "Neu generieren"}
      </button>
      {state.error && <p className="autherror" style={{ width: "100%" }}>{state.error}</p>}
      {!state.error && state.inserted > 0 && (
        <p className="authhint" style={{ width: "100%" }}>
          {state.inserted} von {state.requested} angeforderten Zielunternehmen erzeugt und aktiv gesetzt.
        </p>
      )}
      {state.warnings.length > 0 && (
        <p className="authhint" style={{ width: "100%" }}>
          Hinweise: {state.warnings.join(" · ")}
        </p>
      )}
    </form>
  );
}
