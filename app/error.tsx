"use client";

import { useEffect } from "react";

/* Fängt Fehler beim Rendern einer Seite ab. Ohne diese Datei zeigt Next eine
   leere weiße Seite mit einem englischen Satz — mitten in einer Partie sieht
   das aus, als wäre der Spielstand weg. Er ist es nicht: Der Stand liegt in
   der Datenbank, die Seite muss nur neu geladen werden. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="authwrap">
      <div className="authcard">
        <h1>Das hat nicht geklappt</h1>
        <p>
          Beim Laden dieser Seite ist ein Fehler aufgetreten. Dein Spielstand ist davon nicht betroffen — er
          liegt sicher auf dem Server.
        </p>
        {error.digest && <p className="authhint">Fehlerkennung für den Support: {error.digest}</p>}
        <button type="button" onClick={() => reset()}>Erneut versuchen</button>
        <div className="authlinks">
          <a href="/dashboard">Zum Dashboard</a>
        </div>
      </div>
    </main>
  );
}
