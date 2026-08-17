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
import { createRng } from "../../../lib/engine/rng";
import { runQuarter, bootstrapInitialDeals, computeFinalRanking } from "../../../lib/engine/runQuarter";
import { firstHalfYearDeadline, nextHalfYearDeadline } from "../../../lib/engine/deadline";
import { PERIODS } from "../../../lib/engine/engine";
import type { RuntimeState, TurnDecisions } from "../../../lib/engine/turnTypes";

const EXPECTED_SECRET = Deno.env.get("EVALUATE_SEASONS_SECRET");

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
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

    const market = (stateRow.state as RuntimeState).market;
    const { deals, landmark } = bootstrapInitialDeals(rng, market);
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

  const slotByProfile = new Map<string, number>();
  (players ?? []).forEach((p) => { if (p.profile_id) slotByProfile.set(p.profile_id, p.slot); });

  const decisionsBySlot: Record<number, TurnDecisions> = {};
  (submissions ?? []).forEach((s) => {
    const slot = slotByProfile.get(s.profile_id as string);
    if (slot != null) decisionsBySlot[slot] = (s.payload ?? {}) as TurnDecisions;
  });

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

  return new Response(JSON.stringify({ evaluated: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
