import { requireAdmin } from "../adminAuth";
import UserList, { type AdminUserRow } from "./UserList";
import { serverNow } from "@/lib/time";
import type { UniverseOption } from "./UserAccessControls";

export default async function AdminUsersPage() {
  const { supabase, user } = await requireAdmin();

  const [{ data: userData, error }, { data: universeData }, { data: isRoot }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.rpc("admin_list_universes"),
    supabase.rpc("is_root_admin"),
  ]);

  const users = (userData ?? []) as AdminUserRow[];
  const universes = ((universeData ?? []) as UniverseOption[]).map((u) => ({
    id: u.id,
    key: u.key,
    name: u.name,
    is_active: u.is_active,
  }));

  return (
    <>
      {error && <p className="autherror">{error.message}</p>}
      {/* Zeitpunkt vom Server: "zuletzt aktiv" und die Filter rechnen damit,
          Server- und Browserdarstellung stimmen so überein. */}
      <UserList users={users} universes={universes} selfId={user.id} isRoot={!!isRoot} now={serverNow()} />
    </>
  );
}
