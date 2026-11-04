/* Wer von den Mitspielern im laufenden Halbjahr schon abgegeben hat. Kommt
   aus season_submission_roster() (Migration 20261104090000) und steht in der
   Warteleiste nach der eigenen Abgabe: "✓ Anna · ✓ Du · ○ Bert".

   Die Umwandlung steht hier statt in der Komponente, weil Seite (Server) und
   Spielansicht (Browser, beim Nachfassen) dieselbe Antwort lesen. Fehlt die
   Funktion auf dem Server noch oder antwortet sie nicht, ist die Liste leer;
   die Warteleiste zeigt dann wie bisher nur die Zahl. */
export interface SubmissionRosterEntry {
  slot: number;
  name: string;
  isMe: boolean;
  submitted: boolean;
}

export function rosterFromRows(rows: unknown): SubmissionRosterEntry[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      slot: Number(r.slot),
      name: typeof r.display_name === "string" && r.display_name.trim() ? r.display_name : "Spieler",
      isMe: r.is_me === true,
      submitted: r.submitted === true,
    }))
    .filter((r) => Number.isFinite(r.slot))
    .sort((a, b) => a.slot - b.slot);
}
