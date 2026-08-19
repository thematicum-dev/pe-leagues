import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Zentrale Zugriffsprüfung für den gesamten /admin-Bereich. Die eigentliche
// Entscheidung trifft public.is_admin() in der Datenbank (fest auf
// thematicum.dev@gmail.com begrenzt, siehe supabase/migrations/
// 20260819110000_admin_access.sql) -- hier wird nur redirectet, wenn sie
// negativ ausfällt. Jede admin_*-Funktion prüft zusätzlich selbst noch
// einmal is_admin(), das hier ist also Komfort für die Oberfläche, keine
// alleinige Sicherheitsschranke.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return { supabase, user };
}
