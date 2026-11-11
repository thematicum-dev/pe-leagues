import Link from "next/link";
import { requireAccess } from "@/lib/access/context";
import CareerView from "@/components/career/CareerView";
import type { CareerRow } from "@/lib/career/career";
import ProfileSettings from "./ProfileSettings";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const { supabase, user, profile } = await requireAccess("/profile");

  const [{ data: career, error }, { data: prefs }, { data: isRoot }] = await Promise.all([
    supabase.rpc("my_career"),
    supabase.rpc("my_preferences").maybeSingle<{ analytics_opt_out: boolean }>(),
    supabase.rpc("is_root_admin"),
  ]);

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>{profile.displayName}</h1>
            <div className="dashsub">Track Record über alle beendeten Partien</div>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Zum Dashboard
          </Link>
        </div>

        <CareerView rows={(career ?? []) as CareerRow[]} error={error?.message ?? null} />

        <div className="dashsection">
          <h2>Einstellungen</h2>
        </div>
        <ProfileSettings
          displayName={profile.displayName}
          email={user.email ?? ""}
          analyticsOptOut={prefs?.analytics_opt_out ?? false}
          canDelete={!isRoot}
        />
      </div>
    </main>
  );
}
