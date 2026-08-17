-- Die einzigen beiden Wege, wie ein Mensch einer Partie beitritt. Beide
-- laufen als SECURITY DEFINER (umgehen RLS gezielt, um seasons/
-- season_players schreiben zu können) und sind die einzigen Funktionen,
-- die der Client direkt aufrufen darf.
--
-- pg_advisory_xact_lock(hashtext(uid)) serialisiert alle Beitritts-/
-- Erstellversuche EINES Nutzers untereinander (z. B. Doppel-Tap oder zwei
-- offene Tabs) — ohne das würde die "höchstens eine aktive Partie"-Prüfung
-- unten bei zwei gleichzeitigen Aufrufen beide Male "noch keine aktive
-- Partie" sehen, obwohl der jeweils andere Aufruf gerade eine anlegt. Die
-- Sperre gilt nur bis zum Ende der Transaktion und blockiert niemanden
-- außer dem eigenen, zeitgleichen zweiten Versuch.

create or replace function public.join_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_used_slots int[];
  v_free_slot int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_missing';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text)::bigint);

  if exists (
    select 1
    from public.season_players sp
    join public.seasons s on s.id = sp.season_id
    where sp.profile_id = v_uid and s.status in ('lobby', 'running')
  ) then
    raise exception 'already_in_active_season';
  end if;

  select status into v_status
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null then
    raise exception 'season_not_found';
  end if;
  if v_status <> 'lobby' then
    raise exception 'season_not_joinable';
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

create or replace function public.create_and_join_season()
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

  perform pg_advisory_xact_lock(hashtext(v_uid::text)::bigint);

  if exists (
    select 1
    from public.season_players sp
    join public.seasons s on s.id = sp.season_id
    where sp.profile_id = v_uid and s.status in ('lobby', 'running')
  ) then
    raise exception 'already_in_active_season';
  end if;

  insert into public.seasons (created_by)
  values (v_uid)
  returning id into v_season_id;

  insert into public.season_players (season_id, slot, profile_id, is_ai)
  values (v_season_id, 1, v_uid, false);

  return v_season_id;
end;
$$;

revoke all on function public.join_season(uuid) from public, anon;
grant execute on function public.join_season(uuid) to authenticated;

revoke all on function public.create_and_join_season() from public, anon;
grant execute on function public.create_and_join_season() to authenticated;
