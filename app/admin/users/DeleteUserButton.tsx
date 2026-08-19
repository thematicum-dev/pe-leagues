"use client";

import { useState, useTransition } from "react";
import { deleteUserAction } from "./actions";

export default function DeleteUserButton({ userId, displayName }: { userId: string; displayName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const ok = window.confirm(
      `${displayName} (Account) wirklich löschen? Das entfernt den Login und das Profil unwiderruflich. Partien, an denen dieser Nutzer teilnahm, bleiben für die übrigen Mitspieler erhalten.`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteUserAction(userId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <button className="btn-secondary" onClick={handleClick} disabled={pending}>
        {pending ? "Lösche …" : "Löschen"}
      </button>
      {error && <p className="autherror" style={{ margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
