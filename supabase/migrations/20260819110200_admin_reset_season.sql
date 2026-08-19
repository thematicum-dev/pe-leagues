-- Admin-Funktion: eine Partie komplett zurücksetzen. Löscht die gesamte
-- Spielhistorie (Fondsplätze, ausgewertete Halbjahre, Abgaben, Ergebnisse)
-- und versetzt die seasons-Zeile zurück in den Zustand einer frisch
-- eröffneten, leeren Lobby -- exakt wie eine neue Partie, nur mit
-- derselben ID (bestehende Links/Lesezeichen bleiben gültig).
create or replace function public.admin_reset_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  if not exists (select 1 from public.seasons where id = p_season_id) then
    raise exception 'season_not_found';
  end if;

  delete from public.turn_results where season_id = p_season_id;
  delete from public.turn_submissions where season_id = p_season_id;
  delete from public.season_state where season_id = p_season_id;
  delete from public.season_players where season_id = p_season_id;

  update public.seasons
  set status = 'lobby',
      seed = floor(random() * 9223372036854775807)::bigint,
      lobby_opened_at = now(),
      current_half_year = 0,
      current_half_year_deadline = null,
      started_at = null,
      evaluation_lock_token = null,
      evaluation_lock_at = null,
      final_ranking = null,
      cancelled_reason = null
  where id = p_season_id;
end;
$$;

comment on function public.admin_reset_season(uuid) is
  'Setzt eine Partie vollständig zurück auf eine leere Lobby (löscht Spielstand, Abgaben, Ergebnisse und Fondsplätze). Nur für is_admin(). Destruktiv, nicht umkehrbar.';

revoke all on function public.admin_reset_season(uuid) from public, anon;
grant execute on function public.admin_reset_season(uuid) to authenticated;
