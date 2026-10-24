-- Rangliste nach der tatsächlichen Wertung: TVCC und IRR als führende
-- Kennzahlen, der TVPI nur noch zur Information.
--
-- Seit dem 18.10.2026 rechnet scoreOf() (lib/engine/engine.ts) je zur Hälfte
-- mit TVCC und IRR, und computeFinalRanking() (lib/engine/runQuarter.ts)
-- schreibt den TVCC mit in seasons.final_ranking. global_leaderboard() las
-- aber weiter nur Score, TVPI und IRR -- die Rangliste zeigte als Multiple
-- also eine Zahl, die gar nicht in die Wertung eingeht.
--
-- Neu sind max_tvcc und avg_tvcc. Endranglisten von vor dem 18.10.2026
-- haben kein tvcc-Feld; max() und avg() übergehen diese Partien, der TVCC
-- eines Spielers steht also nur für seine neueren Partien und ist null, wenn
-- er nur ältere gespielt hat. Aus dem TVPI lässt er sich nicht nachrechnen
-- (dafür fehlte der abgerufene Anteil). Die Wertung selbst bleibt, wie in
-- scoreOf() beschrieben, die damals gespeicherte.
--
-- Der Rückgabetyp ändert sich, deshalb drop statt create or replace.
drop function if exists public.global_leaderboard(uuid);

create function public.global_leaderboard(p_universe_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  seasons_played bigint,
  seasons_won bigint,
  max_score numeric,
  avg_score numeric,
  max_tvcc numeric,
  avg_tvcc numeric,
  max_irr numeric,
  avg_irr numeric,
  max_tvpi numeric,
  avg_tvpi numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_universe_member(p_universe_id) and not public.is_admin() then
    raise exception 'universe_not_granted';
  end if;

  return query
  with ranked as (
    select
      s.id as season_id,
      (r ->> 'profileId') as profile_id_text,
      (r ->> 'score')::numeric as score,
      (r ->> 'tvcc')::numeric as tvcc,
      (r ->> 'irr')::numeric as irr,
      (r ->> 'tvpi')::numeric as tvpi,
      row_number() over (partition by s.id order by (r ->> 'score')::numeric desc) as season_rank
    from public.seasons s
    cross join lateral jsonb_array_elements(s.final_ranking) as r
    where s.status = 'finished'
      and s.universe_id = p_universe_id
  ),
  entries as (
    select profile_id_text::uuid as profile_id, score, tvcc, irr, tvpi, season_rank
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
    max(e.tvcc) as max_tvcc,
    avg(e.tvcc) as avg_tvcc,
    max(e.irr) as max_irr,
    avg(e.irr) as avg_irr,
    max(e.tvpi) as max_tvpi,
    avg(e.tvpi) as avg_tvpi
  from entries e
  join public.profiles p on p.id = e.profile_id
  group by e.profile_id, p.display_name
  order by avg(e.score) desc;
end;
$$;

comment on function public.global_leaderboard(uuid) is
  'Rangliste eines Universums über dessen abgeschlossene Partien, nach ⌀ Wertung (je zur Hälfte TVCC und IRR); TVPI nur zur Information. Nur für Mitglieder dieses Universums (oder den Admin).';

revoke all on function public.global_leaderboard(uuid) from public, anon;
grant execute on function public.global_leaderboard(uuid) to authenticated;
