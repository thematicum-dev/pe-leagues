/* Zahlen- und Datumsformate der Seiten außerhalb des Spiels (Profil,
   Admin-Übersicht). Das Spiel selbst formatiert über lib/engine/engine.ts. */
export const de = (v: number, digits: number) => Number(v).toFixed(digits).replace(".", ",");
export const fmtScore = (v: number | null | undefined) => (v == null ? "—" : de(Number(v), 2));
export const fmtMultiple = (v: number | null | undefined) => (v == null ? "—" : de(Number(v), 2) + "×");
export const fmtIrr = (v: number | null | undefined) => (v == null ? "—" : de(Number(v) * 100, 1) + " %");
export const fmtPct = (v: number | null | undefined, digits = 0) => (v == null ? "—" : de(Number(v) * 100, digits) + " %");
export const fmtInt = (v: number | null | undefined) => (v == null ? "—" : Math.round(Number(v)).toLocaleString("de-DE"));
export const fmtDate = (v: string | null | undefined) =>
  v == null ? "—" : new Date(v).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

/* "vor 3 Tagen" — für "zuletzt aktiv". `now` als Parameter, damit es sich
   testen lässt und Server und Client dasselbe rechnen. */
export function fmtAgo(v: string | null | undefined, now: number = Date.now()): string {
  if (v == null) return "nie";
  const s = Math.max(0, (now - new Date(v).getTime()) / 1000);
  if (s < 90) return "gerade eben";
  if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
  if (s < 36 * 3600) return `vor ${Math.round(s / 3600)} Std.`;
  const d = Math.round(s / 86400);
  if (d < 60) return `vor ${d} Tagen`;
  return `vor ${Math.round(d / 30)} Monaten`;
}
