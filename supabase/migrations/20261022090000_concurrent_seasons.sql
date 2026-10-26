-- Bis zu drei Partien gleichzeitig, höchstens drei neu eröffnete am Tag.
--
-- Bisher galt: höchstens eine aktive Partie (Lobby oder laufend) je Spieler
-- und Universum, geprüft in join_season() und create_and_join_season() mit dem
-- Fehler already_in_active_season. Jetzt:
--
--   - Ein Spieler kann in bis zu drei aktiven Partien je Universum zugleich
--     sitzen (Lobby und laufend zählen gleich, beendete und geschlossene
--     nicht). Darüber: active_season_limit_reached.
--   - Ein Spieler kann je Universum höchstens drei Partien pro Kalendertag
--     (Europe/Berlin, wie die Halbjahresfristen in lib/engine/deadline.ts)
--     eröffnen. Darüber: daily_season_limit_reached. Jede eröffnete Partie
--     zählt, auch eine, die danach aufgelöst wurde oder leer gelaufen ist --
--     sonst ließe sich die Grenze durch Eröffnen und Auflösen umgehen.
--
-- Wer eine Partie eröffnet hat, lässt sich an seasons.created_by nicht mehr
-- ablesen: leave_season() reicht die Ersteller-Rechte weiter, wenn der
-- Ersteller die Lobby verlässt. Dafür die neue, unveränderliche Spalte
-- opened_by. Bestandspartien bekommen den heutigen Ersteller -- für die
-- Tagesgrenze zählt ohnehin nur der laufende Tag.
--
-- Da ein Spieler jetzt in mehreren Lobbys sitzen darf, deckt die Prüfung auf
-- aktive Partien den doppelten Beitritt zur selben Lobby nicht mehr ab. Der
-- unique-Index season_players_profile_unique_idx würde ihn zwar abweisen,
-- aber mit einem nichtssagenden 23505; join_season() prüft das deshalb vorher
-- selbst (already_member).

alter table public.seasons
  add column opened_by uuid references public.profiles (id) on delete set null;

comment on column public.seasons.opened_by is
  'Wer die Partie eröffnet hat. Anders als created_by unveränderlich (leave_season() gibt die Ersteller-Rechte weiter) -- Grundlage der Tagesgrenze für neue Partien.';

update public.seasons set opened_by = created_by where opened_by is null;

create index seasons_opened_by_created_at_idx
  on public.seasons (opened_by, created_at);

-- Die beiden Grenzen an genau einer Stelle. Ändern sie sich, reicht ein
-- create or replace dieser beiden Funktionen.
create or replace function public.max_active_seasons()
returns int
language sql
immutable
as $$ select 3 $$;

create or replace function public.max_daily_season_openings()
returns int
language sql
immutable
as $$ select 3 $$;

-- Aktive Partien (Lobby oder laufend) eines Spielers in einem Universum.
create or replace function public.active_season_count(p_profile_id uuid, p_universe_id uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.season_players sp
  join public.seasons s on s.id = sp.season_id
  where sp.profile_id = p_profile_id
    and s.status in ('lobby', 'running')
    and s.universe_id = p_universe_id;
$$;

-- Heute (Kalendertag Europe/Berlin) eröffnete Partien eines Spielers in einem
-- Universum, gleich welchen Status sie inzwischen haben.
create or replace function public.seasons_opened_today(p_profile_id uuid, p_universe_id uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.seasons s
  where s.opened_by = p_profile_id
    and s.universe_id = p_universe_id
    and s.created_at >= (date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin');
$$;

revoke all on function public.active_season_count(uuid, uuid) from public, authenticated, anon;
revoke all on function public.seasons_opened_today(uuid, uuid) from public, authenticated, anon;

-- Für das Dashboard: wie viel Spielraum der angemeldete Spieler im Universum
-- noch hat. Nur Zählwerte über die eigenen Partien.
create or replace function public.my_season_limits(p_universe_id uuid)
returns table (active_count int, active_max int, opened_today int, opened_max int)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  return query
    select public.active_season_count(v_uid, p_universe_id),
           public.max_active_seasons(),
           public.seasons_opened_today(v_uid, p_universe_id),
           public.max_daily_season_openings();
end;
$$;

revoke all on function public.my_season_limits(uuid) from public, anon;
grant execute on function public.my_season_limits(uuid) to authenticated;

-- join_season(): unverändert bis auf die beiden Prüfungen nach der Sperre.
create or replace function public.join_season(p_season_id uuid, p_attrs jsonb default null)
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
  if p_attrs is not null and not public.valid_fund_attrs(p_attrs) then
    raise exception 'invalid_fund_attrs';
  end if;

  -- Serialisiert alle Beitritte und Eröffnungen desselben Spielers: Zwei
  -- gleichzeitige Aufrufe können die Grenze so nicht gemeinsam überschreiten.
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
    select 1 from public.season_players
    where season_id = p_season_id and profile_id = v_uid
  ) then
    raise exception 'already_member';
  end if;

  if public.active_season_count(v_uid, v_universe_id) >= public.max_active_seasons() then
    raise exception 'active_season_limit_reached';
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

  -- fund_attrs in derselben Zeile: Ist das der fünfte Platz, startet der
  -- Trigger die Partie unmittelbar nach diesem Insert.
  insert into public.season_players (season_id, slot, profile_id, is_ai, fund_attrs)
  values (p_season_id, v_free_slot, v_uid, false, p_attrs);
end;
$$;

-- create_and_join_season(): beide Grenzen, und opened_by wird gesetzt.
create or replace function public.create_and_join_season(p_universe_id uuid, p_attrs jsonb default null)
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
  if p_attrs is not null and not public.valid_fund_attrs(p_attrs) then
    raise exception 'invalid_fund_attrs';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text)::bigint);

  if public.active_season_count(v_uid, p_universe_id) >= public.max_active_seasons() then
    raise exception 'active_season_limit_reached';
  end if;
  if public.seasons_opened_today(v_uid, p_universe_id) >= public.max_daily_season_openings() then
    raise exception 'daily_season_limit_reached';
  end if;

  insert into public.seasons (created_by, opened_by, universe_id)
  values (v_uid, v_uid, p_universe_id)
  returning id into v_season_id;

  insert into public.season_players (season_id, slot, profile_id, is_ai, fund_attrs)
  values (v_season_id, 1, v_uid, false, p_attrs);

  return v_season_id;
end;
$$;
