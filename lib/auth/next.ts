/**
 * Prüft das Ziel, auf das nach der Anmeldung weitergeleitet wird.
 *
 * Zwei Dinge werden abgefangen:
 *
 * 1. Nur eigene, relative Ziele -- sonst ließe sich der Link (aus einer
 *    E-Mail oder als /login?next=...) zu einer Weiterleitung auf eine fremde
 *    Seite umbiegen.
 * 2. Der Übungsmodus ist nie ein Anmeldeziel. Eine normale Anmeldung endet
 *    immer auf dem Dashboard; von dort ruft man den Übungsmodus bewusst auf.
 */
export function safeNext(raw: string | null | undefined): string {
  const fallback = "/dashboard";
  if (!raw || !/^\/[A-Za-z0-9\-._~/]*$/.test(raw)) return fallback;
  // "//example.com" beginnt zwar mit einem Schrägstrich, ist für den Browser
  // aber eine absolute Adresse mit fremdem Host (protokollrelativ).
  if (raw.startsWith("//")) return fallback;
  if (raw === "/practice" || raw.startsWith("/practice/")) return fallback;
  return raw;
}
