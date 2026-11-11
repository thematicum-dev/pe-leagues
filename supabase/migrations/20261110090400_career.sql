-- Der eigene Track Record.
--
-- Eine beendete Partie verschwand bisher vom Dashboard: Dort stehen nur
-- Lobbys und laufende Partien, und die Rangliste zeigt Durchschnitte über
-- alle Spieler. Wer wissen wollte, wie die Partie von letzter Woche
-- ausgegangen ist, brauchte ihren Link.
--
-- my_career() liefert jede beendete Partie des angemeldeten Spielers mit
-- Platz, Wertung und Kennzahlen — über alle Universen, in denen er spielt.
-- Daraus baut die Profilseite Verlauf, Bestwerte und Auszeichnungen.

create or replace function public.my_career()
returns table (
  season_id uuid,
  universe_name text,
  finished_at timestamptz,
  place integer,
  funds integer,
  humans integer,
  score numeric,
  tvcc numeric,
  irr numeric,
  tvpi numeric,
  fund_name text
)
language sql
security definer
stable
set search_path = public
as $$
  with ranked as (
    select
      s.id as season_id,
      s.universe_id,
      s.updated_at as finished_at,
      r,
      row_number() over (partition by s.id order by (r ->> 'score')::numeric desc) as place,
      count(*) over (partition by s.id) as funds,
      count(*) filter (where (r ->> 'isAi') = 'false') over (partition by s.id) as humans
    from public.seasons s
    cross join lateral jsonb_array_elements(s.final_ranking) as r
    where s.status = 'finished'
      and s.final_ranking is not null
  )
  select
    k.season_id,
    u.name,
    k.finished_at,
    k.place::integer,
    k.funds::integer,
    k.humans::integer,
    (k.r ->> 'score')::numeric,
    (k.r ->> 'tvcc')::numeric,
    (k.r ->> 'irr')::numeric,
    (k.r ->> 'tvpi')::numeric,
    k.r ->> 'name'
  from ranked k
  join public.universes u on u.id = k.universe_id
  where (k.r ->> 'profileId') = auth.uid()::text
  order by k.finished_at desc;
$$;

comment on function public.my_career() is
  'Alle beendeten Partien des angemeldeten Spielers mit Platz, Wertung und Kennzahlen (neueste zuerst).';

revoke all on function public.my_career() from public, anon;
grant execute on function public.my_career() to authenticated;

-- Auf einen Blick fürs Dashboard: Bin ich in meinen laufenden Partien dran?
create or replace function public.my_open_turns()
returns table (
  season_id uuid,
  half_year integer,
  deadline timestamptz,
  submitted boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select s.id, s.current_half_year, s.current_half_year_deadline,
    exists (
      select 1 from public.turn_submissions ts
      where ts.season_id = s.id and ts.profile_id = auth.uid() and ts.half_year = s.current_half_year
    )
  from public.seasons s
  join public.season_players sp on sp.season_id = s.id and sp.profile_id = auth.uid()
  where s.status = 'running';
$$;

comment on function public.my_open_turns() is
  'Je laufender eigener Partie: aktuelles Halbjahr, Frist und ob die eigene Abgabe schon vorliegt.';

revoke all on function public.my_open_turns() from public, anon;
grant execute on function public.my_open_turns() to authenticated;
