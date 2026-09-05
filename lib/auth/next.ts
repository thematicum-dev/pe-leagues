/**
 * Prüft das Ziel, auf das nach der Anmeldung weitergeleitet wird.
 *
 * Zwei Dinge werden abgefangen:
 *
 * 1. Nur eigene, relative Ziele -- sonst ließe sich der Link (aus einer
 *    E-Mail oder als /login?next=...) zu einer Weiterleitung auf eine fremde
 *    Seite umbiegen.
 * 2. Übungs- und Erklärmodus sind nie ein Anmeldeziel. Eine normale Anmeldung
 *    endet immer auf dem Dashboard; von dort ruft man sie bewusst auf.
 */
export function safeNext(raw: string | null | undefined): string {
  const fallback = "/dashboard";
  if (!raw || !/^\/[A-Za-z0-9\-._~/]*$/.test(raw)) return fallback;
  // "//example.com" beginnt zwar mit einem Schrägstrich, ist für den Browser
  // aber eine absolute Adresse mit fremdem Host (protokollrelativ).
  if (raw.startsWith("//")) return fallback;
  for (const mode of ["/practice", "/explain"]) {
    if (raw === mode || raw.startsWith(`${mode}/`)) return fallback;
  }
  return raw;
}
