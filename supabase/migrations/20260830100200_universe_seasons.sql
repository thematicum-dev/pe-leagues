-- Partien gehören ab hier zu genau einem Universum. Alles, was ein Spieler
-- von einer Partie sieht (Lobby-Liste, Mitspieler, Rangliste), setzt jetzt
-- zusätzlich voraus, dass ihm dieses Universum zugeteilt wurde. Bestehende
-- Partien landen im Live-Universum.

alter table public.seasons
  add column universe_id uuid references public.universes (id) on delete restrict;

update public.seasons
set universe_id = (select id from public.universes where key = 'live')
where universe_id is null;

alter table public.seasons
  alter column universe_id set not null;

comment on column public.seasons.universe_id is
  'Universum dieser Partie. Nur Spieler mit Zuteilung sehen sie überhaupt.';

create index seasons_universe_status_idx on public.seasons (universe_id, status);

-- Das Universum einer Partie -- als SECURITY DEFINER-Baustein, damit die
-- RLS-Policies unten es nachschlagen können, ohne selbst wieder durch die
-- seasons-Policy zu laufen (die genau diesen Wert erst prüfen will).
create or replace function public.season_universe_id(p_season_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select s.universe_id from public.seasons s where s.id = p_season_id;
$$;

revoke all on function public.season_universe_id(uuid) from public, anon;
grant execute on function public.season_universe_id(uuid) to authenticated;

-- Sichtbarkeit von Partien: unverändert (offene Lobbys, eigene Partien),
-- aber ausschließlich innerhalb der eigenen Universen.
drop policy if exists "seasons_select" on public.seasons;

create policy "seasons_select"
  on public.seasons
  for select
  to authenticated
  using (
    public.is_universe_member(universe_id)
    and (
      status = 'lobby'
      or created_by = (select auth.uid())
      or public.is_season_member(id)
    )
  );

drop policy if exists "season_players_select" on public.season_players;

create policy "season_players_select"
  on public.season_players
  for select
  to authenticated
  using (
    public.is_universe_member(public.season_universe_id(season_id))
    and (
      exists (
        select 1 from public.seasons s
        where s.id = season_players.season_id and s.status = 'lobby'
      )
      or public.is_season_member(season_id)
      or exists (
        select 1 from public.seasons s
        where s.id = season_players.season_id and s.status = 'finished'
      )
    )
  );

-- Beitreten/Eröffnen: jetzt immer mit Universum. Die "höchstens eine aktive
-- Partie"-Regel gilt ab hier je Universum -- die Universen sind voneinander
-- getrennt, eine laufende Testpartie darf die Live-Liga nicht blockieren.
drop function if exists public.create_and_join_season();

create or replace function public.create_and_join_season(p_universe_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_season_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_missing';
  end if;
  if not exists (
    select 1 from public.profiles where id = v_uid and access_status = 'approved'
  ) then
    raise exception 'access_not_approved';
  end if;
  if not public.is_universe_member(p_universe_id) then
    raise exception 'universe_not_granted';
  end if;
  if not exists (
    select 1 from public.universes where id = p_universe_id and is_active
  ) then
    raise exception 'universe_inactive';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text)::bigint);

  if exists (
    select 1
    from public.season_players sp
    join public.seasons s on s.id = sp.season_id
    where sp.profile_id = v_uid
      and s.status in ('lobby', 'running')
      and s.universe_id = p_universe_id
  ) then
    raise exception 'already_in_active_season';
  end if;

  insert into public.seasons (created_by, universe_id)
  values (v_uid, p_universe_id)
  returning id into v_season_id;

  insert into public.season_players (season_id, slot, profile_id, is_ai)
  values (v_season_id, 1, v_uid, false);

  return v_season_id;
end;
$$;

create or replace function public.join_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_universe_id uuid;
  v_used_slots int[];
  v_free_slot int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_missing';
  end if;
  if not exists (
    select 1 from public.profiles where id = v_uid and access_status = 'approved'
  ) then
    raise exception 'access_not_approved';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text)::bigint);

  select status, universe_id into v_status, v_universe_id
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null then
    raise exception 'season_not_found';
  end if;
  if not public.is_universe_member(v_universe_id) then
    raise exception 'universe_not_granted';
  end if;
  if v_status <> 'lobby' then
    raise exception 'season_not_joinable';
  end if;

  if exists (
    select 1
    from public.season_players sp
    join public.seasons s on s.id = sp.season_id
    where sp.profile_id = v_uid
      and s.status in ('lobby', 'running')
      and s.universe_id = v_universe_id
  ) then
    raise exception 'already_in_active_season';
  end if;

  select array_agg(slot) into v_used_slots
  from public.season_players
  where season_id = p_season_id;

  select min(s) into v_free_slot
  from unnest(array[1, 2, 3, 4, 5]) as s
  where s <> all (coalesce(v_used_slots, array[]::int[]));

  if v_free_slot is null then
    raise exception 'season_full';
  end if;

  insert into public.season_players (season_id, slot, profile_id, is_ai)
  values (p_season_id, v_free_slot, v_uid, false);
end;
$$;

revoke all on function public.create_and_join_season(uuid) from public, anon;
grant execute on function public.create_and_join_season(uuid) to authenticated;
revoke all on function public.join_season(uuid) from public, anon;
grant execute on function public.join_season(uuid) to authenticated;

-- Die Rangliste ist ebenfalls je Universum getrennt: Ergebnisse aus dem
-- Test-Universum tauchen in der Live-Rangliste nicht auf.
drop function if exists public.global_leaderboard();

create or replace function public.global_leaderboard(p_universe_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  seasons_played bigint,
  seasons_won bigint,
  max_score numeric,
  avg_score numeric,
  max_tvpi numeric,
  avg_tvpi numeric,
  max_irr numeric,
  avg_irr numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_universe_member(p_universe_id) and not public.is_admin() then
    raise exception 'universe_not_granted';
  end if;

  return query
  with ranked as (
    select
      s.id as season_id,
      (r ->> 'profileId') as profile_id_text,
      (r ->> 'score')::numeric as score,
      (r ->> 'tvpi')::numeric as tvpi,
      (r ->> 'irr')::numeric as irr,
      row_number() over (partition by s.id order by (r ->> 'score')::numeric desc) as season_rank
    from public.seasons s
    cross join lateral jsonb_array_elements(s.final_ranking) as r
    where s.status = 'finished'
      and s.universe_id = p_universe_id
  ),
  entries as (
    select profile_id_text::uuid as profile_id, score, tvpi, irr, season_rank
    from ranked
    where profile_id_text is not null
  )
  select
    e.profile_id,
    p.display_name,
    count(*) as seasons_played,
    count(*) filter (where e.season_rank = 1) as seasons_won,
    max(e.score) as max_score,
    avg(e.score) as avg_score,
    max(e.tvpi) as max_tvpi,
    avg(e.tvpi) as avg_tvpi,
    max(e.irr) as max_irr,
    avg(e.irr) as avg_irr
  from entries e
  join public.profiles p on p.id = e.profile_id
  group by e.profile_id, p.display_name
  order by avg(e.score) desc;
end;
$$;

comment on function public.global_leaderboard(uuid) is
  'Rangliste eines Universums über dessen abgeschlossene Partien. Nur für Mitglieder dieses Universums (oder den Admin).';

revoke all on function public.global_leaderboard(uuid) from public, anon;
grant execute on function public.global_leaderboard(uuid) to authenticated;
