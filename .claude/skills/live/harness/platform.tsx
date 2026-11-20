/* Wegwerf-Route für die Seiten außerhalb des Spiels: Karriere/Profil,
   Admin-Übersicht und Nutzerliste — mit festen Beispieldaten statt der
   Datenbank. `?view=career|admin|users|empty|feedback|dashboard|dashboard-new`.
   Siehe SKILL.md. */
import CareerView from "@/components/career/CareerView";
import AdminOverview, { type AdminStats } from "@/components/admin/AdminOverview";
import UserList, { type AdminUserRow } from "@/app/admin/users/UserList";
import type { CareerRow } from "@/lib/career/career";
import FeedbackForm from "@/app/feedback/FeedbackForm";
import DashboardView from "@/app/dashboard/DashboardView";
import { summarize } from "@/lib/career/career";

export const dynamic = "force-dynamic";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const day = (n: number) => new Date(NOW - n * 86400000).toISOString();

const CAREER: CareerRow[] = [
  { season_id: "a1", universe_name: "Live", finished_at: day(2), place: 1, funds: 5, humans: 3, score: 1.37, tvcc: 2.77, irr: 0.182, tvpi: 3.0, fund_name: "Bravo Partners" },
  { season_id: "a2", universe_name: "Live", finished_at: day(12), place: 3, funds: 5, humans: 2, score: 1.06, tvcc: 2.13, irr: 0.141, tvpi: 2.4, fund_name: "Bravo Partners" },
  { season_id: "a3", universe_name: "Live", finished_at: day(30), place: 2, funds: 5, humans: 5, score: 1.12, tvcc: 1.7, irr: 0.26, tvpi: 1.9, fund_name: "Bravo Partners II" },
  { season_id: "a4", universe_name: "Test", finished_at: day(55), place: 5, funds: 5, humans: 1, score: 0.31, tvcc: null, irr: -0.04, tvpi: 0.8, fund_name: "Erster Versuch" },
];

const STATS: AdminStats = {
  generated_at: day(0),
  users: { total: 184, without_profile: 9, pending: 4, approved: 163, rejected: 8, new_7d: 21, new_30d: 67, active_1d: 38, active_7d: 96, active_30d: 131, dormant_30d: 32 },
  funnel: [
    { key: "registered", label: "Registriert", count: 184 }, { key: "requested", label: "Zugang beantragt", count: 175 },
    { key: "approved", label: "Freigegeben", count: 163 }, { key: "joined", label: "Partie beigetreten", count: 121 },
    { key: "finished", label: "Partie beendet", count: 74 }, { key: "repeat", label: "Zweite Partie beendet", count: 39 },
  ],
  seasons: { total: 88, lobby: 3, running: 14, finished: 52, aborted: 11, cancelled_other: 8, started_7d: 9, finished_30d: 23, avg_half_year_running: 8.4, completion_rate: 0.825 },
  discipline: { due: 3120, submitted: 2714 },
  daily: Array.from({ length: 14 }, (_, i) => ({ day: day(13 - i).slice(0, 10), signups: [2, 0, 1, 4, 3, 0, 0, 5, 2, 1, 6, 3, 2, 1][i], submissions: [31, 12, 44, 52, 38, 9, 0, 61, 47, 40, 58, 66, 35, 41][i], active: [22, 14, 30, 34, 29, 11, 6, 41, 36, 33, 44, 47, 31, 38][i] })),
  events: [
    { event: "page_view", count: 2140, users: 96 }, { event: "season_open", count: 811, users: 71 },
    { event: "practice_start", count: 203, users: 58 }, { event: "leaderboard_view", count: 164, users: 49 },
    { event: "explain_start", count: 77, users: 44 }, { event: "profile_view", count: 61, users: 30 },
  ],
  cohorts: [
    { week: day(4).slice(0, 10), size: 21, joined: 12, active_7d: 19 }, { week: day(11).slice(0, 10), size: 17, joined: 13, active_7d: 11 },
    { week: day(18).slice(0, 10), size: 14, joined: 11, active_7d: 7 }, { week: day(25).slice(0, 10), size: 15, joined: 9, active_7d: 5 },
  ],
  universes: [
    { name: "Live", is_active: true, members: 118, running: 9, finished: 41 }, { name: "HSG Corporate Finance HS26", is_active: true, members: 44, running: 5, finished: 8 },
    { name: "Test", is_active: false, members: 6, running: 0, finished: 3 },
  ],
};

const u = (i: number, o: Partial<AdminUserRow>): AdminUserRow => ({
  id: "u" + i, email: `spieler${i}@example.org`, display_name: "Spieler " + i, created_at: day(40 - i), access_status: "approved",
  access_requested_at: day(40 - i), access_decided_at: day(39 - i), access_note: null, request_message: null,
  universes: [{ id: "x", key: "live", name: "Live" }], seasons_played: 0, seasons_won: 0, max_score: null, avg_score: null, max_tvcc: null, avg_tvcc: null,
  max_irr: null, avg_irr: null, max_tvpi: null, avg_tvpi: null, last_active: null, last_sign_in_at: null, seasons_active: 0, turns_submitted: 0, turns_due: 0,
  access_code: null, access_code_label: null, is_admin: false, is_root: false, analytics_opt_out: false, ...o,
});
const USERS: AdminUserRow[] = [
  u(1, { display_name: "Neue Anfrage", access_status: "pending", universes: [], request_message: "Eingeladen von Marcel", created_at: day(0) }),
  u(2, { display_name: "Thematicum", is_admin: true, is_root: true, last_active: day(0), seasons_played: 6, seasons_won: 2, avg_score: 1.12, max_score: 1.6, avg_tvcc: 1.9, avg_irr: 0.2, seasons_active: 2, turns_submitted: 131, turns_due: 134 }),
  u(3, { display_name: "Bravo", last_active: day(1), seasons_played: 3, seasons_won: 1, avg_score: 1.18, max_score: 1.37, avg_tvcc: 2.2, avg_irr: 0.19, seasons_active: 1, turns_submitted: 64, turns_due: 66, access_code: "PEL-HSG2-K7QM", access_code_label: "HSG Corporate Finance HS26" }),
  u(4, { display_name: "Schläfer", last_active: day(48), seasons_played: 1, avg_score: 0.4, max_score: 0.4, turns_submitted: 9, turns_due: 20 }),
  u(5, { display_name: "Nie gespielt", last_active: day(20), analytics_opt_out: true }),
  u(6, { display_name: "Gesperrt", access_status: "rejected", universes: [], access_note: "Zweitkonto" }),
  u(7, { display_name: null, access_status: "none", universes: [] }),
];

const UNI = { id: "x", key: "live", name: "Live", description: null, isActive: true };

function Dashboard({ fresh }: { fresh: boolean }) {
  return (
    <DashboardView
      displayName={fresh ? "Neu Hier" : "Marta Bravo"}
      email={fresh ? "neu@example.org" : "marta@example.org"}
      isAdmin={!fresh}
      universes={[UNI]}
      activeUniverse={UNI}
      showUniverse={false}
      mySeasons={fresh ? [] : [
        { id: "3f2c1a9e-run", status: "running", lobbyOpenedAt: day(20), occupancy: 5 },
        { id: "8b1d77c0-lob", status: "lobby", lobbyOpenedAt: new Date(NOW - 2 * 3600000).toISOString(), occupancy: 3 },
      ]}
      openLobbies={fresh ? [] : [{ id: "c4e9a210-opn", lobbyOpenedAt: new Date(NOW - 5 * 3600000).toISOString(), occupancy: 2 }]}
      limits={{ activeMax: 3, openedToday: 0, openedMax: 3 }}
      openTurns={fresh ? {} : { "3f2c1a9e-run": { halfYear: 9, deadline: day(-1), submitted: false } }}
      career={summarize(fresh ? [] : CAREER)}
      signupUrl="https://pe-leagues.example/signup"
    />
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "career" } = await searchParams;
  if (view === "dashboard" || view === "dashboard-new") return <Dashboard fresh={view === "dashboard-new"} />;
  return (
    <main className="dashwrap" style={{ alignItems: "flex-start" }}>
      <div className={"dashinner" + (view === "admin" || view === "users" ? " dashinner-wide" : "")}>
        {view === "career" && <CareerView rows={CAREER} />}
        {view === "empty" && <CareerView rows={[]} />}
        {view === "feedback" && <FeedbackForm />}
        {view === "admin" && (
          <AdminOverview stats={STATS} audit={[
            { id: 3, admin_email: "admin@example.org", action: "user.access", target: "Bravo", created_at: day(0) },
            { id: 2, admin_email: "admin@example.org", action: "access_code.create", target: "PEL-HSG2-K7QM", created_at: day(3) },
            { id: 1, admin_email: "admin@example.org", action: "season.advance", target: "3f2c1a9e", created_at: day(5) },
          ]} />
        )}
        {view === "users" && <UserList users={USERS} universes={[{ id: "x", key: "live", name: "Live", is_active: true }]} selfId="u2" isRoot now={NOW} />}
      </div>
    </main>
  );
}
