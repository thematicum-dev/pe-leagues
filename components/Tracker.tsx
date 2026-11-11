"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track, type TrackEvent } from "@/lib/analytics/track";

/* Seitenaufrufe aufzeichnen. Hängt einmal im Root-Layout; jede Navigation
   innerhalb der App ändert den Pfad und meldet sich damit selbst.

   Öffentliche Seiten (Startseite, Anmeldung, Rechtstexte) werden nicht
   gemeldet: Ohne Sitzung sendet track() ohnehin nichts, und wer angemeldet
   das Impressum liest, tut nichts, was das Produkt verbessern hilft. */
const SPECIFIC: [RegExp, TrackEvent][] = [
  [/^\/practice/, "practice_start"],
  [/^\/explain/, "explain_start"],
  [/^\/season\//, "season_open"],
  [/^\/leaderboard/, "leaderboard_view"],
  [/^\/profile/, "profile_view"],
];
const TRACKED = /^\/(dashboard|practice|explain|season|leaderboard|profile|access|onboarding)(\/|$)/;

export default function Tracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || !TRACKED.test(path)) return;
    track("page_view", {}, path);
    const hit = SPECIFIC.find(([re]) => re.test(path));
    if (hit) track(hit[1], {}, path);
  }, [path]);
  return null;
}
