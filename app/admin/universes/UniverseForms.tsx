"use client";

import { useActionState } from "react";
import { createUniverseAction, updateUniverseAction } from "./actions";

export interface AdminUniverseRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  member_count: number;
  season_count: number;
}

export function CreateUniverseForm() {
  const [state, formAction, pending] = useActionState(createUniverseAction, null);

  return (
    <form action={formAction} className="universeform">
      <label>
        Schlüssel (kurz, klein geschrieben)
        <input type="text" name="key" placeholder="z. B. beta" required />
      </label>
      <label>
        Name
        <input type="text" name="name" placeholder="z. B. Beta-Universum" required />
      </label>
      <label>
        Beschreibung (optional)
        <input type="text" name="description" placeholder="Wofür ist dieses Universum da?" />
      </label>
      {state?.error && <p className="autherror">{state.error}</p>}
      {state?.success && <p className="dashsub">Universum angelegt.</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Lege an …" : "Universum anlegen"}
      </button>
    </form>
  );
}

export function EditUniverseForm({ universe }: { universe: AdminUniverseRow }) {
  const [state, formAction, pending] = useActionState(updateUniverseAction, null);

  return (
    <form action={formAction} className="universeform">
      <input type="hidden" name="universeId" value={universe.id} />
      <label>
        Name
        <input type="text" name="name" defaultValue={universe.name} required />
      </label>
      <label>
        Beschreibung
        <input type="text" name="description" defaultValue={universe.description ?? ""} />
      </label>
      <label className="accesscheck">
        <input type="checkbox" name="isActive" defaultChecked={universe.is_active} />
        Aktiv (neue Partien möglich)
      </label>
      {state?.error && <p className="autherror">{state.error}</p>}
      {state?.success && <p className="dashsub">Gespeichert.</p>}
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? "Speichere …" : "Speichern"}
      </button>
    </form>
  );
}
