/**
 * Zustand und Ruhewert des Universumswechsels.
 *
 * Steht bewusst nicht in actions.ts: Eine Datei mit "use server" darf
 * ausschließlich async-Funktionen exportieren. Ein Objekt daneben lässt
 * Next.js beim Ausführen einer Server Action auf dieser Seite abbrechen
 * ("A 'use server' file can only export async functions, found object") --
 * und zwar bei jeder Aktion des Dashboards, nicht nur beim Wechsel selbst.
 */
export interface UniverseSwitchState {
  error: string | null;
}

export const UNIVERSE_SWITCH_IDLE: UniverseSwitchState = { error: null };
