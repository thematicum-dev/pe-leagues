-- Fondsprofil schon beim Beitritt.
--
-- Bisher lief es in zwei Schritten: erst join_season() bzw.
-- create_and_join_season() im Dashboard, danach set_fund_profile() im
-- Lobby-Raum. Der Beitritt, der die Lobby auf fünf Spieler bringt, startet die
-- Partie aber sofort (trg_maybe_start_full_season -> start_season), und ab da
-- lehnt set_fund_profile() mit season_not_in_lobby ab. Der fünfte Spieler kam
-- so nie zu seiner Profilwahl und spielte zwingend mit der Standardverteilung
-- -- ebenso jeder, der sein Profil bis dahin nicht gespeichert hatte.
--
-- Jetzt nehmen beide Beitrittsfunktionen das Profil optional mit und schreiben
-- es in derselben Zeile, die den Start auslöst. start_season() liest
-- fund_attrs erst danach und findet es damit vor.
--
-- Die alten Ein-Parameter-Fassungen werden entfernt statt überladen: Neben
-- einer Fassung mit Default wäre ein Aufruf mit nur der Partie-ID mehrdeutig.
-- Aufrufe ohne p_attrs funktionieren weiter (fund_attrs bleibt dann null, wie
-- bisher).

drop function if exists public.join_season(uuid);
drop function if exists public.create_and_join_season(uuid);

create function public.join_season(p_season_id uuid, p_attrs jsonb default null)
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

  -- fund_attrs in derselben Zeile: Ist das der fünfte Platz, startet der
  -- Trigger die Partie unmittelbar nach diesem Insert.
  insert into public.season_players (season_id, slot, profile_id, is_ai, fund_attrs)
  values (p_season_id, v_free_slot, v_uid, false, p_attrs);
end;
$$;

create function public.create_and_join_season(p_universe_id uuid, p_attrs jsonb default null)
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

  insert into public.season_players (season_id, slot, profile_id, is_ai, fund_attrs)
  values (v_season_id, 1, v_uid, false, p_attrs);

  return v_season_id;
end;
$$;

revoke all on function public.join_season(uuid, jsonb) from public, anon;
grant execute on function public.join_season(uuid, jsonb) to authenticated;
revoke all on function public.create_and_join_season(uuid, jsonb) from public, anon;
grant execute on function public.create_and_join_season(uuid, jsonb) to authenticated;
