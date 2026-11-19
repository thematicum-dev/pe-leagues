"use client";

import { createClient } from "@/lib/supabase/client";

/* Nutzungsereignis aufzeichnen (track_event() in
   supabase/migrations/20261119100000_activity_tracking.sql).

   Drei Regeln, die hier und nicht bei jedem Aufrufer stehen:

   1. Messung stört nie. Kein await beim Aufrufer nötig, kein Fehler dringt
      nach außen — auch nicht, wenn Supabase gar nicht konfiguriert ist
      (lokale Entwicklung, der Harness unter .claude/skills/live).
   2. Nur angemeldet. Ohne Sitzung wird nichts gesendet; die Funktion ist für
      anon ohnehin gesperrt, der Aufruf wäre nur ein 401 im Netzwerk-Tab.
   3. Namen folgen einem festen Muster (kleinbuchstaben_mit_unterstrich),
      Eigenschaften bleiben klein und enthalten nie Freitext eines Nutzers. */

export type TrackEvent =
  | "page_view"
  | "practice_start"
  | "explain_start"
  | "season_open"
  | "turn_submit"
  | "season_finished_view"
  | "leaderboard_view"
  | "profile_view"
  | "invite_copy";

type Props = Record<string, string | number | boolean | null>;

let lastKey = "";
let lastAt = 0;

export function track(event: TrackEvent, props: Props = {}, path?: string): void {
  try {
    if (typeof window === "undefined") return;
    const p = path ?? window.location.pathname;
    // Doppelte Meldungen desselben Ereignisses in kurzer Folge (StrictMode,
    // erneutes Einhängen nach router.refresh()) zählen einmal
    const key = event + "|" + p + "|" + JSON.stringify(props);
    const now = Date.now();
    if (key === lastKey && now - lastAt < 2000) return;
    lastKey = key;
    lastAt = now;

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      return supabase.rpc("track_event", { p_event: event, p_props: props, p_path: normalizePath(p) });
    }).then(() => {}, () => {});
  } catch {
    /* siehe Regel 1 */
  }
}

/* Partie-IDs gehören nicht in die Auswertung der Seitenaufrufe: /season/<uuid>
   wäre je Partie eine eigene "Seite". */
export function normalizePath(path: string): string {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .slice(0, 200);
}
