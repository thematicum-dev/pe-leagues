"use client";

import { useState, useTransition } from "react";
import { setUserAccessAction } from "./actions";

export interface UniverseOption {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
}

export default function UserAccessControls({
  profileId,
  status,
  grantedUniverseIds,
  universes,
  note,
}: {
  profileId: string;
  status: string;
  grantedUniverseIds: string[];
  universes: UniverseOption[];
  note: string | null;
}) {
  const [selected, setSelected] = useState<string[]>(grantedUniverseIds);
  const [noteText, setNoteText] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  function submit(next: "approved" | "rejected") {
    if (next === "approved" && selected.length === 0) {
      setError("Bitte mindestens ein Universum auswählen — ohne Universum kann niemand spielen.");
      return;
    }
    if (next === "rejected") {
      const ok = window.confirm(
        "Zugang wirklich sperren? Der Nutzer verliert alle Universen und kann sich nicht mehr anmelden.",
      );
      if (!ok) return;
    }
    setError(null);
    setDone(null);
    startTransition(async () => {
      const res = await setUserAccessAction(profileId, next, selected, noteText);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (next === "rejected") setSelected([]);
      setDone(next === "approved" ? "Freigegeben." : "Gesperrt.");
    });
  }

  return (
    <div className="accessbox">
      <div className="accessuniverses">
        {universes.length === 0 && (
          <span className="dashsub">Noch kein Universum angelegt.</span>
        )}
        {universes.map((u) => (
          <label key={u.id} className="accesscheck">
            <input
              type="checkbox"
              checked={selected.includes(u.id)}
              onChange={() => toggle(u.id)}
              disabled={pending}
            />
            {u.name}
            {u.is_active ? "" : " (stillgelegt)"}
          </label>
        ))}
      </div>
      <input
        type="text"
        className="accessnote"
        value={noteText}
        maxLength={300}
        placeholder="Notiz an den Nutzer (optional)"
        onChange={(e) => setNoteText(e.target.value)}
        disabled={pending}
      />
      <div className="dashform">
        <button className="btn-primary" onClick={() => submit("approved")} disabled={pending}>
          {pending ? "Speichere …" : status === "approved" ? "Zuteilung speichern" : "Freigeben"}
        </button>
        <button className="btn-secondary" onClick={() => submit("rejected")} disabled={pending}>
          Sperren
        </button>
      </div>
      {error && <p className="autherror" style={{ margin: "6px 0 0" }}>{error}</p>}
      {done && !error && <p className="dashsub">{done}</p>}
    </div>
  );
}
