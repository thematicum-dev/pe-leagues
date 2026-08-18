-- Austreten aus einer Lobby (vor dem Start). Bisher lief das Verlassen über
-- eine einfache Client-Policy (DELETE des eigenen season_players-Datensatzes).
-- Das reicht jetzt nicht mehr aus: Verlässt der Ersteller, müssen die
-- Ersteller-Rechte an den Spieler mit dem längsten Wartestand übergehen;
-- verlässt der letzte Mensch, muss die Lobby geschlossen werden. Beides
-- braucht dieselbe Transaktion wie das Entfernen der Zeile, sonst entsteht
-- ein Zwischenzustand ohne Ersteller bzw. eine leere, aber offene Lobby.
-- Deshalb jetzt eine SECURITY DEFINER-Funktion statt einer Client-Policy.

drop policy if exists "season_players_delete" on public.season_players;

create or replace function public.leave_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_creator uuid;
  v_remaining_count int;
  v_new_creator uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select status, created_by into v_status, v_creator
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null then
    raise exception 'season_not_found';
  end if;
  if v_status <> 'lobby' then
    raise exception 'season_not_leavable';
  end if;

  -- Dieselbe Zeilensperre wie start_season(): ein gleichzeitiger Start
  -- (Trigger, Cron oder Sofort-Start) wartet an derselben Sperre und sieht
  -- danach entweder den bereits verkleinerten Spielerkreis oder (siehe
  -- unten) status <> 'lobby' und bricht folgenlos ab.
  perform 1 from public.season_players where season_id = p_season_id for update;

  if not exists (
    select 1 from public.season_players
    where season_id = p_season_id and profile_id = v_uid
  ) then
    raise exception 'not_a_member';
  end if;

  delete from public.season_players
  where season_id = p_season_id and profile_id = v_uid;

  select count(*) into v_remaining_count
  from public.season_players
  where season_id = p_season_id;

  if v_remaining_count = 0 then
    update public.seasons
    set status = 'cancelled', cancelled_reason = 'empty'
    where id = p_season_id;
    return;
  end if;

  if v_creator = v_uid then
    select profile_id into v_new_creator
    from public.season_players
    where season_id = p_season_id
    order by joined_at asc
    limit 1;

    update public.seasons set created_by = v_new_creator where id = p_season_id;
  end if;
end;
$$;

revoke all on function public.leave_season(uuid) from public, anon;
grant execute on function public.leave_season(uuid) to authenticated;
