-- Ersteller-Rechte in der Lobby: Season entfernen und Sofort starten.
-- Beide Funktionen prüfen die Berechtigung (Ersteller? Status lobby?)
-- serverseitig selbst und sperren zuerst dieselbe seasons-Zeile wie
-- start_season()/leave_season() — ein beliebiger Client kann also weder
-- eine fremde Season löschen/starten noch eine Race-Bedingung ausnutzen.

create or replace function public.delete_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_creator uuid;
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
  if v_creator is distinct from v_uid then
    raise exception 'not_creator';
  end if;
  if v_status <> 'lobby' then
    raise exception 'season_not_deletable';
  end if;

  -- season_players-Zeilen bleiben bewusst erhalten (nur der Status wechselt
  -- auf 'cancelled'): so behalten die freigegebenen Mitspieler laut
  -- seasons_select-Policy (is_season_member) weiterhin Lesezugriff auf genau
  -- diese Season und sehen den Auflösungs-Hinweis, statt dass die Zeile für
  -- sie einfach verschwindet. Für neue Beitritte zählen sie trotzdem sofort
  -- als frei, weil already_in_active_season nur 'lobby'/'running' sperrt.
  update public.seasons
  set status = 'cancelled', cancelled_reason = 'creator_deleted'
  where id = p_season_id;
end;
$$;

revoke all on function public.delete_season(uuid) from public, anon;
grant execute on function public.delete_season(uuid) to authenticated;

create or replace function public.force_start_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_creator uuid;
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
  if v_creator is distinct from v_uid then
    raise exception 'not_creator';
  end if;
  if v_status <> 'lobby' then
    raise exception 'season_not_startable';
  end if;

  -- Dieselbe Sperre wird innerhalb derselben Transaktion erneut erteilt
  -- (kein Deadlock, kein zweiter Wartepunkt) -- genau das passiert schon
  -- heute beim 5-Spieler-Trigger, der start_season() ebenfalls aus einer
  -- Transaktion heraus aufruft, die die Zeile bereits hält.
  perform public.start_season(p_season_id);
end;
$$;

revoke all on function public.force_start_season(uuid) from public, anon;
grant execute on function public.force_start_season(uuid) to authenticated;
