import { fmtInt, fmtPct } from "@/lib/format";

/* Die Admin-Übersicht: wie es dem Produkt geht, auf einer Seite. Reine
   Darstellung über das JSON aus admin_dashboard_stats()
   (supabase/migrations/20261119130000_admin_dashboard.sql) — lässt sich wie
   die Ranglisten-Komponenten ohne Datenbank ansehen. */

export interface AdminStats {
  generated_at: string;
  users: {
    total: number; without_profile: number; pending: number; approved: number; rejected: number;
    new_7d: number; new_30d: number; active_1d: number; active_7d: number; active_30d: number; dormant_30d: number;
  };
  funnel: { key: string; label: string; count: number }[];
  seasons: {
    total: number; lobby: number; running: number; finished: number; aborted: number; cancelled_other: number;
    started_7d: number; finished_30d: number; avg_half_year_running: number; completion_rate: number | null;
  };
  discipline: { due: number; submitted: number };
  daily: { day: string; signups: number; submissions: number; active: number }[];
  events: { event: string; count: number; users: number }[];
  cohorts: { week: string; size: number; joined: number; active_7d: number }[];
  universes: { name: string; is_active: boolean; members: number; running: number; finished: number }[];
}

export interface AuditRow { id: number; admin_email: string | null; action: string; target: string | null; created_at: string }

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const dayLabel = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

function Spark({ data, k, label }: { data: AdminStats["daily"]; k: "signups" | "submissions" | "active"; label: string }) {
  const max = Math.max(1, ...data.map((d) => d[k]));
  const total = data.reduce((s, d) => s + d[k], 0);
  return (
    <div>
      <div className="dashsub">
        {label} · <span className="mono">{k === "active" ? `max ${max}` : `Σ ${total}`}</span>
      </div>
      <div className="spark" role="img" aria-label={`${label}, letzte ${data.length} Tage`}>
        {data.map((d) => (
          <i key={d.day} className={d[k] === 0 ? "zero" : ""} style={{ height: `${Math.max(3, (d[k] / max) * 100)}%` }}
            title={`${dayLabel(d.day)}: ${d[k]}`} />
        ))}
      </div>
      <div className="sparkaxis">
        <span>{data.length ? dayLabel(data[0].day) : ""}</span>
        <span>{data.length ? dayLabel(data[data.length - 1].day) : ""}</span>
      </div>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  "user.access": "Zugang geändert",
  "user.delete": "Konto gelöscht",
  "admin.grant": "Admin ernannt",
  "admin.revoke": "Admin entzogen",
  "access_code.create": "Zugangscode angelegt",
  "access_code.activate": "Zugangscode aktiviert",
  "access_code.deactivate": "Zugangscode deaktiviert",
  "season.reset": "Partie zurückgesetzt",
  "season.advance": "Halbjahr vorgezogen",
  "universe.create": "Universum angelegt",
  "universe.update": "Universum geändert",
};
export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a;

export default function AdminOverview({ stats, audit }: { stats: AdminStats; audit: AuditRow[] }) {
  const u = stats.users, s = stats.seasons;
  const top = Math.max(1, stats.funnel[0]?.count ?? 1);
  const stick = ratio(u.active_1d, u.active_30d);
  const disc = ratio(stats.discipline.submitted, stats.discipline.due);

  return (
    <>
      <div className="dashcard dashcard-accent">
        <h2>Auf einen Blick</h2>
        <div className="kpigrid">
          <div className="kpi">
            <b className="mono">{fmtInt(u.active_7d)}</b><span>aktiv in 7 Tagen</span>
            <em>{fmtInt(u.active_1d)} heute · {fmtInt(u.active_30d)} in 30 T.</em>
          </div>
          <div className="kpi">
            <b className="mono">{fmtInt(u.total)}</b><span>Konten</span>
            <em>+{fmtInt(u.new_7d)} in 7 T. · +{fmtInt(u.new_30d)} in 30 T.</em>
          </div>
          <div className="kpi">
            <b className="mono">{fmtInt(s.running)}</b><span>laufende Partien</span>
            <em>⌀ Halbjahr {String(s.avg_half_year_running).replace(".", ",")} · {fmtInt(s.lobby)} Lobbys</em>
          </div>
          <div className="kpi">
            <b className="mono">{fmtInt(u.pending)}</b><span>offene Anfragen</span>
            <em className={u.pending > 0 ? "warn" : ""}>{u.pending > 0 ? "warten auf Freigabe" : "nichts offen"}</em>
          </div>
          <div className="kpi">
            <b className="mono">{fmtPct(disc)}</b><span>Abgabedisziplin</span>
            <em>{fmtInt(stats.discipline.submitted)} von {fmtInt(stats.discipline.due)} Halbjahren</em>
          </div>
          <div className="kpi">
            <b className="mono">{fmtPct(s.completion_rate)}</b><span>zu Ende gespielt</span>
            <em>{fmtInt(s.finished)} beendet · {fmtInt(s.aborted)} abgebrochen</em>
          </div>
          <div className="kpi">
            <b className="mono">{fmtPct(stick)}</b><span>DAU / MAU</span>
            <em>Anteil der Monatsaktiven, die heute da waren</em>
          </div>
          <div className="kpi">
            <b className="mono">{fmtInt(u.dormant_30d)}</b><span>freigegeben, inaktiv</span>
            <em className={u.dormant_30d > 0 ? "warn" : ""}>seit 30 Tagen nicht gesehen</em>
          </div>
        </div>
      </div>

      <div className="admingrid">
        <div className="dashcard">
          <h2>Von der Registrierung zum Stammspieler</h2>
          {stats.funnel.map((f, i) => {
            const prev = i > 0 ? stats.funnel[i - 1].count : null;
            return (
              <div className="funnelrow" key={f.key}>
                <span>{f.label}</span>
                <div className="funnelbar"><i style={{ width: `${(f.count / top) * 100}%` }} /></div>
                <span className="mono">
                  {fmtInt(f.count)}
                  {prev != null && <small>{fmtPct(ratio(f.count, prev))}</small>}
                </span>
              </div>
            );
          })}
          <p className="dashsub">Prozent jeweils gegenüber der Stufe davor.</p>
        </div>

        <div className="dashcard">
          <h2>Letzte 14 Tage</h2>
          <Spark data={stats.daily} k="active" label="Aktive Konten je Tag" />
          <Spark data={stats.daily} k="submissions" label="Abgegebene Halbjahre" />
          <Spark data={stats.daily} k="signups" label="Registrierungen" />
        </div>
      </div>

      <div className="admingrid">
        <div className="dashcard">
          <h2>Kohorten nach Registrierungswoche</h2>
          {stats.cohorts.length === 0 ? <div className="quiet">Keine Registrierungen in den letzten acht Wochen.</div> : (
            <table className="admintable">
              <thead><tr><th>Woche ab</th><th className="num">Konten</th><th className="num">mit Partie</th><th className="num">aktiv (7 T.)</th></tr></thead>
              <tbody>
                {stats.cohorts.map((c) => (
                  <tr key={c.week}>
                    <td>{dayLabel(c.week)}</td>
                    <td className="num">{c.size}</td>
                    <td className="num">{c.joined} · {fmtPct(ratio(c.joined, c.size))}</td>
                    <td className="num">{c.active_7d} · {fmtPct(ratio(c.active_7d, c.size))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dashcard">
          <h2>Nutzung (7 Tage)</h2>
          {stats.events.length === 0 ? <div className="quiet">Noch keine Ereignisse aufgezeichnet.</div> : (
            <table className="admintable">
              <thead><tr><th>Ereignis</th><th className="num">Anzahl</th><th className="num">Konten</th></tr></thead>
              <tbody>
                {stats.events.map((e) => (
                  <tr key={e.event}><td className="mono">{e.event}</td><td className="num">{fmtInt(e.count)}</td><td className="num">{fmtInt(e.users)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="admingrid">
        <div className="dashcard">
          <h2>Universen</h2>
          <table className="admintable">
            <thead><tr><th>Universum</th><th className="num">Mitglieder</th><th className="num">laufend</th><th className="num">beendet</th></tr></thead>
            <tbody>
              {stats.universes.map((x) => (
                <tr key={x.name}>
                  <td>{x.name}{!x.is_active && <> <span className="pill">stillgelegt</span></>}</td>
                  <td className="num">{x.members}</td><td className="num">{x.running}</td><td className="num">{x.finished}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashcard">
          <h2>Letzte Admin-Eingriffe</h2>
          {audit.length === 0 ? <div className="quiet">Noch nichts protokolliert.</div> : (
            <table className="admintable">
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>{actionLabel(a.action)}{a.target ? <> · <span className="dashsub">{a.target}</span></> : null}</td>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>
                      {new Date(a.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
