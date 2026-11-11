import { requireAdmin } from "../adminAuth";
import { CodeActiveButton, CreateCodeForm } from "./CodeForms";
import { fmtDate } from "@/lib/format";
import { serverNow } from "@/lib/time";

interface CodeRow {
  id: string; code: string; label: string; universe_name: string; max_uses: number | null; used_count: number;
  expires_at: string | null; is_active: boolean; created_at: string;
  members: number; members_played: number; members_active_30d: number;
}

export default async function AdminCodesPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: universeData }] = await Promise.all([
    supabase.rpc("admin_list_access_codes"),
    supabase.rpc("admin_list_universes"),
  ]);
  const codes = (data ?? []) as CodeRow[];
  const universes = (universeData ?? []) as { id: string; name: string; is_active: boolean }[];
  const now = serverNow();

  return (
    <>
      <div className="dashcard">
        <h2>Neuer Zugangscode</h2>
        <p className="dashsub">
          Ein Zugangscode ist eine vorab erteilte Freigabe für ein Universum: Wer ihn einlöst, spielt sofort,
          ohne Einzelfreigabe. Ein Code je Kunde oder Kurs — so bleibt sichtbar, wer über welchen Weg kam und
          wie aktiv die Gruppe ist.
        </p>
        <CreateCodeForm universes={universes} />
      </div>

      <div className="dashcard">
        <h2>Zugangscodes ({codes.length})</h2>
        {error && <p className="autherror">{error.message}</p>}
        {codes.length === 0 && !error && <div className="quiet">Noch kein Zugangscode angelegt.</div>}
        {codes.length > 0 && (
          <div className="tablewrap">
            <table className="admintable">
              <thead>
                <tr>
                  <th>Code</th><th>Bezeichnung</th><th>Universum</th><th className="num">Eingelöst</th>
                  <th className="num">Haben gespielt</th><th className="num">Aktiv (30 T.)</th><th>Gültig bis</th><th></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = c.expires_at != null && new Date(c.expires_at).getTime() <= now;
                  const full = c.max_uses != null && c.used_count >= c.max_uses;
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="codebox">{c.code}</span>{" "}
                        {!c.is_active ? <span className="pill pill-ox">aus</span>
                          : expired ? <span className="pill pill-ox">abgelaufen</span>
                          : full ? <span className="pill pill-gold">voll</span>
                          : <span className="pill pill-teal">aktiv</span>}
                      </td>
                      <td>{c.label}</td>
                      <td>{c.universe_name}</td>
                      <td className="num">{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</td>
                      <td className="num">{c.members_played}</td>
                      <td className="num">{c.members_active_30d}</td>
                      <td>{c.expires_at ? fmtDate(c.expires_at) : "unbefristet"}</td>
                      <td><CodeActiveButton id={c.id} active={c.is_active} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
