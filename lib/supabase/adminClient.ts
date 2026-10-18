import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

// Ausschließlich für Server Actions/Route Handlers innerhalb von app/admin/,
// niemals für Client Components importieren: der Service-Role-Key umgeht
// RLS vollständig. Jeder Aufruf MUSS vorher requireAdmin() (siehe
// app/admin/adminAuth.ts) durchlaufen haben, bevor dieser Client für
// irgendetwas benutzt wird -- genau dasselbe Vertrauensmodell wie der
// service_role-Key in supabase/functions/evaluate-seasons.
//
// Eine Ausnahme, eng gefasst: app/dashboard/invite-actions.ts ruft damit
// ausschließlich auth.admin.inviteUserByEmail auf, nachdem requireAccess()
// einen freigegebenen Spieler bestätigt und die Obergrenze geprüft hat. Für
// nichts anderes außerhalb von app/admin/.
export function createAdminClient() {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt.");
  }
  return createSupabaseClient(getSupabaseUrl(), raw.trim(), {
    auth: { persistSession: false },
  });
}
