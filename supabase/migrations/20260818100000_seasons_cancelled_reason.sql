-- Unterscheidet zwei Gründe für status = 'cancelled', damit die Oberfläche
-- den betroffenen Spielern die richtige Meldung zeigen kann: eine Lobby, die
-- leer gelaufen ist (letzter Mensch hat verlassen), gegenüber einer Lobby,
-- die der Ersteller bewusst aufgelöst hat (siehe delete_season() in einer
-- späteren Migration). NULL für alle Partien, die nie storniert wurden.
alter table public.seasons
  add column cancelled_reason text
    constraint seasons_cancelled_reason_check
    check (cancelled_reason in ('empty', 'creator_deleted'));

-- start_season() setzt cancelled_reason = 'empty' im bereits bestehenden
-- 0-Spieler-Fall (Definition unverändert bis auf diese eine Zeile).
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
    update public.seasons
    set status = 'cancelled', cancelled_reason = 'empty'
    where id = p_season_id;
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
