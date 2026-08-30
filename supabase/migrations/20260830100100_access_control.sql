-- Zugangskontrolle: Ein neu registrierter Nutzer legt beim Onboarding nur
-- noch eine ANFRAGE an (profiles.access_status = 'pending'). Erst wenn der
-- Admin freigibt und mindestens ein Universum zuteilt, kann er das Spiel
-- benutzen. Vorher sieht er weder Partien noch Ranglisten -- nicht nur in
-- der Oberfläche, sondern auch in der Datenbank: die Sichtbarkeit hängt an
-- der Universums-Mitgliedschaft (siehe 20260830100200_universe_seasons.sql),
-- und die hat ein nicht freigegebener Nutzer schlicht nicht.

alter table public.profiles
  add column access_status text not null default 'pending'
    constraint profiles_access_status_check
    check (access_status in ('pending', 'approved', 'rejected')),
  add column access_requested_at timestamptz not null default now(),
  add column access_decided_at timestamptz,
  add column access_decided_by uuid references auth.users (id) on delete set null,
  add column access_note text,
  add column request_message text,
  add column active_universe_id uuid references public.universes (id) on delete set null;

comment on column public.profiles.access_status is
  'pending = Freigabe angefragt, approved = vom Admin freigegeben, rejected = abgelehnt.';
comment on column public.profiles.access_note is
  'Notiz des Admins zur Entscheidung (z. B. Ablehnungsgrund). Wird dem Nutzer angezeigt.';
comment on column public.profiles.request_message is
  'Optionale Nachricht des Nutzers bei der Zugangsanfrage.';
comment on column public.profiles.active_universe_id is
  'Aktuell gewähltes Universum. Muss ein zugeteiltes Universum sein (siehe profiles_guard_access_columns()).';

-- Zuteilung: welcher Spieler darf in welchen Universen spielen. Mehrere
-- Universen je Spieler sind ausdrücklich vorgesehen.
create table public.profile_universes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  universe_id uuid not null references public.universes (id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null,
  primary key (profile_id, universe_id)
);

comment on table public.profile_universes is
  'Vom Admin zugeteilte Universen je Spieler. Ohne Eintrag sieht ein Spieler in dem Universum nichts.';

create index profile_universes_universe_idx on public.profile_universes (universe_id);

alter table public.profile_universes enable row level security;

-- Jeder sieht nur seine eigenen Zuteilungen. Geschrieben wird ausschließlich
-- über die admin_*-Funktionen (kein INSERT/UPDATE/DELETE für authenticated).
create policy "profile_universes_select_own"
  on public.profile_universes
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

-- Bestandsnutzer: Wer vor der Zugangskontrolle bereits ein Profil hatte,
-- spielt weiter -- freigegeben und im Live-Universum.
update public.profiles
set access_status = 'approved',
    access_decided_at = now(),
    active_universe_id = (select id from public.universes where key = 'live')
where access_status = 'pending';

insert into public.profile_universes (profile_id, universe_id)
select p.id, u.id
from public.profiles p
cross join public.universes u
where u.key = 'live'
on conflict do nothing;

-- Mitgliedschaftsprüfung als Baustein für RLS-Policies (gleiches Muster wie
-- is_season_member): SECURITY DEFINER, gibt nur ein boolean zurück.
create or replace function public.is_universe_member(p_universe_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_universes pu
    join public.profiles p on p.id = pu.profile_id
    where pu.profile_id = auth.uid()
      and pu.universe_id = p_universe_id
      and p.access_status = 'approved'
  );
$$;

comment on function public.is_universe_member(uuid) is
  'True, wenn der angemeldete Nutzer freigegeben ist UND dieses Universum zugeteilt bekommen hat.';

-- Ist der angemeldete Nutzer überhaupt spielberechtigt (freigegeben und
-- mindestens ein Universum)? Grundlage für join_season/create_and_join_season.
create or replace function public.has_game_access()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_universes pu on pu.profile_id = p.id
    where p.id = auth.uid()
      and p.access_status = 'approved'
  );
$$;

revoke all on function public.is_universe_member(uuid) from public, anon;
revoke all on function public.has_game_access() from public, anon;
grant execute on function public.is_universe_member(uuid) to authenticated;
grant execute on function public.has_game_access() to authenticated;

-- Ein Nutzer darf sein Profil weiterhin selbst ändern (Anzeigename), aber
-- niemals seinen eigenen Zugangsstatus. RLS allein reicht dafür nicht: eine
-- WITH CHECK-Bedingung kann den alten Wert nicht sehen. Deshalb ein
-- Trigger, der bei einem direkten Client-UPDATE (Rolle 'authenticated' bzw.
-- 'anon') alle Zugangsspalten stur auf den alten Stand zurücksetzt.
--
-- Ausdrücklich OHNE security definer: die Funktion muss sehen, unter welcher
-- Rolle das UPDATE wirklich läuft. Mit SECURITY DEFINER wäre current_user
-- immer der Funktionseigentümer -- die Prüfung liefe damit ins Leere und
-- jeder Nutzer könnte sich selbst freigeben. Die admin_*- und
-- request_access-Funktionen laufen ihrerseits als SECURITY DEFINER unter der
-- Eigentümerrolle und sind deshalb von der Sperre nicht betroffen.
create or replace function public.profiles_guard_access_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.access_status := old.access_status;
    new.access_requested_at := old.access_requested_at;
    new.access_decided_at := old.access_decided_at;
    new.access_decided_by := old.access_decided_by;
    new.access_note := old.access_note;
    new.request_message := old.request_message;

    -- Das aktive Universum darf der Nutzer selbst wechseln -- aber nur auf
    -- eines, das ihm auch zugeteilt wurde.
    if new.active_universe_id is distinct from old.active_universe_id
       and new.active_universe_id is not null
       and not public.is_universe_member(new.active_universe_id) then
      raise exception 'universe_not_granted';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_access_columns
  before update on public.profiles
  for each row
  execute function public.profiles_guard_access_columns();

-- Profile werden nicht mehr direkt vom Client angelegt (sonst könnte sich
-- ein Nutzer beim INSERT selbst auf 'approved' setzen), sondern nur noch
-- über request_access().
drop policy if exists "profiles_insert_own" on public.profiles;

create or replace function public.request_access(p_display_name text, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(p_display_name);
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_is_admin boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_exists';
  end if;

  -- Der Admin-Account braucht niemanden, der ihn freigibt -- sonst käme
  -- nach einem Neuaufsetzen der Datenbank niemand mehr an die Freigaben.
  v_is_admin := public.is_admin();

  insert into public.profiles (id, display_name, request_message, access_status, access_decided_at)
  values (
    v_uid,
    v_name,
    v_message,
    case when v_is_admin then 'approved' else 'pending' end,
    case when v_is_admin then now() else null end
  );

  if v_is_admin then
    insert into public.profile_universes (profile_id, universe_id, granted_by)
    select v_uid, u.id, v_uid from public.universes u
    on conflict do nothing;

    update public.profiles
    set active_universe_id = (select id from public.universes order by sort_order, name limit 1)
    where id = v_uid;
  end if;
end;
$$;

comment on function public.request_access(text, text) is
  'Legt das eigene Profil als Zugangsanfrage an (access_status = pending). Einziger Weg, ein Profil zu erzeugen.';

revoke all on function public.request_access(text, text) from public, anon;
grant execute on function public.request_access(text, text) to authenticated;

-- Die Nachricht an den Admin und dessen Notiz zur Entscheidung gehen die
-- übrigen Spieler nichts an. RLS arbeitet zeilenweise und kann das nicht
-- trennen (Anzeigenamen müssen für Ranglisten und Lobbys weiterhin für alle
-- lesbar sein), Spaltenrechte dagegen schon: 'authenticated' darf ab hier
-- nur noch die unbedenklichen Spalten von profiles lesen. Der eigene
-- Zugangsstand kommt stattdessen aus my_access() (siehe unten), die
-- Admin-Sicht aus admin_list_users().
revoke select on public.profiles from authenticated, anon;
grant select (id, display_name, created_at, updated_at, access_status, active_universe_id)
  on public.profiles to authenticated;

-- Der eigene Zugangsstand inklusive der beiden geschützten Spalten.
create or replace function public.my_access()
returns table (
  display_name text,
  access_status text,
  access_note text,
  request_message text,
  active_universe_id uuid
)
language sql
security definer
stable
set search_path = public
as $$
  select p.display_name, p.access_status, p.access_note, p.request_message, p.active_universe_id
  from public.profiles p
  where p.id = auth.uid();
$$;

comment on function public.my_access() is
  'Zugangsstand des angemeldeten Nutzers (Status, Notiz des Admins, eigene Nachricht). Liefert keine Zeile, solange noch keine Anfrage gestellt wurde.';

revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;
