-- Admin-Werkzeuge für die Zugangskontrolle: Anfragen sehen, freigeben oder
-- ablehnen, Universen zuteilen und neue Universen anlegen. Wie alle
-- admin_*-Funktionen prüft jede einzelne selbst noch einmal is_admin() und
-- bricht sonst mit einer Exception ab (nicht nur mit leeren Zeilen).

-- Übersicht aller Universen inkl. Zahl der zugeteilten Spieler und Partien.
create or replace function public.admin_list_universes()
returns table (
  id uuid,
  key text,
  name text,
  description text,
  is_active boolean,
  sort_order integer,
  member_count bigint,
  season_count bigint
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
    u.id, u.key, u.name, u.description, u.is_active, u.sort_order,
    (select count(*) from public.profile_universes pu where pu.universe_id = u.id),
    (select count(*) from public.seasons s where s.universe_id = u.id)
  from public.universes u
  order by u.sort_order, u.name;
end;
$$;

create or replace function public.admin_create_universe(
  p_key text,
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  insert into public.universes (key, name, description, sort_order)
  values (
    lower(btrim(p_key)),
    btrim(p_name),
    nullif(btrim(coalesce(p_description, '')), ''),
    coalesce((select max(sort_order) + 10 from public.universes), 10)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_update_universe(
  p_universe_id uuid,
  p_name text,
  p_description text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  update public.universes
  set name = btrim(p_name),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      is_active = p_is_active
  where id = p_universe_id;

  if not found then
    raise exception 'universe_not_found';
  end if;
end;
$$;

revoke all on function public.admin_list_universes() from public, anon;
revoke all on function public.admin_create_universe(text, text, text) from public, anon;
revoke all on function public.admin_update_universe(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_list_universes() to authenticated;
grant execute on function public.admin_create_universe(text, text, text) to authenticated;
grant execute on function public.admin_update_universe(uuid, text, text, boolean) to authenticated;

-- Freigeben/Ablehnen und Universen zuteilen in einem Schritt: beides gehört
-- zusammen (eine Freigabe ohne Universum nützt niemandem) und muss deshalb
-- in derselben Transaktion passieren.
create or replace function public.admin_set_user_access(
  p_profile_id uuid,
  p_status text,
  p_universe_ids uuid[] default array[]::uuid[],
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ids uuid[] := coalesce(p_universe_ids, array[]::uuid[]);
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid_status';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'profile_not_found';
  end if;
  if exists (
    select 1 from unnest(v_ids) as want(id)
    where not exists (select 1 from public.universes u where u.id = want.id)
  ) then
    raise exception 'universe_not_found';
  end if;

  -- Eine Ablehnung (oder ein Zurücksetzen auf 'pending') entzieht immer alle
  -- Universen: sonst bliebe die Sichtbarkeit trotz entzogenem Zugang bestehen.
  if p_status <> 'approved' then
    v_ids := array[]::uuid[];
  end if;

  delete from public.profile_universes pu
  where pu.profile_id = p_profile_id
    and not (pu.universe_id = any (v_ids));

  insert into public.profile_universes (profile_id, universe_id, granted_by)
  select p_profile_id, want.id, v_uid
  from unnest(v_ids) as want(id)
  on conflict (profile_id, universe_id) do nothing;

  update public.profiles p
  set access_status = p_status,
      access_decided_at = now(),
      access_decided_by = v_uid,
      access_note = nullif(btrim(coalesce(p_note, '')), ''),
      -- Das aktive Universum muss immer eines der zugeteilten sein.
      active_universe_id = (
        select pu.universe_id
        from public.profile_universes pu
        join public.universes u on u.id = pu.universe_id
        where pu.profile_id = p_profile_id
          and (p.active_universe_id is null or pu.universe_id = p.active_universe_id)
        order by (pu.universe_id = p.active_universe_id) desc, u.sort_order, u.name
        limit 1
      )
  where p.id = p_profile_id;
end;
$$;

comment on function public.admin_set_user_access(uuid, text, uuid[], text) is
  'Freigabe/Ablehnung eines Spielers samt vollständiger Universums-Zuteilung (die übergebene Liste ersetzt die bisherige).';

revoke all on function public.admin_set_user_access(uuid, text, uuid[], text) from public, anon;
grant execute on function public.admin_set_user_access(uuid, text, uuid[], text) to authenticated;

-- Nutzerübersicht um Zugangsstatus und Universen erweitert. Jetzt mit LEFT
-- JOIN auf profiles, damit auch registrierte Konten auftauchen, die das
-- Onboarding noch nicht abgeschlossen haben (E-Mail bestätigt, aber noch
-- kein Anzeigename -- die tauchten bisher nirgends auf).
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
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
    st.max_score, st.avg_score, st.max_tvpi, st.avg_tvpi, st.max_irr, st.avg_irr
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join stats st on st.profile_id = u.id
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
  'Admin-Übersicht aller Konten inkl. E-Mail, Zugangsstatus, zugeteilten Universen und Partien-Statistik. Offene Anfragen zuerst.';

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- Partienübersicht um das Universum ergänzt.
drop function if exists public.admin_list_seasons();

create or replace function public.admin_list_seasons()
returns table (
  id uuid,
  status text,
  current_half_year integer,
  current_half_year_deadline timestamptz,
  lobby_opened_at timestamptz,
  started_at timestamptz,
  created_by_name text,
  universe_name text,
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
    u.name,
    (select count(*) from public.season_players sp where sp.season_id = s.id and sp.is_ai = false),
    (select count(*) from public.season_players sp where sp.season_id = s.id and sp.is_ai = true),
    (select count(*) from public.turn_submissions ts where ts.season_id = s.id and ts.half_year = s.current_half_year),
    s.cancelled_reason
  from public.seasons s
  left join public.profiles p on p.id = s.created_by
  left join public.universes u on u.id = s.universe_id
  order by s.created_at desc;
end;
$$;

comment on function public.admin_list_seasons() is
  'Admin-Übersicht aller Partien inkl. Universum, Spielerzahl und Abgabestand des laufenden Halbjahres. Nur für is_admin().';

revoke all on function public.admin_list_seasons() from public, anon;
grant execute on function public.admin_list_seasons() to authenticated;
