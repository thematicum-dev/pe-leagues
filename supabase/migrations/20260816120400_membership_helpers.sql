-- Mitgliedschafts-Hilfsfunktionen. Erst hier definiert, weil sie auf
-- season_players verweisen, das erst in der vorigen Migration entstanden
-- ist. SECURITY DEFINER + fester search_path: Die Funktionen laufen mit den
-- Rechten des Funktionseigentümers (der Migrations-Rolle) und umgehen damit
-- gezielt RLS für ihre eigene interne Abfrage. Sie geben ausschließlich ein
-- boolean zurück, geben also selbst keine Zeilen anderer Nutzer preis, und
-- werden ausschließlich als Baustein innerhalb anderer RLS-Policies benutzt,
-- nie als von außen aufrufbare Datenquelle.

create or replace function public.is_season_member(p_season_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.season_players sp
    where sp.season_id = p_season_id
      and sp.profile_id = auth.uid()
  );
$$;

create or replace function public.is_season_creator(p_season_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.seasons s
    where s.id = p_season_id
      and s.created_by = auth.uid()
  );
$$;

revoke all on function public.is_season_member(uuid) from public;
revoke all on function public.is_season_creator(uuid) from public;
grant execute on function public.is_season_member(uuid) to authenticated;
grant execute on function public.is_season_creator(uuid) to authenticated;

-- Jetzt kann die SELECT-Policy für seasons ergänzt werden: sichtbar sind
-- offene Lobbys (zum Durchsuchen) sowie jede Partie, an der man selbst
-- teilnimmt oder die man selbst hostet.
create policy "seasons_select"
  on public.seasons
  for select
  to authenticated
  using (
    status = 'lobby'
    or created_by = (select auth.uid())
    or public.is_season_member(id)
  );
