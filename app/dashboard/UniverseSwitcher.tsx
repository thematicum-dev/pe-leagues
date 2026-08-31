"use client";

import { useRef } from "react";
import { setActiveUniverse } from "./actions";
import type { Universe } from "@/lib/access/context";

export default function UniverseSwitcher({
  universes,
  activeUniverseId,
}: {
  universes: Universe[];
  activeUniverseId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  if (universes.length < 2) return null;

  return (
    <form ref={formRef} action={setActiveUniverse} className="universeswitch">
      <label htmlFor="universeId">Universum</label>
      <select
        id="universeId"
        name="universeId"
        defaultValue={activeUniverseId}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {universes.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
            {u.isActive ? "" : " (stillgelegt)"}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="btn-secondary">
          Wechseln
        </button>
      </noscript>
    </form>
  );
}
