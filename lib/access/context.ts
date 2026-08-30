import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AccessStatus = "pending" | "approved" | "rejected";

export interface Universe {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AccessProfile {
  displayName: string;
  accessStatus: AccessStatus;
  accessNote: string | null;
  activeUniverseId: string | null;
}

export interface AccessContext {
  supabase: SupabaseClient;
  user: User;
  profile: AccessProfile | null;
  universes: Universe[];
  /** Das Universum, in dem der Nutzer gerade unterwegs ist. */
  activeUniverse: Universe | null;
}

interface UniverseRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

/**
 * Liest Profil und zugeteilte Universen des angemeldeten Nutzers. Die
 * Zuteilung selbst ist durch RLS geschützt (profile_universes_select_own),
 * die eigentliche Trennung der Universen steckt in den seasons-Policies --
 * das hier ist die Grundlage für die Oberfläche, keine Sicherheitsschranke.
 */
export async function getAccessContext(): Promise<AccessContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Über my_access() statt direkt aus profiles: die Notiz des Admins ist für
  // andere Spieler gesperrt (Spaltenrechte, siehe
  // supabase/migrations/20260830100100_access_control.sql), für den eigenen
  // Zugang aber genau die entscheidende Information.
  const { data: profileRow } = await supabase.rpc("my_access").maybeSingle();

  const profile: AccessProfile | null = profileRow
    ? {
        displayName: profileRow.display_name as string,
        accessStatus: profileRow.access_status as AccessStatus,
        accessNote: (profileRow.access_note as string | null) ?? null,
        activeUniverseId: (profileRow.active_universe_id as string | null) ?? null,
      }
    : null;

  let universes: Universe[] = [];
  if (profile && profile.accessStatus === "approved") {
    const { data: rows } = await supabase
      .from("profile_universes")
      .select("universes(id, key, name, description, is_active)");

    universes = (rows ?? [])
      .map((row) => {
        const u = (Array.isArray(row.universes) ? row.universes[0] : row.universes) as
          | UniverseRow
          | null;
        return u
          ? {
              id: u.id,
              key: u.key,
              name: u.name,
              description: u.description,
              isActive: u.is_active,
            }
          : null;
      })
      .filter((u): u is Universe => u !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  // Fällt die Wahl auf ein Universum, das nicht (mehr) zugeteilt ist, greift
  // einfach das erste zugeteilte -- gespeichert wird das erst beim bewussten
  // Wechsel (siehe app/dashboard/actions.ts).
  const activeUniverse =
    universes.find((u) => u.id === profile?.activeUniverseId) ?? universes[0] ?? null;

  return { supabase, user, profile, universes, activeUniverse };
}

export interface GrantedAccessContext extends AccessContext {
  profile: AccessProfile;
  activeUniverse: Universe;
}

/**
 * Schranke für alle Seiten, die das eigentliche Spiel zeigen: angemeldet,
 * Profil vorhanden, vom Admin freigegeben und mindestens ein Universum
 * zugeteilt. Sonst geht es zurück zur Anmeldung, ins Onboarding oder auf die
 * Wartesteite /access.
 */
export async function requireAccess(nextPath?: string): Promise<GrantedAccessContext> {
  const ctx = await getAccessContext();
  if (!ctx) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  if (!ctx.profile) {
    redirect("/onboarding");
  }
  if (ctx.profile.accessStatus !== "approved" || !ctx.activeUniverse) {
    redirect("/access");
  }
  return ctx as GrantedAccessContext;
}
