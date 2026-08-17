import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// In Server Components darf kein Cookie geschrieben werden (Next.js wirft dann
// einen Fehler). Das ist unkritisch, weil die Middleware die Session bei jedem
// Request ohnehin schon aktualisiert und die Cookies neu setzt.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Aufruf aus einer Server Component ohne Response — ignorieren.
        }
      },
    },
  });
}
