import { requireAdmin } from "../adminAuth";
import {
  CreateUniverseForm,
  EditUniverseForm,
  type AdminUniverseRow,
} from "./UniverseForms";

export default async function AdminUniversesPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_universes");
  const universes = (data ?? []) as AdminUniverseRow[];

  return (
    <>
      <div className="dashcard">
        <h2>Universen ({universes.length})</h2>
        <p className="dashsub">
          Universen sind vollständig voneinander getrennt: Partien, Mitspieler und Ranglisten
          eines Universums sind in einem anderen unsichtbar. Ein Spieler kann mehreren Universen
          zugeteilt sein und im Dashboard zwischen ihnen wechseln.
        </p>
        {error && <p className="autherror">{error.message}</p>}
        {universes.map((u) => (
          <div className="seasonrow" key={u.id} style={{ alignItems: "flex-start" }}>
            <div style={{ width: "100%" }}>
              <div>
                {u.name}{" "}
                <span className="seasonstatus">{u.is_active ? "Aktiv" : "Stillgelegt"}</span>
              </div>
              <div className="dashsub mono">{u.key}</div>
              {u.description && <div className="dashsub">{u.description}</div>}
              <div className="dashsub">
                {u.member_count} Spieler zugeteilt · {u.season_count} Partien
              </div>
              <EditUniverseForm universe={u} />
            </div>
          </div>
        ))}
      </div>

      <div className="dashcard">
        <h2>Neues Universum</h2>
        <CreateUniverseForm />
      </div>
    </>
  );
}
