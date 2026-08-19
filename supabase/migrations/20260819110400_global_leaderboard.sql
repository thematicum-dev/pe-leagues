-- Globale Rangliste über alle abgeschlossenen Partien hinweg. Liest
-- ausschließlich seasons.final_ranking beendeter Partien -- laut
-- season_state_select/turn_results_select ohnehin für alle Nutzer
-- öffentlich einsehbar, hier nur aggregiert. Keine privaten Abgaben, keine
-- Interna laufender Partien.
create or replace function public.global_leaderboard()
returns table (
  profile_id uuid,
  display_name text,
  seasons_played bigint,
  seasons_won bigint,
  max_score numeric,
  avg_score numeric,
  max_tvpi numeric,
  avg_tvpi numeric,
  max_irr numeric,
  avg_irr numeric
)
language sql
stable
security definer
set search_path = public
as $$
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
  )
  select
    e.profile_id,
    p.display_name,
    count(*) as seasons_played,
    count(*) filter (where e.season_rank = 1) as seasons_won,
    max(e.score) as max_score,
    avg(e.score) as avg_score,
    max(e.tvpi) as max_tvpi,
    avg(e.tvpi) as avg_tvpi,
    max(e.irr) as max_irr,
    avg(e.irr) as avg_irr
  from entries e
  join public.profiles p on p.id = e.profile_id
  group by e.profile_id, p.display_name
  order by avg_score desc;
$$;

comment on function public.global_leaderboard() is
  'Rangliste aller Spieler über alle abgeschlossenen Partien: Anzahl gespielt/gewonnen, max./durchschnittlicher Score inkl. TVPI/IRR.';

revoke all on function public.global_leaderboard() from public, anon;
grant execute on function public.global_leaderboard() to authenticated;
