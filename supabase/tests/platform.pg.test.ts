/* Plattformfunktionen gegen Postgres (10.11.2026): Zugangscodes,
   Nutzungsereignisse, Admin-Rollen und -Protokoll, Kennzahlen der
   Admin-Übersicht, Track Record. Gleiche Umgebung wie serverPath.pg.test.ts
   (siehe README.md); ohne PEL_PG übersprungen. */
import { beforeAll, describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const ON = !!process.env.PEL_PG;
let pg: typeof import("./pgClient");
const su = (sql: string, params: unknown[] = []) => pg.pgPool().query(sql, params as Any[]);
const asUser = (uid: string, sql: string, params: unknown[] = []) => pg.runAs("authenticated", uid, sql, params);
const fail = async (p: Promise<unknown>) => { try { await p; return "ok"; } catch (e) { return (e as Error).message; } };

const TAG = Date.now().toString(36).slice(-5);
let n = 0;
let universe = "";
let root = "";
async function account() {
  return (await su("insert into auth.users (email) values ($1) returning id", [`p${TAG}.${n++}@platform.test`])).rows[0].id as string;
}

describe.skipIf(!ON)("Plattform — Zugangscodes, Aktivität, Admin, Track Record", () => {
  beforeAll(async () => {
    pg = await import("./pgClient");
    universe = (await su("select id from public.universes where key = 'test'")).rows[0].id;
    const a = await su("select id from auth.users where email = 'thematicum.dev@gmail.com'");
    root = a.rows[0]?.id ?? (await su("insert into auth.users (email) values ('thematicum.dev@gmail.com') returning id")).rows[0].id;
    await asUser(root, "select public.request_access('Admin')").catch(() => {});
  });

  it("Zugangscode: sofort freigegeben, Kontingent, Ablauf, Fehlversuche, Sperre bleibt", async () => {
    const code = (await asUser(root, "select public.admin_create_access_code($1, $2, 2) as c", [`Kurs ${TAG}`, universe])).rows[0].c as string;
    expect(code).toMatch(/^PEL-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const redeem = async (uid: string, c: string, name?: string) =>
      (await asUser(uid, "select public.redeem_access_code($1, $2) as r", [c, name ?? null])).rows[0].r as string;

    // Neues Konto: Profil entsteht freigegeben, Universum zugeteilt und aktiv
    const u1 = await account();
    expect(await redeem(u1, ` ${code.toLowerCase()} `, `Eins ${TAG}`), "Kleinschreibung und Leerzeichen").toBe("ok");
    const p1 = (await su("select access_status, active_universe_id, access_code_id is not null as via from public.profiles where id = $1", [u1])).rows[0];
    expect(p1).toMatchObject({ access_status: "approved", active_universe_id: universe, via: true });
    expect((await asUser(u1, "select public.is_universe_member($1) as m", [universe])).rows[0].m).toBe(true);
    // Zweimal einlösen verbraucht nichts
    expect(await redeem(u1, code)).toBe("ok");
    expect((await su("select used_count from public.access_codes where code = $1", [code])).rows[0].used_count).toBe(1);

    // Wartendes Profil wird freigegeben, ohne zweites Konto
    const u2 = await account();
    await asUser(u2, "select public.request_access($1)", [`Zwei ${TAG}`]);
    expect(await redeem(u2, code)).toBe("ok");
    expect((await su("select access_status from public.profiles where id = $1", [u2])).rows[0].access_status).toBe("approved");

    // Kontingent von zwei ist verbraucht
    const u3 = await account();
    expect(await redeem(u3, code, `Drei ${TAG}`)).toBe("code_exhausted");
    expect((await su("select count(*)::int as c from public.profiles where id = $1", [u3])).rows[0].c).toBe(0);

    // Abgelaufen, deaktiviert, unbekannt
    const old = (await asUser(root, "select public.admin_create_access_code($1, $2, null, now() - interval '1 day') as c", [`Alt ${TAG}`, universe])).rows[0].c;
    expect(await redeem(u3, old, `Drei ${TAG}`)).toBe("code_expired");
    const off = (await asUser(root, "select public.admin_create_access_code($1, $2) as c", [`Aus ${TAG}`, universe])).rows[0].c;
    const offId = (await su("select id from public.access_codes where code = $1", [off])).rows[0].id;
    await asUser(root, "select public.admin_set_access_code_active($1, false)", [offId]);
    expect(await redeem(u3, off, `Drei ${TAG}`)).toBe("invalid_code");

    // Durchprobieren endet nach zehn Fehlversuchen je Stunde
    for (let i = 0; i < 9; i++) expect(await redeem(u3, "PEL-XXXX-" + String(1000 + i))).toBe("invalid_code");
    expect(await redeem(u3, "PEL-XXXX-0000")).toBe("too_many_attempts");
    const good = (await asUser(root, "select public.admin_create_access_code($1, $2) as c", [`Gut ${TAG}`, universe])).rows[0].c;
    expect(await redeem(u3, good, `Drei ${TAG}`), "auch ein richtiger Code wartet").toBe("too_many_attempts");

    // Eine Sperre hebt kein Code auf
    const u4 = await account();
    await asUser(u4, "select public.request_access($1)", [`Vier ${TAG}`]);
    await asUser(root, "select public.admin_set_user_access($1, 'rejected')", [u4]);
    expect(await redeem(u4, good)).toBe("rejected");

    // Kein Spieler legt Codes an oder liest sie
    expect(await fail(asUser(u1, "select public.admin_create_access_code('x', $1)", [universe]))).toBe("not_admin");
    expect(await fail(asUser(u1, "select * from public.admin_list_access_codes()"))).toBe("not_admin");
    expect(await fail(asUser(u1, "select * from public.access_codes"))).toMatch(/permission denied/);
    // Und niemand schreibt sich die Herkunft selbst um
    await asUser(u1, "update public.profiles set access_code_id = null, analytics_opt_out = true, last_seen_at = null where id = $1", [u1]);
    const kept = (await su("select access_code_id is not null as via, analytics_opt_out from public.profiles where id = $1", [u1])).rows[0];
    expect(kept).toMatchObject({ via: true, analytics_opt_out: false });

    const listed = (await asUser(root, "select * from public.admin_list_access_codes()")).rows.find((r: Any) => r.code === code);
    expect(listed).toMatchObject({ used_count: 2, max_uses: 2, members: "2" });
  });

  it("Nutzungsereignisse: aufgezeichnet, begrenzt, abschaltbar, für andere unsichtbar", async () => {
    const u = await account();
    await asUser(u, "select public.request_access($1)", [`Spur ${TAG}`]);
    const track = async (ev: string, props: Any = {}) =>
      (await asUser(u, "select public.track_event($1, $2::jsonb, '/dashboard') as ok", [ev, JSON.stringify(props)])).rows[0].ok as boolean;

    expect(await track("page_view")).toBe(true);
    expect(await track("Böse; drop table"), "Name außerhalb des Musters").toBe(false);
    expect(await track("practice_start", { big: "x".repeat(5000) }), "zu große Eigenschaften werden geleert").toBe(true);
    const rows = (await su("select event, props from public.analytics_events where user_id = $1 order by id", [u])).rows;
    expect(rows.map((r: Any) => r.event)).toEqual(["page_view", "practice_start"]);
    expect(rows[1].props).toEqual({});
    expect((await su("select last_seen_at > now() - interval '1 minute' as fresh from public.profiles where id = $1", [u])).rows[0].fresh).toBe(true);

    expect(await fail(asUser(u, "select * from public.analytics_events"))).toMatch(/permission denied/);
    expect(await fail(asUser(u, "insert into public.analytics_events (user_id, event) values ($1, 'x_y')", [u]))).toMatch(/permission denied/);
    expect((await pg.runAs("anon", null, "select 1 as x").then(() => fail(pg.runAs("anon", null, "select public.track_event('page_view')"))))).toMatch(/permission denied/);

    // Obergrenze je zehn Minuten
    await su("insert into public.analytics_events (user_id, event) select $1, 'page_view' from generate_series(1, 120)", [u]);
    expect(await track("page_view")).toBe(false);

    // Abschalten löscht das Bisherige und zeichnet nichts mehr auf
    await asUser(u, "select public.set_my_preferences(true)");
    expect((await su("select count(*)::int as c from public.analytics_events where user_id = $1", [u])).rows[0].c).toBe(0);
    expect(await track("page_view")).toBe(false);
    expect((await asUser(u, "select * from public.my_preferences()")).rows[0].analytics_opt_out).toBe(true);
    await asUser(u, "select public.set_my_preferences(false)");
    expect(await track("page_view")).toBe(true);

    await asUser(u, "select public.accept_terms()");
    expect((await asUser(u, "select * from public.my_preferences()")).rows[0].terms_accepted_at).not.toBeNull();
  });

  it("Admin-Rollen: nur Root ernennt, Ernannte verwalten, alles steht im Protokoll", async () => {
    const helper = await account();
    const player = await account();
    await asUser(helper, "select public.request_access($1)", [`Helfer ${TAG}`]);
    await asUser(player, "select public.request_access($1)", [`Spieler ${TAG}`]);

    expect((await asUser(helper, "select public.is_admin() as a")).rows[0].a).toBe(false);
    expect(await fail(asUser(helper, "select public.admin_set_admin($1, true)", [helper])), "Selbsternennung").toBe("not_root_admin");
    await asUser(root, "select public.admin_set_admin($1, true)", [helper]);
    expect((await asUser(helper, "select public.is_admin() as a, public.is_root_admin() as r")).rows[0]).toEqual({ a: true, r: false });

    // Der Ernannte darf freigeben, aber niemanden ernennen
    await asUser(helper, "select public.admin_set_user_access($1, 'approved', array[$2::uuid])", [player, universe]);
    expect(await fail(asUser(helper, "select public.admin_set_admin($1, true)", [player]))).toBe("not_root_admin");
    await asUser(helper, "select public.admin_log('user.access', $1, $2::jsonb)", [`Spieler ${TAG}`, JSON.stringify({ status: "approved" })]);
    expect(await fail(asUser(player, "select public.admin_log('user.access', 'x')"))).toBe("not_admin");
    expect(await fail(asUser(player, "select * from public.admin_list_audit()"))).toBe("not_admin");
    expect(await fail(asUser(helper, "delete from public.admin_audit_log"))).toMatch(/permission denied/);

    const audit = (await asUser(root, "select * from public.admin_list_audit(20)")).rows as Any[];
    expect(audit.some((r) => r.action === "admin.grant" && r.admin_email === "thematicum.dev@gmail.com")).toBe(true);
    expect(audit.some((r) => r.action === "user.access" && r.details.status === "approved")).toBe(true);

    const users = (await asUser(helper, "select * from public.admin_list_users()")).rows as Any[];
    expect(users.find((r) => r.id === helper)).toMatchObject({ is_admin: true, is_root: false });
    expect(users.find((r) => r.id === root)).toMatchObject({ is_admin: true, is_root: true });
    expect(users.find((r) => r.id === player)).toMatchObject({ is_admin: false, access_status: "approved", seasons_active: "0" });

    await asUser(root, "select public.admin_set_admin($1, false)", [helper]);
    expect((await asUser(helper, "select public.is_admin() as a")).rows[0].a).toBe(false);
    expect(await fail(asUser(helper, "select * from public.admin_list_users()"))).toBe("not_admin");
  });

  it("Kennzahlen und Track Record: Trichter, Abgabedisziplin, Platzierung", async () => {
    const a = await account();
    const b = await account();
    for (const [u, name] of [[a, "Anna"], [b, "Bela"]] as const) {
      await asUser(u, "select public.request_access($1)", [`${name} ${TAG}`]);
      await asUser(root, "select public.admin_set_user_access($1, 'approved', array[$2::uuid])", [u, universe]);
    }
    const attrs = { sourcing: 2, analysis: 3, negotiation: 2, operations: 3, financing: 2 };
    const season = (await asUser(a, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, attrs])).rows[0].id as string;
    await asUser(b, "select public.join_season($1, $2::jsonb)", [season, attrs]);

    const before = (await asUser(root, "select public.admin_dashboard_stats() as s")).rows[0].s;
    // Eine beendete Partie: a gewinnt, b wird Dritter hinter einer KI; a hat 20 von 20 abgegeben, b 5
    const ranking = [
      { slot: 1, profileId: a, isAi: false, name: "Anna Fonds", score: 1.42, tvcc: 2.1, irr: 0.24, tvpi: 2.3 },
      { slot: 3, profileId: null, isAi: true, name: "Aurum Partners", score: 1.1, tvcc: 1.8, irr: 0.19, tvpi: 2.0 },
      { slot: 2, profileId: b, isAi: false, name: "Bela Fonds", score: 0.7, tvcc: 1.2, irr: 0.09, tvpi: 1.3 },
    ];
    await su("update public.seasons set status = 'finished', current_half_year = 20, started_at = now(), final_ranking = $2::jsonb where id = $1", [season, JSON.stringify(ranking)]);
    await su(`insert into public.turn_submissions (season_id, half_year, profile_id, payload)
              select $1, g, $2, '{}' from generate_series(1, 20) g`, [season, a]);
    await su(`insert into public.turn_submissions (season_id, half_year, profile_id, payload)
              select $1, g, $2, '{}' from generate_series(1, 5) g`, [season, b]);

    const after = (await asUser(root, "select public.admin_dashboard_stats() as s")).rows[0].s;
    expect(after.seasons.finished - before.seasons.finished).toBe(1);
    expect(after.discipline.due - before.discipline.due).toBe(40);
    expect(after.discipline.submitted - before.discipline.submitted).toBe(25);
    const step = (s: Any, k: string) => s.funnel.find((f: Any) => f.key === k).count as number;
    expect(step(after, "finished") - step(before, "finished")).toBe(2);
    expect(step(after, "registered")).toBeGreaterThanOrEqual(step(after, "requested"));
    expect(step(after, "requested")).toBeGreaterThanOrEqual(step(after, "approved"));
    expect(step(after, "joined")).toBeGreaterThanOrEqual(step(after, "finished"));
    expect(after.daily).toHaveLength(14);
    expect(after.daily[13].submissions).toBeGreaterThanOrEqual(25);
    expect(after.users.active_7d).toBeGreaterThanOrEqual(2);
    expect(after.universes.some((u: Any) => u.finished >= 1)).toBe(true);
    expect(await fail(asUser(a, "select public.admin_dashboard_stats()"))).toBe("not_admin");

    const users = (await asUser(root, "select * from public.admin_list_users()")).rows as Any[];
    expect(users.find((r) => r.id === a)).toMatchObject({ seasons_played: "1", seasons_won: "1", turns_due: "20", turns_submitted: "20" });
    expect(users.find((r) => r.id === b)).toMatchObject({ seasons_played: "1", seasons_won: "0", turns_due: "20", turns_submitted: "5" });

    const ca = (await asUser(a, "select * from public.my_career()")).rows as Any[];
    expect(ca).toHaveLength(1);
    expect(ca[0]).toMatchObject({ season_id: season, place: 1, funds: 3, humans: 2, fund_name: "Anna Fonds" });
    expect(Number(ca[0].score)).toBeCloseTo(1.42);
    const cb = (await asUser(b, "select * from public.my_career()")).rows as Any[];
    expect(cb[0]).toMatchObject({ place: 3, funds: 3 });
    // Fremde sehen nichts davon
    const other = await account();
    expect((await asUser(other, "select * from public.my_career()")).rows).toHaveLength(0);

    // Offene Züge fürs Dashboard
    const run = (await asUser(a, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, attrs])).rows[0].id as string;
    await su("update public.seasons set status = 'running', current_half_year = 3, current_half_year_deadline = now() + interval '1 day' where id = $1", [run]);
    let open = (await asUser(a, "select * from public.my_open_turns()")).rows as Any[];
    expect(open.find((r) => r.season_id === run)).toMatchObject({ half_year: 3, submitted: false });
    await asUser(a, "insert into public.turn_submissions (season_id, half_year, profile_id, payload) values ($1, 3, $2, '{}')", [run, a]);
    open = (await asUser(a, "select * from public.my_open_turns()")).rows as Any[];
    expect(open.find((r) => r.season_id === run)).toMatchObject({ submitted: true });
    expect((await asUser(b, "select * from public.my_open_turns()")).rows.find((r: Any) => r.season_id === run)).toBeUndefined();
    await su("update public.seasons set status = 'cancelled', cancelled_reason = 'aborted' where id = $1", [run]);
  });

  it("Konto löschen: scheiterte bisher an eröffneten Partien — jetzt gehen sie über oder mit", async () => {
    const attrs = { sourcing: 2, analysis: 3, negotiation: 2, operations: 3, financing: 2 };
    const mk = async (name: string) => {
      const u = await account();
      await asUser(u, "select public.request_access($1)", [`${name} ${TAG}`]);
      await asUser(root, "select public.admin_set_user_access($1, 'approved', array[$2::uuid])", [u, universe]);
      return u;
    };
    const gone = await mk("Geht"), stays = await mk("Bleibt");
    const shared = (await asUser(gone, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, attrs])).rows[0].id as string;
    await asUser(stays, "select public.join_season($1, $2::jsonb)", [shared, attrs]);
    const solo = (await asUser(gone, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, attrs])).rows[0].id as string;
    await asUser(gone, "select public.track_event('page_view')");

    // Der alte Zustand: Der Fremdschlüssel hält das Konto fest
    expect(await fail(su("delete from auth.users where id = $1", [gone]))).toMatch(/seasons_created_by_fkey/);
    expect(await fail(asUser(stays, "select public.release_created_seasons($1)", [gone]))).toMatch(/permission denied/);
    expect(await fail(asUser(root, "select public.prepare_my_account_deletion()"))).toBe("root_admin_cannot_be_deleted");

    await asUser(gone, "select public.prepare_my_account_deletion()");
    await su("delete from auth.users where id = $1", [gone]);
    expect((await su("select created_by from public.seasons where id = $1", [shared])).rows[0].created_by, "Ersteller-Rechte gehen über").toBe(stays);
    expect((await su("select count(*)::int as c from public.seasons where id = $1", [solo])).rows[0].c, "Partie ohne weiteren Menschen").toBe(0);
    expect((await su("select count(*)::int as c from public.profiles where id = $1", [gone])).rows[0].c).toBe(0);
    expect((await su("select count(*)::int as c from public.analytics_events where user_id = $1", [gone])).rows[0].c).toBe(0);

    // Admin-Weg: protokolliert, und der Root-Account ist tabu
    await asUser(root, "select public.admin_prepare_user_deletion($1)", [stays]);
    await su("delete from auth.users where id = $1", [stays]);
    expect((await su("select count(*)::int as c from public.seasons where id = $1", [shared])).rows[0].c).toBe(0);
    expect(await fail(asUser(root, "select public.admin_prepare_user_deletion($1)", [root]))).toBe("root_admin_cannot_be_deleted");
    const audit = (await asUser(root, "select * from public.admin_list_audit(5)")).rows as Any[];
    expect(audit.some((r) => r.action === "user.delete" && r.details.user_id === stays)).toBe(true);
  });
});
