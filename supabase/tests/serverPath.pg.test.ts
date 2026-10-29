/* Testprotokoll Mehrspieler (Pilot, 29.10.2026), Teil Serverpfad.

   Spielt vollständige Partien durch die echten Migrationen, RPCs und
   RLS-Policies und durch den Code der Edge Function evaluate-seasons selbst
   (geladen unter Node, supabase-js durch pgClient.ts ersetzt). Geprüft wird:

   - Zugang, Lobby und Partiestart wie im Spiel (request_access, Freigabe,
     create_and_join_season, join_season, Start beim fünften Spieler bzw.
     force_start_season mit KI-Auffüllung).
   - Jede Abgabe geht als Nutzer über die RLS-Policy in turn_submissions,
     ausgewertet wird über request_season_evaluation und die Edge Function.
   - Parität: Der in der Datenbank gespeicherte Stand jedes Halbjahres ist
     exakt der, den runQuarter() im Speicher mit denselben Abgaben rechnet —
     der Weg über JSONB ändert nichts.
   - Endrangliste, globale Rangliste, beste Deals, Admin-Übersicht.
   - Rechte: keine fremden Abgaben lesen, nicht für andere oder ein anderes
     Halbjahr abgeben, keine Abgabe nach der Frist, keine Auswertung ohne
     Secret, kaputte Abgaben halten die Partie nicht an.

   Läuft nur mit PEL_PG (siehe README.md), sonst wird er übersprungen. */
import { beforeAll, describe, expect, it } from "vitest";
import { createRng } from "../../lib/engine/rng";
import { runQuarter, computeFinalRanking } from "../../lib/engine/runQuarter";
import { PERIODS, scoreOf } from "../../lib/engine/engine";
import { decide, type Strategy } from "../../lib/engine/__tests__/pilotStrategies";
import type { RuntimeState, TurnDecisions } from "../../lib/engine/turnTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const ON = !!process.env.PEL_PG;
const SECRET = "pilot-geheim";

let pg: typeof import("./pgClient");
let handler: (req: Request) => Promise<Response>;
const su = (sql: string, params: unknown[] = []) => pg.pgPool().query(sql, params as Any[]);
const asUser = (uid: string, sql: string, params: unknown[] = []) => pg.runAs("authenticated", uid, sql, params);

async function sweep() {
  const res = await handler(new Request("http://edge/evaluate-seasons", { method: "POST", headers: { "x-evaluate-secret": SECRET } }));
  return { status: res.status, body: res.status === 200 ? await res.json() : await res.text() };
}

// Sortiert Schlüssel wie JSONB, damit zwei Stände unabhängig von der Reihenfolge vergleichbar sind
function norm(x: Any): string {
  const re = (o: Any): Any => {
    if (Array.isArray(o)) return o.map(re);
    if (o && typeof o === "object") {
      const r: Any = {};
      Object.keys(o).sort().forEach((k) => { if (o[k] !== undefined) r[k] = re(o[k]); });
      return r;
    }
    return o;
  };
  return JSON.stringify(re(JSON.parse(JSON.stringify(x))));
}

let run = 0;
const TAG = Date.now().toString(36).slice(-5);
let universe = "";
let admin = "";
async function newUser(name: string) {
  const email = `${name.toLowerCase().replace(/\W/g, "")}.${Date.now()}.${run++}@pilot.test`;
  const id = (await su("insert into auth.users (email) values ($1) returning id", [email])).rows[0].id as string;
  // Anzeigenamen sind eindeutig: je Lauf ein Kennzeichen, damit der Test wiederholbar ist
  await asUser(id, "select public.request_access($1)", [`${name} ${TAG}`]);
  await asUser(admin, "select public.admin_set_user_access($1, 'approved', array[$2::uuid])", [id, universe]);
  return id;
}

const ATTRS = { sourcing: 2, analysis: 3, negotiation: 2, operations: 3, financing: 2 };

/* Eine Partie: Menschen mit Spielweisen, optional mit KI aufgefüllt. Gibt
   die Abweichungen zwischen Datenbank und Rechnung im Speicher zurück. */
async function playOnServer(names: string[], strategies: Strategy[], opts: { force?: boolean; deadlineMiss?: boolean } = {}) {
  const users: string[] = [];
  for (const n of names) users.push(await newUser(n));
  const season = (await asUser(users[0], "select public.create_and_join_season($1, $2::jsonb) as id", [universe, ATTRS])).rows[0].id as string;
  for (const u of users.slice(1)) await asUser(u, "select public.join_season($1, $2::jsonb)", [season, ATTRS]);
  if (opts.force) await asUser(users[0], "select public.force_start_season($1)", [season]);
  const s0 = (await su("select status, seed::text as seed from public.seasons where id = $1", [season])).rows[0];
  expect(s0.status, "Partie startet").toBe("running");

  // Bootstrap: Dealflow und Frist für Halbjahr 1
  let r = await sweep();
  expect(r.status).toBe(200);
  const slots = (await su("select slot, profile_id, is_ai from public.season_players where season_id = $1", [season])).rows as Any[];
  expect(slots.length).toBe(5);
  const slotOf = (uid: string) => slots.find((p) => p.profile_id === uid)!.slot as number;
  const stratOf: Record<number, Strategy> = {};
  users.forEach((u, i) => (stratOf[slotOf(u)] = strategies[i]));
  const srng: Record<number, ReturnType<typeof createRng>> = {};
  Object.keys(stratOf).forEach((k) => (srng[Number(k)] = createRng(1000 + Number(k))));

  const diffs: string[] = [];
  let mirror = (await su("select state from public.season_state where season_id = $1 and half_year = 0", [season])).rows[0].state as RuntimeState;

  for (let hy = 1; hy <= PERIODS; hy++) {
    const before = (await su("select current_half_year, seed::text as seed, status from public.seasons where id = $1", [season])).rows[0];
    if (before.current_half_year !== hy) { diffs.push(`HJ ${hy}: Partie steht bei ${before.current_half_year}`); break; }
    for (const u of users) {
      const slot = slotOf(u);
      // Wie im Browser: der letzte Stand, über die RLS-Policy gelesen
      const seen = (await asUser(u, "select state from public.season_state where season_id = $1 order by half_year desc limit 1", [season])).rows[0].state as RuntimeState;
      if (norm(seen) !== norm(mirror)) diffs.push(`HJ ${hy}: Platz ${slot} sieht einen anderen Stand als den gerechneten`);
      const d = decide(stratOf[slot], seen, slot, hy, srng[slot]);
      if (!d) continue;
      await asUser(u, "insert into public.turn_submissions (season_id, half_year, profile_id, payload) values ($1, $2, $3, $4)",
        [season, hy, u, JSON.stringify(d)]);
    }
    if (opts.deadlineMiss) await su("update public.seasons set current_half_year_deadline = now() - interval '1 second' where id = $1", [season]);
    const due = (await asUser(users[0], "select public.request_season_evaluation($1) as due", [season])).rows[0].due;
    if (!due) { diffs.push(`HJ ${hy}: Auswertung nicht fällig, obwohl alle abgegeben haben`); break; }
    r = await sweep();
    const mine = (r.body.results as Any[]).find((x) => x.seasonId === season);
    if (!mine || !mine.ok) { diffs.push(`HJ ${hy}: Auswertung fehlgeschlagen: ${JSON.stringify(mine)}`); break; }

    // Dieselbe Auswertung im Speicher, mit den Abgaben, wie sie in der Datenbank stehen
    const subs = (await su("select profile_id, payload from public.turn_submissions where season_id = $1 and half_year = $2", [season, hy])).rows as Any[];
    const dec: Record<number, TurnDecisions> = {};
    subs.forEach((s) => (dec[slotOf(s.profile_id)] = s.payload));
    const rng = createRng(Number(before.seed));
    mirror = runQuarter({ state: mirror, halfYear: hy, decisionsBySlot: dec, rng }).state;
    const stored = (await su("select state from public.season_state where season_id = $1 and half_year = $2", [season, hy])).rows[0]?.state;
    if (!stored) { diffs.push(`HJ ${hy}: kein gespeicherter Stand`); break; }
    if (norm(stored) !== norm(mirror)) {
      diffs.push(`HJ ${hy}: Datenbankstand weicht von der Rechnung ab`);
      mirror = stored;
    }
    const after = (await su("select seed::text as seed from public.seasons where id = $1", [season])).rows[0];
    if (Number(after.seed) !== rng.seed) diffs.push(`HJ ${hy}: gespeicherter Startwert ${after.seed} ≠ ${rng.seed}`);
    const feed = (await su("select feed from public.turn_results where season_id = $1 and half_year = $2", [season, hy])).rows[0]?.feed;
    if (!Array.isArray(feed)) diffs.push(`HJ ${hy}: kein Feed in turn_results`);
  }
  const fin = (await su("select status, final_ranking from public.seasons where id = $1", [season])).rows[0];
  return { season, users, slotOf, diffs, fin, mirror };
}

describe.skipIf(!ON)("Testprotokoll Mehrspieler — Serverpfad gegen Postgres", () => {
  beforeAll(async () => {
    pg = await import("./pgClient");
    (globalThis as Any).Deno = {
      env: { get: (k: string) => ({ EVALUATE_SEASONS_SECRET: SECRET, SUPABASE_URL: "http://lokal", SUPABASE_SERVICE_ROLE_KEY: "lokal" } as Any)[k] },
      serve: (h: Any) => { handler = h; },
    };
    await import("../functions/evaluate-seasons/index.ts");
    universe = (await su("select id from public.universes where key = 'test'")).rows[0].id;
    const a = await su("select id from auth.users where email = 'thematicum.dev@gmail.com'");
    admin = a.rows[0]?.id ?? (await su("insert into auth.users (email) values ('thematicum.dev@gmail.com') returning id")).rows[0].id;
    await pg.runAs("authenticated", admin, "select public.request_access('Admin')").catch(() => {});
  });

  it("fünf Menschen: Start beim fünften Spieler, 20 Halbjahre, Datenbank = Rechnung, Endrangliste", async () => {
    const r = await playOnServer(["Anna Aggressiv", "Ole Overbid", "Kim Konservativ", "Cleo Chaos", "Paul Passiv"],
      ["aggr", "over", "kons", "chaos", "aggr"]);
    expect(r.diffs).toEqual([]);
    expect(r.fin.status).toBe("finished");
    const want = computeFinalRanking(r.mirror, PERIODS);
    expect(norm(r.fin.final_ranking)).toBe(norm(want));
    // Globale Rangliste und beste Deals aus Sicht eines Spielers
    const lb = (await asUser(r.users[0], "select * from public.global_leaderboard($1)", [universe])).rows as Any[];
    r.users.forEach((u) => expect(lb.some((x) => x.profile_id === u), "Spieler in der Rangliste").toBe(true));
    const winner = want[0];
    const wRow = lb.find((x) => x.profile_id === winner.profileId);
    expect(Number(wRow.seasons_won)).toBeGreaterThanOrEqual(1);
    expect(Number(wRow.max_score)).toBeCloseTo(winner.score, 3);
    const deals = (await asUser(r.users[1], "select * from public.best_deals($1)", [universe])).rows as Any[];
    expect(deals.some((d) => d.season_id === r.season)).toBe(true);
    const users = (await asUser(admin, "select * from public.admin_list_users()")).rows as Any[];
    expect(users.some((x) => x.id === r.users[0])).toBe(true);
    // Die gespeicherte Wertung ist die der Engine
    const f0 = r.mirror.funds.find((f) => f.slot === r.slotOf(r.users[0]))!;
    expect((r.fin.final_ranking as Any[]).find((x) => x.slot === f0.slot).score).toBeCloseTo(scoreOf(f0 as Any, r.mirror.market, PERIODS), 9);
  });

  it("zwei Menschen mit KI aufgefüllt, Frist läuft jedes Halbjahr ab, einer gibt nie ab", async () => {
    const r = await playOnServer(["Fritz Frist", "Pia Pause"], ["kons", "passiv"], { force: true, deadlineMiss: true });
    expect(r.diffs).toEqual([]);
    expect(r.fin.status).toBe("finished");
    expect((r.fin.final_ranking as Any[]).length).toBe(5);
  });

  it("zwei Auswertungen gleichzeitig (Cron und Spieler) werten ein Halbjahr genau einmal aus", async () => {
    const a = await newUser("Gleich Zeitig");
    const season = (await asUser(a, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, ATTRS])).rows[0].id;
    await asUser(a, "select public.force_start_season($1)", [season]);
    await sweep();
    for (let hy = 1; hy <= 3; hy++) {
      await asUser(a, "insert into public.turn_submissions (season_id, half_year, profile_id, payload) values ($1, $2, $3, '{}')", [season, hy, a]);
      const rs = await Promise.all([sweep(), sweep(), sweep()]);
      rs.forEach((r) => expect(r.status).toBe(200));
      const rows = (await su("select half_year, count(*)::int as n from public.season_state where season_id = $1 group by 1 order by 1", [season])).rows as Any[];
      expect(rows.every((x) => x.n === 1), JSON.stringify(rows)).toBe(true);
      expect((await su("select current_half_year from public.seasons where id = $1", [season])).rows[0].current_half_year).toBe(hy + 1);
    }
  });

  it("Lobby: Profil, voll, verlassen, Zeitablauf mit KI-Auffüllung, Grenzen, Abbruch per Abstimmung", async () => {
    const code = async (p: Promise<unknown>) => { try { await p; return "ok"; } catch (e) { return (e as Error).message; } };
    const [a, b, c, d, e, f] = await Promise.all(["Lea Lobby", "Max Mitte", "Nina Neu", "Otto Ort", "Petra Platz", "Quentin Spät"].map(newUser));
    // Ungültiges Fondsprofil wird abgelehnt
    expect(await code(asUser(a, "select public.create_and_join_season($1, $2::jsonb)", [universe, { sourcing: 9, analysis: 9, negotiation: 9, operations: 9, financing: 9 }])))
      .toMatch(/invalid_fund_attrs/);
    const season = (await asUser(a, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, ATTRS])).rows[0].id;
    // Verlassen und wieder beitreten
    await asUser(b, "select public.join_season($1, $2::jsonb)", [season, ATTRS]);
    await asUser(b, "select public.leave_season($1)", [season]);
    expect((await su("select count(*)::int as n from public.season_players where season_id = $1", [season])).rows[0].n).toBe(1);
    for (const u of [b, c, d]) await asUser(u, "select public.join_season($1, $2::jsonb)", [season, ATTRS]);
    expect((await su("select status from public.seasons where id = $1", [season])).rows[0].status).toBe("lobby");
    await asUser(e, "select public.join_season($1, $2::jsonb)", [season, ATTRS]);
    expect((await su("select status from public.seasons where id = $1", [season])).rows[0].status, "Start beim fünften").toBe("running");
    expect(await code(asUser(f, "select public.join_season($1, $2::jsonb)", [season, ATTRS])), "sechster Spieler").toMatch(/season_not_joinable|season_full/);
    // Zeitablauf: Lobby mit zwei Menschen startet nach 12 Stunden mit KI
    const s2 = (await asUser(f, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, ATTRS])).rows[0].id;
    await asUser(a, "select public.join_season($1, $2::jsonb)", [s2, ATTRS]);
    await su("update public.seasons set lobby_opened_at = now() - interval '13 hours' where id = $1", [s2]);
    await su("select public.start_due_seasons()");
    const pl = (await su("select is_ai from public.season_players where season_id = $1", [s2])).rows as Any[];
    expect(pl.length).toBe(5);
    expect(pl.filter((x) => x.is_ai).length).toBe(3);
    // Grenzen: höchstens drei aktive Partien je Spieler
    const lim = (await asUser(a, "select * from public.my_season_limits($1)", [universe])).rows[0];
    expect(lim.active_count).toBe(2);
    const s3 = (await asUser(a, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, ATTRS])).rows[0].id;
    expect(s3).toBeTruthy();
    expect(await code(asUser(a, "select public.create_and_join_season($1, $2::jsonb)", [universe, ATTRS])), "vierte aktive Partie").toMatch(/limit/);
    // Abbruch: alle Menschen müssen zustimmen, ein Nein beendet die Anfrage
    await sweep();
    expect((await asUser(f, "select public.request_season_abort($1) as r", [s2])).rows[0].r).toBe("requested");
    expect((await asUser(a, "select public.respond_season_abort($1, false) as r", [s2])).rows[0].r).toBe("rejected");
    expect((await su("select status from public.seasons where id = $1", [s2])).rows[0].status).toBe("running");
    expect((await asUser(f, "select public.request_season_abort($1) as r", [s2])).rows[0].r).toBe("requested");
    expect((await asUser(a, "select public.respond_season_abort($1, true) as r", [s2])).rows[0].r).toBe("aborted");
    const ab = (await su("select status, cancelled_reason from public.seasons where id = $1", [s2])).rows[0];
    expect(ab.status).not.toBe("running");
    // Eine abgebrochene Partie wird nicht mehr ausgewertet
    const r = await sweep();
    expect((r.body.results as Any[]).some((x) => x.seasonId === s2)).toBe(false);
  });

  it("Rechte und Fristen: nur eigene Abgaben, nur im laufenden Halbjahr, keine Auswertung ohne Secret", async () => {
    const a = await newUser("Rita Recht");
    const b = await newUser("Bert Beobachter");
    const outsider = await newUser("Olaf Außen");
    const season = (await asUser(a, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, ATTRS])).rows[0].id;
    await asUser(b, "select public.join_season($1, $2::jsonb)", [season, ATTRS]);
    await asUser(a, "select public.force_start_season($1)", [season]);
    await sweep();
    const ins = (uid: string, hy: number, payload: unknown, who = uid) =>
      asUser(uid, "insert into public.turn_submissions (season_id, half_year, profile_id, payload) values ($1, $2, $3, $4)", [season, hy, who, JSON.stringify(payload)]);
    const code = async (p: Promise<unknown>) => { try { await p; return "ok"; } catch (e) { return (e as Any).code || (e as Error).message; } };

    expect(await code(ins(outsider, 1, {})), "Außenstehender gibt ab").not.toBe("ok");
    expect(await code(ins(a, 2, {})), "Abgabe für ein späteres Halbjahr").not.toBe("ok");
    expect(await code(ins(a, 1, {}, b)), "Abgabe im Namen eines anderen").not.toBe("ok");
    // Kaputte Abgabe: wird angenommen (die Datenbank prüft die Form nicht), darf die Partie aber nicht anhalten
    expect(await code(ins(a, 1, { bids: "x", exitStarts: [null], initiatives: { a: 1 } }))).toBe("ok");
    expect(await code(ins(a, 1, {})), "zweite Abgabe").toBe("23505");
    expect((await asUser(b, "select * from public.turn_submissions where season_id = $1", [season])).rows.length, "fremde Abgabe lesen").toBe(0);
    expect((await asUser(outsider, "select * from public.season_state where season_id = $1", [season])).rows.length, "fremden Spielstand lesen").toBe(0);
    expect(await code(asUser(a, "select public.claim_season_for_evaluation($1)", [season])), "Spieler beansprucht Auswertung").not.toBe("ok");
    const bad = await handler(new Request("http://edge", { method: "POST", headers: { "x-evaluate-secret": "falsch" } }));
    expect(bad.status).toBe(401);
    // Status sieht jeder Mitspieler
    const st = (await asUser(b, "select * from public.season_submission_status($1)", [season])).rows[0];
    expect(st.submitted_count).toBe(1);
    expect(st.missing_count).toBe(1);
    // Der Admin sieht, wer abgegeben hat und wer fehlt, aber nicht was
    const subs = (await asUser(admin, "select * from public.admin_season_submissions() where season_id = $1", [season])).rows as Any[];
    expect(subs.length).toBe(2);
    expect(subs.find((x) => x.profile_id === a).submitted_at).not.toBeNull();
    expect(subs.find((x) => x.profile_id === b).submitted_at).toBeNull();
    expect(subs[0]).not.toHaveProperty("payload");
    expect(await code(asUser(a, "select * from public.admin_season_submissions()")), "Spieler liest Admin-Abgabestand").not.toBe("ok");
    expect((await asUser(a, "select public.request_season_evaluation($1) as d", [season])).rows[0].d, "fällig ohne zweite Abgabe").toBe(false);
    // Frist abgelaufen: keine Abgabe mehr, die Auswertung läuft ohne sie
    await su("update public.seasons set current_half_year_deadline = now() - interval '1 second' where id = $1", [season]);
    expect(await code(ins(b, 1, {})), "Abgabe nach der Frist").not.toBe("ok");
    const r = await sweep();
    expect((r.body.results as Any[]).find((x) => x.seasonId === season)?.ok, JSON.stringify(r.body)).toBe(true);
    const hy = (await su("select current_half_year from public.seasons where id = $1", [season])).rows[0].current_half_year;
    expect(hy).toBe(2);
  });

  it("Admin schiebt eine Partie ins nächste Halbjahr, obwohl noch jemand fehlt", async () => {
    const a = await newUser("Ada Abgabe");
    const b = await newUser("Ben Bummel");
    const season = (await asUser(a, "select public.create_and_join_season($1, $2::jsonb) as id", [universe, ATTRS])).rows[0].id;
    await asUser(b, "select public.join_season($1, $2::jsonb)", [season, ATTRS]);
    await asUser(a, "select public.force_start_season($1)", [season]);
    await sweep();
    const code = async (p: Promise<unknown>) => { try { await p; return "ok"; } catch (e) { return (e as Error).message; } };
    const ins = (uid: string) =>
      asUser(uid, "insert into public.turn_submissions (season_id, half_year, profile_id, payload) values ($1, 1, $2, '{}')", [season, uid]);

    await ins(a);
    expect((await sweep()).body.results.some((x: Any) => x.seasonId === season), "ohne Admin nicht fällig").toBe(false);
    expect(await code(asUser(a, "select public.admin_advance_season($1)", [season])), "Spieler schiebt").toBe("not_admin");

    expect((await asUser(admin, "select public.admin_advance_season($1) as hy", [season])).rows[0].hy).toBe(1);
    expect(await code(ins(b)), "Abgabe nach dem Vorziehen").not.toBe("ok");
    const r = await sweep();
    expect((r.body.results as Any[]).find((x) => x.seasonId === season)?.ok, JSON.stringify(r.body)).toBe(true);
    const s = (await su("select current_half_year, current_half_year_deadline > now() as open from public.seasons where id = $1", [season])).rows[0];
    expect(s.current_half_year).toBe(2);
    expect(s.open, "neue Frist fürs Folgehalbjahr").toBe(true);

    // Während einer Auswertung und nach dem Ende abgewiesen
    await su("update public.seasons set evaluation_lock_at = now() where id = $1", [season]);
    expect(await code(asUser(admin, "select public.admin_advance_season($1)", [season]))).toBe("evaluation_running");
    await su("update public.seasons set evaluation_lock_at = null, status = 'finished' where id = $1", [season]);
    expect(await code(asUser(admin, "select public.admin_advance_season($1)", [season]))).toBe("season_not_running");
  });
});
