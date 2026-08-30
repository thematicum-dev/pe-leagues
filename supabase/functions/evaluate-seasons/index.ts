// Serverseitige Rundenauswertung. Läuft minütlich, ausgelöst von pg_cron
// über pg_net (siehe supabase/migrations/20260817091200_cron_evaluate_seasons.sql).
// Benutzt lib/engine (dieselbe Logik wie der Übungsmodus/Einzelspielerpfad)
// mit dem service_role-Key, der RLS umgeht -- das ist der einzige Ort, an
// dem alle turn_submissions eines Halbjahres gelesen werden, um sie
// gegeneinander aufzulösen. Dieser Key verlässt niemals diese
// Server-Umgebung.
//
// Sicherheit: Ein Aufruf ohne den korrekten x-evaluate-secret-Header wird
// sofort mit 401 abgelehnt, bevor irgendetwas aus der Datenbank gelesen
// wird. Das Secret ist ausschließlich hier (als Function-Secret) und in
// Supabase Vault (für pg_net) hinterlegt -- niemals im Quelltext, niemals im
// Browser. Ein Browser mit einer gültigen Nutzer-Session kennt dieses
// Secret nicht und kann die Auswertung damit nicht selbst auslösen.
// npm:-Specifier (nativ von Deno aufgelöst) statt esm.sh, Version passend zu
// package.json, damit sich beide Laufzeiten (Next.js/Node und diese Edge
// Function) auf dasselbe Client-Verhalten verlassen können.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";
import { createRng } from "../../../lib/engine/rng.ts";
import { runQuarter, bootstrapInitialDeals, computeFinalRanking } from "../../../lib/engine/runQuarter.ts";
import { firstHalfYearDeadline, nextHalfYearDeadline } from "../../../lib/engine/deadline.ts";
import { PERIODS } from "../../../lib/engine/engine.ts";
import { backfillSeason, needsBackfill } from "../../../lib/engine/replay.ts";
import type { RuntimeState, TurnDecisions } from "../../../lib/engine/turnTypes.ts";

const EXPECTED_SECRET = Deno.env.get("EVALUATE_SEASONS_SECRET");

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/* Abgaben eines Halbjahres nach Fondsplatz, so wie die Auswertung sie sieht.
   Wird von der regulären Auswertung und vom Nachtrag gleichermaßen benutzt --
   eine zweite Zuordnung von Profil auf Slot dürfte es hier nicht geben. */
function decisionsBySlotFrom(
  players: { slot: number; profile_id: string | null }[],
  submissions: { profile_id: string; payload: unknown }[],
): Record<number, TurnDecisions> {
  const slotByProfile = new Map<string, number>();
  players.forEach((p) => { if (p.profile_id) slotByProfile.set(p.profile_id, p.slot); });
  const out: Record<number, TurnDecisions> = {};
  submissions.forEach((s) => {
    const slot = slotByProfile.get(s.profile_id);
    if (slot != null) out[slot] = (s.payload ?? {}) as TurnDecisions;
  });
  return out;
}

/* ---------- Nachtrag der Periodenmitschrift ----------
   Partien, die vor Einführung der Mitschrift begonnen haben, tragen für ihre
   bisherigen Halbjahre keine Periodenbeträge -- die Berichtsansicht könnte
   dort nur schätzen. Weil die Auswertung deterministisch ist und Spielstände
   wie Abgaben vollständig gespeichert sind, lässt sich die Partie exakt
   nachspielen: lib/engine/replay.ts rechnet dazu die Position im Zufallsstrom
   aus seasons.seed zurück und prüft Halbjahr für Halbjahr, dass derselbe
   Spielstand wieder herauskommt.

   Geschrieben wird nur, wenn das für jedes Halbjahr gelingt. Schlägt auch nur
   eines fehl, bleibt alles unverändert und der nächste Sweep versucht es
   erneut -- ein halb zurückgerechneter Verlauf wäre schlimmer als gar keiner. */
async function backfillOneSeason(db: SupabaseClient, seasonId: string) {
  const { data: token, error: claimErr } = await db.rpc("claim_season_for_backfill", { p_season_id: seasonId });
  if (claimErr) throw claimErr;
  if (!token) return "skipped";

  try {
    const { data: season, error: seasonErr } = await db
      .from("seasons").select("id, seed, current_half_year").eq("id", seasonId).single();
    if (seasonErr || !season) throw seasonErr ?? new Error("season_not_found");

    const { data: stateRows, error: stateErr } = await db
      .from("season_state").select("half_year, state")
      .eq("season_id", seasonId).order("half_year", { ascending: true });
    if (stateErr) throw stateErr;
    const states = (stateRows ?? []).map((r) => ({
      halfYear: r.half_year as number, state: r.state as RuntimeState,
    }));

    // Nichts nachzutragen: als geprüft abhaken, damit der Sweep sie nicht wieder anfasst.
    const latest = states.length ? states[states.length - 1].state : null;
    if (!latest || states.length < 2 || !needsBackfill(latest)) {
      const { error } = await db.rpc("commit_season_backfill", {
        p_season_id: seasonId, p_token: token, p_states: [],
      });
      if (error) throw error;
      return "nothing_to_do";
    }

    const { data: players, error: playersErr } = await db
      .from("season_players").select("slot, profile_id").eq("season_id", seasonId);
    if (playersErr) throw playersErr;

    const { data: submissions, error: subErr } = await db
      .from("turn_submissions").select("half_year, profile_id, payload").eq("season_id", seasonId);
    if (subErr) throw subErr;

    const decisionsByHalfYear: Record<number, Record<number, TurnDecisions>> = {};
    const byHalfYear = new Map<number, { profile_id: string; payload: unknown }[]>();
    (submissions ?? []).forEach((s) => {
      const hy = s.half_year as number;
      if (!byHalfYear.has(hy)) byHalfYear.set(hy, []);
      byHalfYear.get(hy)!.push({ profile_id: s.profile_id as string, payload: s.payload });
    });
    byHalfYear.forEach((rows, hy) => {
      decisionsByHalfYear[hy] = decisionsBySlotFrom((players ?? []) as never, rows);
    });

    /* Nur die bereits ausgewerteten Halbjahre. Das laufende ist noch nicht
       gespielt und hat auch noch keine season_state-Zeile. */
    const evaluated = states.filter((r) => r.halfYear < (season.current_half_year as number));
    const result = backfillSeason({
      states: evaluated,
      decisionsByHalfYear,
      endSeed: Number(season.seed),
    });

    if (!result.ok) {
      /* Deterministisches Ergebnis: Ohne Codeänderung käme beim nächsten Sweep
         dasselbe heraus. Deshalb abhaken statt jede Minute erneut rechnen —
         der Grund steht in der Antwort, und ein Zurücksetzen von
         seasons.statements_backfilled_at stellt die Partie wieder in die
         Warteschlange (siehe Migration 20260829120000).                     */
      const { error } = await db.rpc("commit_season_backfill", {
        p_season_id: seasonId, p_token: token, p_states: [],
      });
      if (error) throw error;
      return "not_reproducible:" + result.reason;
    }

    const { error: commitErr } = await db.rpc("commit_season_backfill", {
      p_season_id: seasonId, p_token: token,
      p_states: result.states.map((r) => ({ half_year: r.halfYear, state: r.state })),
    });
    if (commitErr) throw commitErr;
    return "backfilled:" + result.states.length;
  } catch (err) {
    await db.rpc("abort_season_backfill", { p_season_id: seasonId, p_token: token });
    throw err;
  }
}

async function evaluateOneSeason(db: SupabaseClient, seasonId: string) {
  const { data: token, error: claimErr } = await db.rpc("claim_season_for_evaluation", { p_season_id: seasonId });
  if (claimErr) throw claimErr;
  if (!token) return; // nicht (mehr) fällig oder gerade anderweitig geclaimt

  const { data: season, error: seasonErr } = await db
    .from("seasons")
    .select("id, seed, current_half_year, current_half_year_deadline, started_at")
    .eq("id", seasonId)
    .single();
  if (seasonErr || !season) throw seasonErr ?? new Error("season_not_found");

  const rng = createRng(Number(season.seed));

  if (season.current_half_year_deadline === null) {
    // Bootstrap: Halbjahr 1 wurde von start_season() angelegt, aber noch
    // ohne Dealflow/Landmark/Frist.
    const { data: stateRow, error: stateErr } = await db
      .from("season_state")
      .select("state")
      .eq("season_id", seasonId)
      .eq("half_year", 0)
      .single();
    if (stateErr || !stateRow) throw stateErr ?? new Error("initial_state_missing");

    const initialState = stateRow.state as RuntimeState;
    const { deals, landmark } = bootstrapInitialDeals(rng, initialState.market, initialState.funds);
    const deadline = firstHalfYearDeadline(new Date(season.started_at ?? Date.now()));

    const { error: commitErr } = await db.rpc("commit_season_bootstrap", {
      p_season_id: seasonId,
      p_token: token,
      p_seed: rng.seed,
      p_deals: deals,
      p_landmark: landmark,
      p_deadline: deadline.toISOString(),
    });
    if (commitErr) throw commitErr;
    return;
  }

  // Reguläre Auswertung des aktuellen Halbjahres.
  const halfYear = season.current_half_year as number;

  const { data: prevStateRow, error: prevStateErr } = await db
    .from("season_state")
    .select("state")
    .eq("season_id", seasonId)
    .eq("half_year", halfYear - 1)
    .single();
  if (prevStateErr || !prevStateRow) throw prevStateErr ?? new Error("previous_state_missing");

  const { data: players, error: playersErr } = await db
    .from("season_players")
    .select("slot, profile_id, is_ai")
    .eq("season_id", seasonId);
  if (playersErr) throw playersErr;

  const { data: submissions, error: subErr } = await db
    .from("turn_submissions")
    .select("profile_id, payload")
    .eq("season_id", seasonId)
    .eq("half_year", halfYear);
  if (subErr) throw subErr;

  const decisionsBySlot = decisionsBySlotFrom(
    (players ?? []) as never,
    (submissions ?? []).map((s) => ({ profile_id: s.profile_id as string, payload: s.payload })),
  );

  const state = prevStateRow.state as RuntimeState;
  const out = runQuarter({ state, halfYear, decisionsBySlot, rng });

  const finished = halfYear >= PERIODS;
  const nextDeadline = finished ? null : nextHalfYearDeadline(new Date());
  const finalRanking = finished ? computeFinalRanking(out.state, halfYear) : null;

  const { error: commitErr } = await db.rpc("commit_season_evaluation", {
    p_season_id: seasonId,
    p_token: token,
    p_seed: rng.seed,
    p_new_state: out.state,
    p_feed: out.feed,
    p_next_deadline: nextDeadline ? nextDeadline.toISOString() : null,
    p_finished: finished,
    p_final_ranking: finalRanking,
  });
  if (commitErr) throw commitErr;
}

Deno.serve(async (req: Request) => {
  if (!EXPECTED_SECRET || req.headers.get("x-evaluate-secret") !== EXPECTED_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const db = serviceClient();
  const { data: due, error } = await db.rpc("list_seasons_for_evaluation_sweep");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  /* Erster Durchgang: Partien, deren Periodenmitschrift noch fehlt. Läuft
     unabhängig von der Fälligkeit, weil ein Nachtrag nichts mit dem
     Halbjahreswechsel zu tun hat -- und nur einmal je Partie, danach ist sie
     in seasons.statements_backfilled_at abgehakt.

     Bewusst VOR den Auswertungen: Eine Wiederherstellung rechnet vergangene
     Halbjahre nach dem Regelstand nach, unter dem sie gespielt wurden (siehe
     EngineCompat). Käme erst die Auswertung, wäre das jüngste Halbjahr schon
     nach heutigem Stand gespielt und ließe sich mit dem alten nicht mehr
     herstellen -- der Nachtrag scheiterte an einer selbst gebauten Hürde. */
  const backfilled: { seasonId: string; result: string }[] = [];
  const { data: pending } = await db.rpc("list_seasons_for_statements_backfill");
  /* Zeitschranke: Der Sweep läuft minütlich, ein Nachtrag ist einmalig. Lieber
     eine Partie pro Durchgang liegen lassen, als die Auswertung der nächsten
     Runde zu blockieren -- die Warteschlange arbeitet sich von selbst ab. */
  const deadline = Date.now() + 25000;
  for (const row of pending ?? []) {
    if (Date.now() > deadline) break;
    const seasonId = (row as { season_id: string }).season_id;
    try {
      backfilled.push({ seasonId, result: await backfillOneSeason(db, seasonId) });
    } catch (err) {
      backfilled.push({ seasonId, result: "error: " + (err instanceof Error ? err.message : String(err)) });
    }
  }

  // Zweiter Durchgang: die fälligen Halbjahre auswerten.
  const results: { seasonId: string; ok: boolean; error?: string }[] = [];
  for (const row of due ?? []) {
    const seasonId = (row as { season_id: string }).season_id;
    try {
      await evaluateOneSeason(db, seasonId);
      results.push({ seasonId, ok: true });
    } catch (err) {
      // Eine fehlerhafte Partie darf die übrigen fälligen Auswertungen
      // nicht verhindern -- derselbe Grundsatz wie bei start_due_seasons().
      results.push({ seasonId, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return new Response(JSON.stringify({ evaluated: results.length, results, backfilled }), {
    headers: { "Content-Type": "application/json" },
  });
});
