-- Aggregierter, unbedenklicher Status für die Wartezustand-Anzeige eines
-- Spielers: wie viele Mitspieler fehlen noch, wie lange bis zur Frist. Gibt
-- ausdrücklich NUR Zählwerte zurück, niemals wer was abgegeben hat oder den
-- Inhalt einer Abgabe — turn_submissions bleibt weiterhin ausschließlich für
-- den Autor selbst lesbar (siehe 20260816120600_turn_submissions.sql).
create or replace function public.season_submission_status(p_season_id uuid)
returns table (
  current_half_year int,
  deadline timestamptz,
  human_count int,
  submitted_count int,
  missing_count int,
  i_have_submitted boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.current_half_year,
    s.current_half_year_deadline,
    (select count(*)::int from public.season_players sp
       where sp.season_id = s.id and sp.is_ai = false) as human_count,
    (select count(*)::int from public.turn_submissions ts
       where ts.season_id = s.id and ts.half_year = s.current_half_year) as submitted_count,
    greatest(0,
      (select count(*)::int from public.season_players sp where sp.season_id = s.id and sp.is_ai = false)
      - (select count(*)::int from public.turn_submissions ts where ts.season_id = s.id and ts.half_year = s.current_half_year)
    ) as missing_count,
    exists (
      select 1 from public.turn_submissions ts
      where ts.season_id = s.id and ts.half_year = s.current_half_year and ts.profile_id = (select auth.uid())
    ) as i_have_submitted
  from public.seasons s
  where s.id = p_season_id
    and (public.is_season_member(s.id) or s.status = 'finished');
$$;

revoke all on function public.season_submission_status(uuid) from public, anon;
grant execute on function public.season_submission_status(uuid) to authenticated;
