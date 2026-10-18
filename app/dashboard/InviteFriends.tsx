"use client";

import { useEffect, useRef, useState } from "react";

// Einladen heißt hier: den Anmeldelink weitergeben. Wer sich darüber
// registriert, durchläuft wie jeder neue Spieler Onboarding und Freigabe.
export default function InviteFriends({ signupUrl }: { signupUrl: string }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true);
    } catch {
      // Ohne Zugriff auf die Zwischenablage (alte Browser, unsicherer
      // Kontext) wenigstens markieren, damit man selbst kopieren kann
      inputRef.current?.select();
    }
  }

  return (
    <div className="dashcard">
      {/* Aufbau wie die Karte "Offene Partien": Titel, grauer Hinweis, Aktion */}
      <h2>Freunde einladen</h2>
      <p className="dashsub">
        Du willst Freunde einladen, um mit ihnen eine Runde zu spielen? Sende ihnen folgenden Link
        zur Anmeldung:
      </p>
      <div className="invitelink">
        <input ref={inputRef} type="text" readOnly value={signupUrl} aria-label="Anmeldelink"
          onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn-primary" onClick={copy}>
          {copied ? "Kopiert ✓" : "Link kopieren"}
        </button>
      </div>
    </div>
  );
}
