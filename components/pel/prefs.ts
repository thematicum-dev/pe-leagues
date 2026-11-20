"use client";

import { useCallback, useSyncExternalStore } from "react";

/* Darstellungswünsche, die über Halbjahre, Partien und Seiten hinweg gelten.

   Bis zum 20.11.2026 lag das Theme als useState(true) in jeder Spielansicht.
   Nach jeder Auswertung lädt die Partie ihre Daten neu und hängt die
   Komponente dabei neu ein — der helle Modus hielt also genau ein Halbjahr.
   Jetzt steht die Wahl in localStorage und wird von allen Ansichten
   (Mehrspielerpartie, Übungsmodus, Einführung) geteilt.

   localStorage kann fehlen oder werfen (privater Modus, blockierte
   Site-Daten); dann gilt der Vorgabewert und die Wahl hält nur, solange die
   Seite offen ist. Auf dem Server gilt immer der Vorgabewert, damit Server-
   und Client-Rendering beim Hydrieren übereinstimmen. */

const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    if (v != null) return v;
  } catch { /* kein Speicher verfügbar */ }
  return memory.get(key) ?? null;
}

function write(key: string, value: string) {
  memory.set(key, value);
  try { window.localStorage.setItem(key, value); } catch { /* kein Speicher verfügbar */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key == null || e.key.startsWith("pel-")) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

function usePref(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key) ?? fallback, () => fallback);
  const set = useCallback((v: string) => write(key, v), [key]);
  return [value, set];
}

/** Dunkel (true) oder hell (false); Vorgabe dunkel. */
export function usePelTheme(): [boolean, (dark: boolean) => void] {
  const [v, set] = usePref("pel-theme", "dark");
  const setDark = useCallback((dark: boolean) => set(dark ? "dark" : "light"), [set]);
  return [v !== "light", setDark];
}

/** Ein Schalter, der sich über Neuladen und Halbjahreswechsel hinweg hält; Vorgabe aus. */
export function usePersistentFlag(key: string): [boolean, (on: boolean) => void] {
  const [v, set] = usePref(key, "0");
  const setOn = useCallback((on: boolean) => set(on ? "1" : "0"), [set]);
  return [v === "1", setOn];
}
