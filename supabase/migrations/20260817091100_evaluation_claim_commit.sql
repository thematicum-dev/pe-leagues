-- Claim/Commit-Mechanik für die serverseitige Rundenauswertung. Die
-- eigentliche Berechnung (lib/engine/runQuarter, TypeScript) läuft außerhalb
-- von Postgres in einer Edge Function (supabase/functions/evaluate-seasons)
-- mit dem service_role-Key. Damit zwei gleichzeitige Aufrufe (z. B. ein
-- Cron-Tick, der noch läuft, während der nächste bereits anläuft) dieselbe
-- Partie nicht doppelt auswerten, läuft die Auswertung einer Partie in zwei
-- Schritten:
--
--   1. claim_season_for_evaluation() sperrt die seasons-Zeile (FOR UPDATE),
--      prüft Fälligkeit erneut und vergibt bei Erfolg ein frisches Token —
--      alles in einer kurzen Transaktion, ohne auf die (unter Umständen
--      langsame) Berechnung zu warten.
--   2. Die Edge Function berechnet außerhalb der Datenbank den neuen
--      Zustand und ruft anschließend commit_season_bootstrap() bzw.
--      commit_season_evaluation() mit genau diesem Token auf. Ein
--      abgelaufenes oder falsches Token wird abgelehnt — der Schreibzugriff
--      bleibt exklusiv beim ursprünglichen Claim.
--
-- Der unique-Constraint auf season_state(season_id, half_year) ist eine
-- zweite, unabhängige Sperre: selbst falls beide Schritte irgendwie doppelt
-- passieren sollten, schlägt der zweite INSERT fehl statt die Historie zu
-- verdoppeln.
--
-- Alle Funktionen hier sind ausschließlich für service_role freigegeben.
-- Kein authentifizierter Nutzer und kein anonymer Aufrufer kann sie
-- aufrufen — der Browser kann die Auswertung damit unter keinen Umständen
-- selbst auslösen.

create or replace function public.list_seasons_for_evaluation_sweep()
returns table (season_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select s.id
  from public.seasons s
  where s.status = 'running'
    and (
      s.current_half_year_deadline is null
      or now() >= s.current_half_year_deadline
      or (
        select count(*) from public.season_players sp
        where sp.season_id = s.id and sp.is_ai = false
      ) <= (
        select count(*) from public.turn_submissions ts
        where ts.season_id = s.id and ts.half_year = s.current_half_year
      )
    )
    and (s.evaluation_lock_at is null or s.evaluation_lock_at < now() - interval '5 minutes');
$$;

create or replace function public.claim_season_for_evaluation(p_season_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_deadline timestamptz;
  v_half_year int;
  v_lock_at timestamptz;
  v_human_count int;
  v_submitted_count int;
  v_token uuid;
begin
  select status, current_half_year_deadline, current_half_year, evaluation_lock_at
  into v_status, v_deadline, v_half_year, v_lock_at
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null or v_status <> 'running' then
    return null;
  end if;

  -- Ein bestehender, noch frischer Claim bedeutet: eine andere Auswertung
  -- läuft gerade tatsächlich. Nur ein verwaister Claim (Edge Function
  -- vermutlich abgestürzt) darf überschrieben werden.
  if v_lock_at is not null and v_lock_at >= now() - interval '5 minutes' then
    return null;
  end if;

  if v_deadline is not null then
    select count(*) into v_human_count
    from public.season_players sp
    where sp.season_id = p_season_id and sp.is_ai = false;

    select count(*) into v_submitted_count
    from public.turn_submissions ts
    where ts.season_id = p_season_id and ts.half_year = v_half_year;

    if not (v_submitted_count >= v_human_count or now() >= v_deadline) then
      return null;
    end if;
  end if;
  -- current_half_year_deadline is null: die Partie wurde gerade gestartet
  -- und wartet auf den Bootstrap des ersten Halbjahres -- immer fällig.

  v_token := gen_random_uuid();
  update public.seasons
  set evaluation_lock_token = v_token, evaluation_lock_at = now()
  where id = p_season_id;

  return v_token;
end;
$$;

-- Bootstrap: Dealflow und Landmark für Halbjahr 1 ergänzen (kann erst nach
-- start_season() passieren, siehe Kommentar dort), Frist des ersten
-- Halbjahres setzen. Ändert current_half_year nicht (bleibt bei 1).
create or replace function public.commit_season_bootstrap(
  p_season_id uuid, p_token uuid, p_seed bigint,
  p_deals jsonb, p_landmark jsonb, p_deadline timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  select evaluation_lock_token into v_token
  from public.seasons where id = p_season_id for update;

  if v_token is null or v_token <> p_token then
    raise exception 'stale_or_missing_claim';
  end if;

  update public.season_state
  set state = state || jsonb_build_object(
    'deals', p_deals, 'landmark', p_landmark,
    'exitQueue', '{}'::jsonb, 'shortlist', '{}'::jsonb
  )
  where season_id = p_season_id and half_year = 0;

  update public.seasons
  set seed = p_seed, current_half_year_deadline = p_deadline,
      evaluation_lock_token = null, evaluation_lock_at = null
  where id = p_season_id;
end;
$$;

-- Auswertung eines Halbjahres: schreibt season_state/turn_results für das
-- soeben ausgewertete Halbjahr und rückt current_half_year vor -- oder
-- schließt die Partie ab, wenn Halbjahr 20 ausgewertet wurde.
create or replace function public.commit_season_evaluation(
  p_season_id uuid, p_token uuid, p_seed bigint,
  p_new_state jsonb, p_feed jsonb,
  p_next_deadline timestamptz, p_finished boolean, p_final_ranking jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
  v_half_year int;
begin
  select evaluation_lock_token, current_half_year into v_token, v_half_year
  from public.seasons where id = p_season_id for update;

  if v_token is null or v_token <> p_token then
    raise exception 'stale_or_missing_claim';
  end if;

  insert into public.season_state (season_id, half_year, state)
  values (p_season_id, v_half_year, p_new_state);

  insert into public.turn_results (season_id, half_year, feed)
  values (p_season_id, v_half_year, p_feed);

  if p_finished then
    update public.seasons
    set status = 'finished', current_half_year_deadline = null,
        final_ranking = p_final_ranking, seed = p_seed,
        evaluation_lock_token = null, evaluation_lock_at = null
    where id = p_season_id;
  else
    update public.seasons
    set current_half_year = v_half_year + 1, current_half_year_deadline = p_next_deadline,
        seed = p_seed, evaluation_lock_token = null, evaluation_lock_at = null
    where id = p_season_id;
  end if;
end;
$$;

revoke all on function public.list_seasons_for_evaluation_sweep() from public, authenticated, anon;
revoke all on function public.claim_season_for_evaluation(uuid) from public, authenticated, anon;
revoke all on function public.commit_season_bootstrap(uuid, uuid, bigint, jsonb, jsonb, timestamptz) from public, authenticated, anon;
revoke all on function public.commit_season_evaluation(uuid, uuid, bigint, jsonb, jsonb, timestamptz, boolean, jsonb) from public, authenticated, anon;

grant execute on function public.list_seasons_for_evaluation_sweep() to service_role;
grant execute on function public.claim_season_for_evaluation(uuid) to service_role;
grant execute on function public.commit_season_bootstrap(uuid, uuid, bigint, jsonb, jsonb, timestamptz) to service_role;
grant execute on function public.commit_season_evaluation(uuid, uuid, bigint, jsonb, jsonb, timestamptz, boolean, jsonb) to service_role;
