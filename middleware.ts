import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Auf allen Pfaden außer statischen Assets ausführen, damit die
     * Supabase-Session zuverlässig erneuert wird.
     *
     * Ausgenommen zusätzlich api/time: Die Route liefert nichts als die
     * Uhrzeit des Servers und wird vom Countdown benutzt, um die Uhr des
     * Browsers abzugleichen. Die Middleware würde dort bei jedem Aufruf
     * getUser() gegen den Auth-Server laufen lassen — das hat mit einer Uhr
     * nichts zu tun und verfälscht obendrein die Messung: Die Schätzung des
     * Hinwegs geht von der halben Umlaufzeit aus, und eine Verarbeitung auf
     * dem Server, die vor dem Ablesen der Uhr passiert, ist eben kein Hinweg.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/time|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
