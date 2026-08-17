-- Gleiches Prinzip wie bei seasons: Beitreten läuft nur noch über
-- SECURITY DEFINER-Funktionen (join_season/create_and_join_season), das
-- Befüllen mit KI-Fonds nur über start_season(). Keine direkte
-- INSERT-Policy mehr für authenticated.

drop policy if exists "season_players_insert" on public.season_players;

-- SELECT vereinfacht: Es gibt keinen Host mehr, der Sonderrechte hätte.
-- Sichtbar sind offene Lobbys (zum Anzeigen der Belegung vor dem Beitritt),
-- die eigenen Partien (auch nach dem Start) sowie beendete Partien.
drop policy if exists "season_players_select" on public.season_players;

create policy "season_players_select"
  on public.season_players
  for select
  to authenticated
  using (
    exists (
      select 1 from public.seasons s
      where s.id = season_players.season_id and s.status = 'lobby'
    )
    or public.is_season_member(season_id)
    or exists (
      select 1 from public.seasons s
      where s.id = season_players.season_id and s.status = 'finished'
    )
  );

-- Verlassen einer offenen Lobby bleibt ein einfacher, direkter Vorgang:
-- der eigene Platz, solange die Partie noch nicht läuft.
drop policy if exists "season_players_delete" on public.season_players;

create policy "season_players_delete"
  on public.season_players
  for delete
  to authenticated
  using (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.seasons s
      where s.id = season_players.season_id and s.status = 'lobby'
    )
  );
