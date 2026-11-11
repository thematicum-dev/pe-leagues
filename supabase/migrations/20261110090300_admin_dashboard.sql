-- Kennzahlen für die Admin-Übersicht und eine erweiterte Nutzerliste.
--
-- Der Admin-Bereich zeigte bisher Listen (Partien, Konten, Universen), aber
-- keine einzige Zahl darüber, wie es dem Produkt geht: Wie viele Konten sind
-- aktiv? Wie viele Registrierungen werden zu Spielern? Wie zuverlässig geben
-- Spieler ihre Halbjahre ab? Wie viele Partien werden zu Ende gespielt?
--
-- admin_dashboard_stats() beantwortet das in einem Aufruf als JSON. "Aktiv"
-- heißt: in der App gesehen (profiles.last_seen_at), einer Partie
-- beigetreten oder ein Halbjahr abgegeben — die beiden letzten zählen mit,
-- damit die Zahl auch für die Zeit vor der Aufzeichnung stimmt.

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  with activity as (
    -- letzte Aktivität je Konto aus allen drei Quellen
    select u.id as user_id, u.created_at,
      greatest(
        p.last_seen_at,
        (select max(sp.joined_at) from public.season_players sp where sp.profile_id = u.id),
        (select max(ts.submitted_at) from public.turn_submissions ts where ts.profile_id = u.id)
      ) as last_active,
      p.access_status,
      (p.id is not null) as has_profile,
      exists (select 1 from public.season_players sp where sp.profile_id = u.id) as joined,
      (select count(*) from public.seasons s
        where s.status = 'finished'
          and exists (select 1 from jsonb_array_elements(s.final_ranking) r where (r ->> 'profileId') = u.id::text)
      ) as finished_count
    from auth.users u
    left join public.profiles p on p.id = u.id
  ),
  users as (
    select jsonb_build_object(
      'total', count(*),
      'without_profile', count(*) filter (where not has_profile),
      'pending', count(*) filter (where access_status = 'pending'),
      'approved', count(*) filter (where access_status = 'approved'),
      'rejected', count(*) filter (where access_status = 'rejected'),
      'new_7d', count(*) filter (where created_at > now() - interval '7 days'),
      'new_30d', count(*) filter (where created_at > now() - interval '30 days'),
      'active_1d', count(*) filter (where last_active > now() - interval '1 day'),
      'active_7d', count(*) filter (where last_active > now() - interval '7 days'),
      'active_30d', count(*) filter (where last_active > now() - interval '30 days'),
      'dormant_30d', count(*) filter (where access_status = 'approved' and (last_active is null or last_active <= now() - interval '30 days'))
    ) as j from activity
  ),
  funnel as (
    select jsonb_build_array(
      jsonb_build_object('key', 'registered', 'label', 'Registriert', 'count', count(*)),
      jsonb_build_object('key', 'requested', 'label', 'Zugang beantragt', 'count', count(*) filter (where has_profile)),
      jsonb_build_object('key', 'approved', 'label', 'Freigegeben', 'count', count(*) filter (where access_status = 'approved')),
      jsonb_build_object('key', 'joined', 'label', 'Partie beigetreten', 'count', count(*) filter (where joined)),
      jsonb_build_object('key', 'finished', 'label', 'Partie beendet', 'count', count(*) filter (where finished_count >= 1)),
      jsonb_build_object('key', 'repeat', 'label', 'Zweite Partie beendet', 'count', count(*) filter (where finished_count >= 2))
    ) as j from activity
  ),
  seasons as (
    select jsonb_build_object(
      'total', count(*),
      'lobby', count(*) filter (where status = 'lobby'),
      'running', count(*) filter (where status = 'running'),
      'finished', count(*) filter (where status = 'finished'),
      'aborted', count(*) filter (where status = 'cancelled' and cancelled_reason = 'aborted'),
      'cancelled_other', count(*) filter (where status = 'cancelled' and cancelled_reason is distinct from 'aborted'),
      'started_7d', count(*) filter (where started_at > now() - interval '7 days'),
      'finished_30d', count(*) filter (where status = 'finished' and updated_at > now() - interval '30 days'),
      'avg_half_year_running', round(coalesce(avg(current_half_year) filter (where status = 'running'), 0)::numeric, 1),
      -- Von den gestarteten und entschiedenen Partien: Anteil, der zu Ende gespielt wurde
      'completion_rate', case
        when count(*) filter (where status = 'finished' or (status = 'cancelled' and cancelled_reason = 'aborted')) = 0 then null
        else round(
          (count(*) filter (where status = 'finished'))::numeric
          / count(*) filter (where status = 'finished' or (status = 'cancelled' and cancelled_reason = 'aborted')), 3)
      end
    ) as j from public.seasons
  ),
  -- Abgabedisziplin: Von allen Halbjahren, die für einen Menschen fällig
  -- waren und ausgewertet sind, wie viele hat er abgegeben?
  due as (
    select s.id,
      (select count(*) from public.season_players sp where sp.season_id = s.id and not sp.is_ai) as humans,
      case when s.status = 'finished' then s.current_half_year else greatest(s.current_half_year - 1, 0) end as evaluated
    from public.seasons s
    where s.status in ('running', 'finished')
  ),
  discipline as (
    select jsonb_build_object(
      'due', coalesce(sum(d.humans * d.evaluated), 0),
      'submitted', coalesce((
        select count(*) from public.turn_submissions ts
        join due d2 on d2.id = ts.season_id
        where ts.half_year <= d2.evaluated
      ), 0)
    ) as j from due d
  ),
  days as (
    select generate_series((current_date - 13)::timestamp, current_date::timestamp, interval '1 day')::date as day
  ),
  daily as (
    select jsonb_agg(jsonb_build_object(
      'day', d.day,
      'signups', (select count(*) from auth.users u where u.created_at::date = d.day),
      'submissions', (select count(*) from public.turn_submissions ts where ts.submitted_at::date = d.day),
      'active', (
        select count(distinct x.uid) from (
          select e.user_id as uid from public.analytics_events e where e.created_at::date = d.day
          union
          select ts.profile_id from public.turn_submissions ts where ts.submitted_at::date = d.day
          union
          select sp.profile_id from public.season_players sp where sp.joined_at::date = d.day and sp.profile_id is not null
        ) x
      )
    ) order by d.day) as j
    from days d
  ),
  events as (
    select coalesce(jsonb_agg(jsonb_build_object('event', t.event, 'count', t.n, 'users', t.users) order by t.n desc), '[]'::jsonb) as j
    from (
      select e.event, count(*) as n, count(distinct e.user_id) as users
      from public.analytics_events e
      where e.created_at > now() - interval '7 days'
      group by e.event
      order by count(*) desc
      limit 12
    ) t
  ),
  -- Wochenkohorten nach Registrierung: Größe, Anteil mit Partie, Anteil der
  -- in den letzten sieben Tagen noch aktiv war.
  cohorts as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'week', t.week, 'size', t.size, 'joined', t.joined, 'active_7d', t.active_7d
    ) order by t.week desc), '[]'::jsonb) as j
    from (
      select date_trunc('week', a.created_at)::date as week,
        count(*) as size,
        count(*) filter (where a.joined) as joined,
        count(*) filter (where a.last_active > now() - interval '7 days') as active_7d
      from activity a
      where a.created_at > now() - interval '8 weeks'
      group by 1
    ) t
  ),
  universes as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', u.name, 'is_active', u.is_active,
      'members', (select count(*) from public.profile_universes pu where pu.universe_id = u.id),
      'running', (select count(*) from public.seasons s where s.universe_id = u.id and s.status = 'running'),
      'finished', (select count(*) from public.seasons s where s.universe_id = u.id and s.status = 'finished')
    ) order by u.sort_order, u.name), '[]'::jsonb) as j
    from public.universes u
  )
  select jsonb_build_object(
    'generated_at', now(),
    'users', (select j from users),
    'funnel', (select j from funnel),
    'seasons', (select j from seasons),
    'discipline', (select j from discipline),
    'daily', (select j from daily),
    'events', (select j from events),
    'cohorts', (select j from cohorts),
    'universes', (select j from universes)
  ) into v;

  return v;
end;
$$;

comment on function public.admin_dashboard_stats() is
  'Kennzahlen für die Admin-Übersicht: Konten, Trichter, Partien, Abgabedisziplin, Tagesverlauf, Ereignisse, Kohorten, Universen.';

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- Nutzerliste: wie bisher, dazu Aktivität, laufende Partien, Abgabedisziplin,
-- Herkunft (Zugangscode) und Admin-Rolle. Die bisherigen Spalten bleiben in
-- Name und Bedeutung unverändert.
drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  access_status text,
  access_requested_at timestamptz,
  access_decided_at timestamptz,
  access_note text,
  request_message text,
  universes jsonb,
  seasons_played bigint,
  seasons_won bigint,
  max_score numeric,
  avg_score numeric,
  max_tvcc numeric,
  avg_tvcc numeric,
  max_irr numeric,
  avg_irr numeric,
  max_tvpi numeric,
  avg_tvpi numeric,
  last_active timestamptz,
  last_sign_in_at timestamptz,
  seasons_active bigint,
  turns_submitted bigint,
  turns_due bigint,
  access_code text,
  access_code_label text,
  is_admin boolean,
  is_root boolean,
  analytics_opt_out boolean
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
      (r ->> 'tvcc')::numeric as tvcc,
      (r ->> 'irr')::numeric as irr,
      (r ->> 'tvpi')::numeric as tvpi,
      row_number() over (partition by s.id order by (r ->> 'score')::numeric desc) as season_rank
    from public.seasons s
    cross join lateral jsonb_array_elements(s.final_ranking) as r
    where s.status = 'finished'
  ),
  entries as (
    select profile_id_text::uuid as profile_id, score, tvcc, irr, tvpi, season_rank
    from ranked
    where profile_id_text is not null
  ),
  stats as (
    select
      profile_id,
      count(*) as seasons_played,
      count(*) filter (where season_rank = 1) as seasons_won,
      max(score) as max_score, avg(score) as avg_score,
      max(tvcc) as max_tvcc, avg(tvcc) as avg_tvcc,
      max(irr) as max_irr, avg(irr) as avg_irr,
      max(tvpi) as max_tvpi, avg(tvpi) as avg_tvpi
    from entries
    group by profile_id
  ),
  -- Fällige und abgegebene Halbjahre je Spieler über alle gestarteten Partien
  turns as (
    select sp.profile_id,
      count(*) filter (where s.status in ('lobby', 'running')) as seasons_active,
      sum(case when s.status = 'finished' then s.current_half_year
               when s.status = 'running' then greatest(s.current_half_year - 1, 0)
               else 0 end) as turns_due,
      sum((select count(*) from public.turn_submissions ts
           where ts.season_id = s.id and ts.profile_id = sp.profile_id
             and ts.half_year <= case when s.status = 'finished' then s.current_half_year else s.current_half_year - 1 end
             and s.status in ('running', 'finished'))) as turns_submitted
    from public.season_players sp
    join public.seasons s on s.id = sp.season_id
    where sp.profile_id is not null
    group by sp.profile_id
  )
  select
    u.id,
    u.email::text,
    p.display_name,
    u.created_at,
    coalesce(p.access_status, 'none'),
    p.access_requested_at,
    p.access_decided_at,
    p.access_note,
    p.request_message,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('id', un.id, 'key', un.key, 'name', un.name)
                         order by un.sort_order, un.name)
        from public.profile_universes pu
        join public.universes un on un.id = pu.universe_id
        where pu.profile_id = p.id
      ),
      '[]'::jsonb
    ),
    coalesce(st.seasons_played, 0), coalesce(st.seasons_won, 0),
    st.max_score, st.avg_score, st.max_tvcc, st.avg_tvcc, st.max_irr, st.avg_irr, st.max_tvpi, st.avg_tvpi,
    greatest(
      p.last_seen_at,
      (select max(sp.joined_at) from public.season_players sp where sp.profile_id = u.id),
      (select max(ts.submitted_at) from public.turn_submissions ts where ts.profile_id = u.id)
    ),
    u.last_sign_in_at,
    coalesce(t.seasons_active, 0),
    coalesce(t.turns_submitted, 0)::bigint,
    coalesce(t.turns_due, 0)::bigint,
    ac.code,
    ac.label,
    (lower(u.email) = 'thematicum.dev@gmail.com' or exists (select 1 from public.app_admins a where a.user_id = u.id)),
    (lower(u.email) = 'thematicum.dev@gmail.com'),
    coalesce(p.analytics_opt_out, false)
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join stats st on st.profile_id = u.id
  left join turns t on t.profile_id = u.id
  left join public.access_codes ac on ac.id = p.access_code_id
  order by
    case coalesce(p.access_status, 'none')
      when 'pending' then 0
      when 'none' then 1
      when 'rejected' then 2
      else 3
    end,
    u.created_at desc;
end;
$$;

comment on function public.admin_list_users() is
  'Admin-Übersicht aller Konten: E-Mail, Zugangsstatus, Universen, Partien-Statistik, letzte Aktivität, Abgabedisziplin, Zugangscode und Admin-Rolle. Offene Anfragen zuerst.';

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
