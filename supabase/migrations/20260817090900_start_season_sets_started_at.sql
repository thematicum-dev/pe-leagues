-- start_season() um das Setzen von started_at ergänzen (siehe vorige
-- Migration) — als neue Migration statt rückwirkender Änderung, wie im
-- Rest dieses Schemas gehandhabt. Der Rest der Funktion ist unverändert
-- gegenüber 20260817090300_start_season.sql.
create or replace function public.start_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_human_count int;
  v_free_count int;
  v_archetypes text[];
  v_perm int[];
  v_market jsonb;
  v_funds jsonb;
begin
  select status into v_status
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null or v_status <> 'lobby' then
    return;
  end if;

  perform 1 from public.season_players where season_id = p_season_id for update;

  select count(*) into v_human_count
  from public.season_players
  where season_id = p_season_id;

  if v_human_count = 0 then
    update public.seasons set status = 'cancelled' where id = p_season_id;
    return;
  end if;

  v_free_count := 5 - v_human_count;

  update public.season_players
  set slot = -slot - 100
  where season_id = p_season_id;

  select array_agg(s order by rn) into v_perm
  from (
    select s, row_number() over (order by random()) as rn
    from unnest(array[1, 2, 3, 4, 5]) as s
  ) t;

  with ranked as (
    select id, row_number() over (order by random()) as rn
    from public.season_players
    where season_id = p_season_id
  )
  update public.season_players sp
  set slot = v_perm[ranked.rn]
  from ranked
  where sp.id = ranked.id;

  select array_agg(a order by rn) into v_archetypes
  from (
    select a, row_number() over (order by random()) as rn
    from unnest(array['sourcing', 'ops', 'fin', 'all']) as a
  ) t
  where rn <= v_free_count;

  insert into public.season_players (season_id, slot, is_ai, ai_archetype)
  select p_season_id, v_perm[v_human_count + gs], true, v_archetypes[gs]
  from generate_series(1, v_free_count) as gs;

  update public.seasons
  set seed = floor(random() * 9223372036854775807)::bigint
  where id = p_season_id;

  v_market := jsonb_build_object(
    'Industrials', 8.5,
    'Healthcare', 11.0,
    'Software', 13.0,
    'Services', 9.0,
    'Consumer', 8.0
  );

  select jsonb_agg(
    jsonb_build_object(
      'slot', sp.slot,
      'profileId', sp.profile_id,
      'isAi', sp.is_ai,
      'archetype', sp.ai_archetype,
      'name', coalesce(pr.display_name, public.archetype_display_name(sp.ai_archetype)),
      'attrs',
        case when sp.is_ai
          then public.archetype_attrs(sp.ai_archetype)
          else public.default_human_attrs()
        end,
      'cash', 500, 'proceeds', 0, 'investedTotal', 0, 'fees', 0,
      'holdings', '[]'::jsonb, 'realized', '[]'::jsonb,
      'undrawn', 500, 'drawn', 0, 'recyc', 0, 'recycled', 0,
      'distTotal', 0, 'accrued', 0, 'calls', '[]'::jsonb, 'dists', '[]'::jsonb
    )
    order by sp.slot
  )
  into v_funds
  from public.season_players sp
  left join public.profiles pr on pr.id = sp.profile_id
  where sp.season_id = p_season_id;

  -- Deals, Landmark, Verkaufsangebots- und Shortlist-Warteschlangen für das
  -- erste Halbjahr entstehen nicht hier (reines SQL kann newDeal() aus
  -- lib/engine nicht nachbilden, ohne den Dealflow-Katalog zu duplizieren),
  -- sondern beim nächsten Lauf der Auswertungsfunktion: sie erkennt eine
  -- Partie mit current_half_year_deadline is null als "gerade gestartet,
  -- Halbjahr 1 noch nicht vorbereitet" und ergänzt state, seed und die
  -- Frist des ersten Halbjahres (siehe supabase/functions/evaluate-seasons).
  insert into public.season_state (season_id, half_year, state)
  values (
    p_season_id,
    0,
    jsonb_build_object(
      'market', v_market,
      'funds', v_funds,
      'feed', jsonb_build_array(
        jsonb_build_object(
          'halfYear', 0, 'emoji', '🏁', 'tone', 'neu',
          'text', 'Partie eröffnet. Fünf Fonds, je 500 Mio. €, zehn Jahre.'
        )
      ),
      'deals', '[]'::jsonb,
      'landmark', null,
      'exitQueue', '{}'::jsonb,
      'shortlist', '{}'::jsonb
    )
  );

  update public.seasons
  set status = 'running', current_half_year = 1, started_at = now()
  where id = p_season_id;
end;
$$;

revoke all on function public.start_season(uuid) from public, authenticated, anon;
