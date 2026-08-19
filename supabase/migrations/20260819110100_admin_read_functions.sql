-- Admin-Lesefunktionen: alle Partien inkl. Fortschritt, alle Nutzer inkl.
-- E-Mail und Statistiken. Beide SECURITY DEFINER + eigene is_admin()-Prüfung
-- (nicht nur eine RLS-Policy), damit ein Aufruf ohne Admin-Rechte immer mit
-- einer Exception abbricht statt nur leere Zeilen zu liefern.

create or replace function public.admin_list_seasons()
returns table (
  id uuid,
  status text,
  current_half_year integer,
  current_half_year_deadline timestamptz,
  lobby_opened_at timestamptz,
  started_at timestamptz,
  created_by_name text,
  human_count bigint,
  ai_count bigint,
  submitted_count bigint,
  cancelled_reason text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  return query
  select
    s.id, s.status, s.current_half_year, s.current_half_year_deadline, s.lobby_opened_at, s.started_at,
    p.display_name,
    (select count(*) from public.season_players sp where sp.season_id = s.id and sp.is_ai = false),
    (select count(*) from public.season_players sp where sp.season_id = s.id and sp.is_ai = true),
    (select count(*) from public.turn_submissions ts where ts.season_id = s.id and ts.half_year = s.current_half_year),
    s.cancelled_reason
  from public.seasons s
  left join public.profiles p on p.id = s.created_by
  order by s.created_at desc;
end;
$$;

comment on function public.admin_list_seasons() is
  'Admin-Übersicht aller Partien inkl. Spielerzahl und Abgabestand des laufenden Halbjahres. Nur für is_admin().';

revoke all on function public.admin_list_seasons() from public, anon;
grant execute on function public.admin_list_seasons() to authenticated;

-- Aggregiert dieselben, für abgeschlossene Partien ohnehin öffentlichen
-- Endranglisten (seasons.final_ranking) wie global_leaderboard(), ergänzt
-- aber E-Mail und Erstellungsdatum aus auth.users -- deshalb eine eigene,
-- admin-only Funktion statt einer Erweiterung von global_leaderboard().
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
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
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
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
  ),
  entries as (
    select profile_id_text::uuid as profile_id, score, tvpi, irr, season_rank
    from ranked
    where profile_id_text is not null
  ),
  stats as (
    select
      profile_id,
      count(*) as seasons_played,
      count(*) filter (where season_rank = 1) as seasons_won,
      max(score) as max_score, avg(score) as avg_score,
      max(tvpi) as max_tvpi, avg(tvpi) as avg_tvpi,
      max(irr) as max_irr, avg(irr) as avg_irr
    from entries
    group by profile_id
  )
  select
    u.id, u.email::text, p.display_name, u.created_at,
    coalesce(st.seasons_played, 0), coalesce(st.seasons_won, 0),
    st.max_score, st.avg_score, st.max_tvpi, st.avg_tvpi, st.max_irr, st.avg_irr
  from auth.users u
  join public.profiles p on p.id = u.id
  left join stats st on st.profile_id = u.id
  order by u.created_at desc;
end;
$$;

comment on function public.admin_list_users() is
  'Admin-Übersicht aller Nutzer inkl. E-Mail (aus auth.users) und Partien-Statistik. Nur für is_admin().';

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
