-- Laufende Partie abbrechen.
--
-- Ist der Spieler der einzige Mensch in der Partie (die übrigen Plätze sind
-- KI-Fonds), bricht er sie sofort ab. Sitzen weitere Menschen darin, wird
-- daraus eine Anfrage an sie: Stimmen alle übrigen zu, ist die Partie
-- abgebrochen; lehnt auch nur einer ab, wird weitergespielt. Der Antragsteller
-- kann seine offene Anfrage auf demselben Weg zurückziehen (Ablehnung durch
-- ihn selbst). Solange eine Anfrage offen ist, läuft die Partie normal weiter
-- -- Abgaben und Auswertungen sind davon unberührt.
--
-- Eine abgebrochene Partie bekommt status = 'cancelled' mit dem neuen
-- cancelled_reason = 'aborted'. Sie fällt damit aus allen Auswertungen
-- (list_seasons_for_evaluation_sweep und claim_* verlangen 'running'), aus
-- den Ranglisten (nur 'finished') und aus der Grenze für aktive Partien (nur
-- 'lobby'/'running'), und Abgaben sind gesperrt (turn_submissions-Policies
-- verlangen 'running'). Das Claim-Token wird mit gelöscht: Eine Auswertung,
-- die im Moment des Abbruchs gerade rechnet, scheitert beim Commit an
-- stale_or_missing_claim, statt die Partie danach noch weiterzuschreiben.
--
-- Beide Tabellen sind für Mitspieler lesbar (wer wann abbrechen wollte, wer
-- schon zugestimmt hat -- nichts davon ist geheim) und werden ausschließlich
-- über die SECURITY DEFINER-Funktionen unten geschrieben.

alter table public.seasons
  drop constraint seasons_cancelled_reason_check;

alter table public.seasons
  add constraint seasons_cancelled_reason_check
  check (cancelled_reason in ('empty', 'creator_deleted', 'aborted'));

create table public.season_abort_requests (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  status text not null default 'pending'
    constraint season_abort_requests_status_check check (status in ('pending', 'accepted', 'rejected')),
  decided_at timestamptz,
  -- Bei 'rejected': wer abgelehnt hat (der Antragsteller selbst = zurückgezogen).
  -- Bei 'accepted': wessen Zustimmung den Abbruch ausgelöst hat.
  decided_by uuid references public.profiles (id) on delete set null
);

comment on table public.season_abort_requests is
  'Anfragen, eine laufende Partie abzubrechen. Höchstens eine offene je Partie.';

create unique index season_abort_requests_one_pending_idx
  on public.season_abort_requests (season_id)
  where status = 'pending';

create index season_abort_requests_season_idx
  on public.season_abort_requests (season_id, requested_at desc);

-- Zustimmungen. Eine Ablehnung braucht keine Zeile: Sie beendet die Anfrage
-- sofort. season_id steht redundant hier, damit Realtime danach filtern kann.
create table public.season_abort_votes (
  request_id uuid not null references public.season_abort_requests (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (request_id, profile_id)
);

comment on table public.season_abort_votes is
  'Zustimmungen zu einer Abbruch-Anfrage (season_abort_requests). Der Antragsteller stimmt mit seiner Anfrage zu.';

alter table public.season_abort_requests enable row level security;
alter table public.season_abort_votes enable row level security;

create policy "season_abort_requests_select"
  on public.season_abort_requests
  for select
  to authenticated
  using (public.is_season_member(season_id));

create policy "season_abort_votes_select"
  on public.season_abort_votes
  for select
  to authenticated
  using (public.is_season_member(season_id));

alter publication supabase_realtime add table public.season_abort_requests;
alter publication supabase_realtime add table public.season_abort_votes;

-- Bricht eine laufende Partie ab. Nur intern; der Aufrufer hält die
-- seasons-Zeile bereits gesperrt und hat 'running' geprüft.
create or replace function public.abort_running_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.seasons
  set status = 'cancelled', cancelled_reason = 'aborted',
      current_half_year_deadline = null,
      evaluation_lock_token = null, evaluation_lock_at = null
  where id = p_season_id;
end;
$$;

revoke all on function public.abort_running_season(uuid) from public, authenticated, anon;

-- Abbruch beantragen. Liefert 'aborted' (allein in der Partie, sofort
-- abgebrochen) oder 'requested' (Anfrage an die übrigen Mitspieler).
create or replace function public.request_season_abort(p_season_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_human_count int;
  v_request_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Dieselbe Zeilensperre wie Auswertung und Start: Ein gleichzeitiger Claim
  -- wartet, bis der Abbruch committed ist, und sieht danach 'cancelled'.
  select status into v_status
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null then
    raise exception 'season_not_found';
  end if;
  if not exists (
    select 1 from public.season_players
    where season_id = p_season_id and profile_id = v_uid
  ) then
    raise exception 'not_a_member';
  end if;
  if v_status <> 'running' then
    raise exception 'season_not_running';
  end if;

  select count(*) into v_human_count
  from public.season_players
  where season_id = p_season_id and is_ai = false;

  if v_human_count <= 1 then
    insert into public.season_abort_requests
      (season_id, requested_by, status, decided_at, decided_by)
    values (p_season_id, v_uid, 'accepted', now(), v_uid);
    perform public.abort_running_season(p_season_id);
    return 'aborted';
  end if;

  if exists (
    select 1 from public.season_abort_requests
    where season_id = p_season_id and status = 'pending'
  ) then
    raise exception 'abort_already_pending';
  end if;

  insert into public.season_abort_requests (season_id, requested_by)
  values (p_season_id, v_uid)
  returning id into v_request_id;

  insert into public.season_abort_votes (request_id, season_id, profile_id)
  values (v_request_id, p_season_id, v_uid);

  return 'requested';
end;
$$;

-- Auf eine offene Anfrage antworten. p_accept = false lehnt ab (bzw. zieht
-- die eigene Anfrage zurück) und beendet sie: 'rejected'. p_accept = true
-- stimmt zu: 'aborted', wenn damit alle Menschen der Partie zugestimmt haben,
-- sonst 'accepted'.
create or replace function public.respond_season_abort(p_season_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_request_id uuid;
  v_human_count int;
  v_accepted_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_accept is null then
    raise exception 'invalid_answer';
  end if;

  select status into v_status
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null then
    raise exception 'season_not_found';
  end if;
  if not exists (
    select 1 from public.season_players
    where season_id = p_season_id and profile_id = v_uid
  ) then
    raise exception 'not_a_member';
  end if;
  if v_status <> 'running' then
    raise exception 'season_not_running';
  end if;

  select id into v_request_id
  from public.season_abort_requests
  where season_id = p_season_id and status = 'pending'
  for update;

  if v_request_id is null then
    raise exception 'no_pending_abort';
  end if;

  if not p_accept then
    update public.season_abort_requests
    set status = 'rejected', decided_at = now(), decided_by = v_uid
    where id = v_request_id;
    return 'rejected';
  end if;

  insert into public.season_abort_votes (request_id, season_id, profile_id)
  values (v_request_id, p_season_id, v_uid)
  on conflict (request_id, profile_id) do nothing;

  select count(*) into v_human_count
  from public.season_players
  where season_id = p_season_id and is_ai = false;

  select count(*) into v_accepted_count
  from public.season_abort_votes v
  join public.season_players sp
    on sp.season_id = v.season_id and sp.profile_id = v.profile_id
  where v.request_id = v_request_id;

  if v_accepted_count >= v_human_count then
    update public.season_abort_requests
    set status = 'accepted', decided_at = now(), decided_by = v_uid
    where id = v_request_id;
    perform public.abort_running_season(p_season_id);
    return 'aborted';
  end if;

  return 'accepted';
end;
$$;

-- Stand für die Spielansicht: die jüngste Anfrage (offen oder entschieden)
-- samt Namen und Zählwerten, dazu die Zahl der Menschen in der Partie. Nur
-- für Mitspieler.
create or replace function public.season_abort_status(p_season_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_human_count int;
  v_request jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_season_member(p_season_id) then
    raise exception 'not_a_member';
  end if;

  select count(*) into v_human_count
  from public.season_players
  where season_id = p_season_id and is_ai = false;

  select jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'requestedBy', r.requested_by,
    'requestedByName', rp.display_name,
    'requestedByMe', coalesce(r.requested_by = v_uid, false),
    'requestedAt', r.requested_at,
    'decidedBy', r.decided_by,
    'decidedByName', dp.display_name,
    'decidedByMe', r.decided_by is not distinct from v_uid,
    'decidedAt', r.decided_at,
    'acceptedCount', (
      select count(*) from public.season_abort_votes v where v.request_id = r.id
    ),
    'acceptedByMe', exists (
      select 1 from public.season_abort_votes v where v.request_id = r.id and v.profile_id = v_uid
    )
  )
  into v_request
  from public.season_abort_requests r
  left join public.profiles rp on rp.id = r.requested_by
  left join public.profiles dp on dp.id = r.decided_by
  where r.season_id = p_season_id
  order by r.requested_at desc
  limit 1;

  return jsonb_build_object('humanCount', v_human_count, 'request', v_request);
end;
$$;

revoke all on function public.request_season_abort(uuid) from public, anon;
grant execute on function public.request_season_abort(uuid) to authenticated;
revoke all on function public.respond_season_abort(uuid, boolean) from public, anon;
grant execute on function public.respond_season_abort(uuid, boolean) to authenticated;
revoke all on function public.season_abort_status(uuid) from public, anon;
grant execute on function public.season_abort_status(uuid) to authenticated;

-- admin_reset_season(): räumt zusätzlich die Abbruch-Anfragen ab. Sonst
-- bliebe eine offene Anfrage über das Zurücksetzen hinweg stehen und
-- blockierte im neuen Durchgang jede weitere (one_pending_idx).
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

  delete from public.season_abort_requests where season_id = p_season_id;
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
