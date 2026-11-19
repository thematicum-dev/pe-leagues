"use client";

import { useMemo, useState, useTransition } from "react";
import DeleteUserButton from "./DeleteUserButton";
import UserAccessControls, { type UniverseOption } from "./UserAccessControls";
import { setAdminAction } from "./actions";
import { fmtAgo, fmtDate, fmtIrr, fmtMultiple, fmtPct, fmtScore } from "@/lib/format";

/* Nutzerliste des Admin-Bereichs: suchen, filtern, sortieren, exportieren.
   Die Daten kommen vollständig vom Server (admin_list_users), gefiltert wird
   im Browser — bei einigen tausend Konten ist das die schnellste Bedienung
   und braucht keine zweite Abfrage. */

export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  access_status: "pending" | "approved" | "rejected" | "none";
  access_requested_at: string | null;
  access_decided_at: string | null;
  access_note: string | null;
  request_message: string | null;
  universes: { id: string; key: string; name: string }[];
  seasons_played: number;
  seasons_won: number;
  max_score: number | null;
  avg_score: number | null;
  // null, wenn alle Partien vor dem 18.10.2026 endeten (Endstand ohne TVCC)
  max_tvcc: number | null;
  avg_tvcc: number | null;
  max_irr: number | null;
  avg_irr: number | null;
  max_tvpi: number | null;
  avg_tvpi: number | null;
  last_active: string | null;
  last_sign_in_at: string | null;
  seasons_active: number;
  turns_submitted: number;
  turns_due: number;
  access_code: string | null;
  access_code_label: string | null;
  is_admin: boolean;
  is_root: boolean;
  analytics_opt_out: boolean;
}

const STATUS_LABEL: Record<AdminUserRow["access_status"], string> = {
  pending: "Wartet auf Freigabe",
  approved: "Freigegeben",
  rejected: "Gesperrt",
  none: "Ohne Anfrage",
};

type Filter = "all" | "pending" | "approved" | "active" | "dormant" | "never" | "rejected" | "admins";
const FILTERS: [Filter, string][] = [
  ["all", "Alle"], ["pending", "Offen"], ["approved", "Freigegeben"], ["active", "Aktiv (7 T.)"],
  ["dormant", "Inaktiv (30 T.)"], ["never", "Nie gespielt"], ["rejected", "Gesperrt"], ["admins", "Admins"],
];
type Sort = "default" | "active" | "created" | "played" | "score";
const DAY = 86400000;

export function matchesFilter(u: AdminUserRow, f: Filter, now: number): boolean {
  const last = u.last_active ? new Date(u.last_active).getTime() : null;
  switch (f) {
    case "pending": return u.access_status === "pending";
    case "approved": return u.access_status === "approved";
    case "rejected": return u.access_status === "rejected";
    case "active": return last != null && now - last < 7 * DAY;
    case "dormant": return u.access_status === "approved" && (last == null || now - last >= 30 * DAY);
    case "never": return u.access_status === "approved" && Number(u.seasons_played) === 0 && Number(u.seasons_active) === 0;
    case "admins": return u.is_admin;
    default: return true;
  }
}

function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  // Tabellenkalkulationen führen Zellen aus, die mit = + - @ beginnen
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: AdminUserRow[]): string {
  const head = ["E-Mail", "Anzeigename", "Status", "Registriert", "Zuletzt aktiv", "Universen", "Zugangscode",
    "Partien beendet", "Siege", "Partien aktiv", "Halbjahre abgegeben", "Halbjahre fällig", "Wertung Schnitt", "Wertung max"];
  const lines = rows.map((u) => [
    u.email, u.display_name, STATUS_LABEL[u.access_status], u.created_at?.slice(0, 10), u.last_active?.slice(0, 10),
    u.universes.map((x) => x.name).join(" | "), u.access_code_label,
    u.seasons_played, u.seasons_won, u.seasons_active, u.turns_submitted, u.turns_due,
    u.avg_score == null ? "" : Number(u.avg_score).toFixed(2), u.max_score == null ? "" : Number(u.max_score).toFixed(2),
  ].map(csvCell).join(";"));
  return [head.join(";"), ...lines].join("\n");
}

function AdminToggle({ user }: { user: AdminUserRow }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (user.is_root) return null;
  return (
    <div>
      <button className="btn-secondary" disabled={pending} onClick={() => {
        const next = !user.is_admin;
        if (!window.confirm(next
          ? `${user.display_name ?? user.email} zum Administrator ernennen? Die Person kann dann Zugänge, Partien und Universen verwalten.`
          : `${user.display_name ?? user.email} die Admin-Rolle entziehen?`)) return;
        setError(null);
        start(async () => { const r = await setAdminAction(user.id, next); if (r.error) setError(r.error); });
      }}>
        {pending ? "…" : user.is_admin ? "Admin entziehen" : "Zum Admin machen"}
      </button>
      {error && <p className="autherror" style={{ margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}

export default function UserList({
  users, universes, selfId, isRoot, now,
}: { users: AdminUserRow[]; universes: UniverseOption[]; selfId: string; isRoot: boolean; now: number }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("default");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = users.filter((u) => matchesFilter(u, filter, now) && (!needle
      || u.email.toLowerCase().includes(needle)
      || (u.display_name ?? "").toLowerCase().includes(needle)
      || (u.access_code_label ?? "").toLowerCase().includes(needle)));
    const t = (v: string | null) => (v ? new Date(v).getTime() : 0);
    if (sort === "active") list.sort((a, b) => t(b.last_active) - t(a.last_active));
    if (sort === "created") list.sort((a, b) => t(b.created_at) - t(a.created_at));
    if (sort === "played") list.sort((a, b) => Number(b.seasons_played) - Number(a.seasons_played));
    if (sort === "score") list.sort((a, b) => Number(b.avg_score ?? -9) - Number(a.avg_score ?? -9));
    return list;
  }, [users, q, filter, sort, now]);

  function download() {
    const blob = new Blob(["﻿" + toCsv(shown)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pe-leagues-nutzer-${new Date(now).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="dashcard">
      <h2>Konten ({shown.length}{shown.length !== users.length ? ` von ${users.length}` : ""})</h2>
      <div className="dashform filterbar">
        <input type="search" placeholder="Name, E-Mail oder Zugangscode suchen" value={q} onChange={(e) => setQ(e.target.value)}
          aria-label="Konten durchsuchen" />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sortierung">
          <option value="default">Offene Anfragen zuerst</option>
          <option value="active">Zuletzt aktiv</option>
          <option value="created">Neueste Registrierung</option>
          <option value="played">Meiste Partien</option>
          <option value="score">Beste ⌀ Wertung</option>
        </select>
      </div>
      <div className="filterbar">
        {FILTERS.map(([key, label]) => (
          <button key={key} type="button" className={"btn-quiet" + (filter === key ? " on" : "")} onClick={() => setFilter(key)}>
            {label} <span className="mono">{users.filter((u) => matchesFilter(u, key, now)).length}</span>
          </button>
        ))}
        <button type="button" className="btn-quiet" onClick={download} disabled={shown.length === 0}>CSV exportieren</button>
      </div>

      {shown.length === 0 && <div className="quiet">Kein Konto passt zu Suche und Filter.</div>}
      {shown.map((u) => {
        const rate = Number(u.turns_due) > 0 ? Number(u.turns_submitted) / Number(u.turns_due) : null;
        return (
          <div className="seasonrow adminuser" key={u.id} style={{ alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <div>
                {u.display_name ?? "(noch kein Anzeigename)"}{" "}
                <span className={"pill " + (u.access_status === "approved" ? "pill-teal" : u.access_status === "pending" ? "pill-gold" : u.access_status === "rejected" ? "pill-ox" : "")}>
                  {STATUS_LABEL[u.access_status]}
                </span>
                {u.is_admin && <> <span className="pill pill-gold">{u.is_root ? "Haupt-Admin" : "Admin"}</span></>}
              </div>
              <div className="dashsub">{u.email}</div>
              <div className="dashsub">
                Registriert {fmtDate(u.created_at)} · zuletzt aktiv <strong>{fmtAgo(u.last_active, now)}</strong>
                {u.access_decided_at && ` · entschieden ${fmtDate(u.access_decided_at)}`}
              </div>
              {u.request_message && <div className="dashsub">Nachricht: „{u.request_message}“</div>}
              <div className="dashsub">
                Universen: {u.universes.length === 0 ? "keine" : u.universes.map((x) => x.name).join(", ")}
                {u.access_code_label && <> · über Code „{u.access_code_label}“</>}
                {u.analytics_opt_out && " · Auswertung abgeschaltet"}
              </div>
              <div className="dashsub mono">
                {u.seasons_played} beendet · {u.seasons_won} gewonnen · {u.seasons_active} aktiv · Abgaben{" "}
                {u.turns_submitted}/{u.turns_due}{rate != null && ` (${fmtPct(rate)})`}
              </div>
              {Number(u.seasons_played) > 0 && (
                <div className="dashsub mono">
                  Wertung ⌀ {fmtScore(u.avg_score)} / max {fmtScore(u.max_score)} · TVCC ⌀ {fmtMultiple(u.avg_tvcc)} · IRR ⌀ {fmtIrr(u.avg_irr)}
                </div>
              )}
              {u.access_status === "none" ? (
                <p className="dashsub">
                  Dieses Konto hat das Onboarding noch nicht abgeschlossen — es gibt noch nichts freizugeben.
                </p>
              ) : (
                <UserAccessControls
                  profileId={u.id}
                  status={u.access_status}
                  grantedUniverseIds={u.universes.map((x) => x.id)}
                  universes={universes}
                  note={u.access_note}
                />
              )}
            </div>
            {u.id !== selfId && !u.is_root && (
              <div className="adminactions">
                {isRoot && u.access_status !== "none" && <AdminToggle user={u} />}
                <DeleteUserButton userId={u.id} displayName={u.display_name ?? u.email} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
