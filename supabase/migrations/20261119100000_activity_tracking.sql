-- Aktivität und Nutzungsereignisse.
--
-- Bis hierher ließ sich nur aus Spieldaten ablesen, ob jemand aktiv ist
-- (Beitritt, Abgabe). Wer sich anmeldet, die Einführung ansieht, im
-- Übungsmodus spielt oder nur die Rangliste liest, hinterließ keine Spur —
-- und genau diese Schritte entscheiden, ob aus einer Registrierung ein
-- Spieler wird.
--
-- Zwei Dinge kommen dazu:
--
--   profiles.last_seen_at   zuletzt in der App gesehen (höchstens alle fünf
--                           Minuten fortgeschrieben)
--   analytics_events        benannte Ereignisse des eigenen Clients
--                           (Seitenaufruf, Übungspartie begonnen …)
--
-- Datenschutz: ausschließlich eigene Erhebung in der eigenen Datenbank, kein
-- Drittanbieter, keine Cookies. Ereignisse hängen am Konto und verschwinden
-- mit ihm (on delete cascade). Wer die Auswertung nicht möchte, schaltet sie
-- im Profil ab (analytics_opt_out) — dann wird nur noch last_seen_at
-- geführt, das der Betrieb braucht (inaktive Konten, Fristen).

alter table public.profiles
  add column last_seen_at timestamptz,
  add column analytics_opt_out boolean not null default false,
  add column terms_accepted_at timestamptz;

comment on column public.profiles.last_seen_at is
  'Zuletzt in der App gesehen. Fortgeschrieben von track_event(), höchstens alle fünf Minuten.';
comment on column public.profiles.analytics_opt_out is
  'True: keine Nutzungsereignisse für dieses Konto aufzeichnen (Einstellung im Profil).';
comment on column public.profiles.terms_accepted_at is
  'Zeitpunkt, zu dem Nutzungsbedingungen und Datenschutzhinweise bestätigt wurden.';

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event text not null,
  path text,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_format check (event ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint analytics_events_path_length check (path is null or char_length(path) <= 200),
  constraint analytics_events_props_size check (pg_column_size(props) <= 2048)
);

comment on table public.analytics_events is
  'Nutzungsereignisse des eigenen Clients. Geschrieben nur über track_event(), gelesen nur über admin_*-Funktionen.';

create index analytics_events_created_idx on public.analytics_events (created_at desc);
create index analytics_events_user_created_idx on public.analytics_events (user_id, created_at desc);
create index analytics_events_event_created_idx on public.analytics_events (event, created_at desc);

-- RLS ohne Policy: Kein Client liest oder schreibt die Tabelle direkt.
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;

-- Die neuen Spalten sind nicht für andere Spieler lesbar: authenticated hat
-- auf profiles nur Spaltenrechte (siehe 20260830100100_access_control.sql),
-- und diese drei kommen bewusst nicht dazu. Schreiben darf sie der Nutzer
-- nicht direkt — der Wächter setzt sie wie die Zugangsspalten zurück.
create or replace function public.profiles_guard_activity_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.last_seen_at := old.last_seen_at;
    new.analytics_opt_out := old.analytics_opt_out;
    new.terms_accepted_at := old.terms_accepted_at;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_activity_columns
  before update on public.profiles
  for each row
  execute function public.profiles_guard_activity_columns();

-- Ein Ereignis aufzeichnen. Bewusst nachsichtig: Messung darf die App nie
-- stören, deshalb wirft die Funktion bei unpassender Eingabe nicht, sondern
-- gibt false zurück.
--
-- Grenzen: 120 Ereignisse je Konto in zehn Minuten (ein hängender Tab oder
-- ein Skript soll die Tabelle nicht füllen), Name nach festem Muster,
-- Eigenschaften höchstens 2 kB.
create or replace function public.track_event(
  p_event text,
  p_props jsonb default '{}'::jsonb,
  p_path text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_opt_out boolean;
  v_recent integer;
  v_props jsonb := coalesce(p_props, '{}'::jsonb);
begin
  if v_uid is null then
    return false;
  end if;

  -- Betrieblich nötig und unabhängig von der Auswertung: zuletzt gesehen
  update public.profiles
  set last_seen_at = now()
  where id = v_uid
    and (last_seen_at is null or last_seen_at < now() - interval '5 minutes');

  select p.analytics_opt_out into v_opt_out from public.profiles p where p.id = v_uid;
  if coalesce(v_opt_out, false) then
    return false;
  end if;

  if p_event is null or p_event !~ '^[a-z][a-z0-9_]{1,39}$' then
    return false;
  end if;
  if jsonb_typeof(v_props) <> 'object' or pg_column_size(v_props) > 2048 then
    v_props := '{}'::jsonb;
  end if;

  select count(*) into v_recent
  from public.analytics_events e
  where e.user_id = v_uid and e.created_at > now() - interval '10 minutes';
  if v_recent >= 120 then
    return false;
  end if;

  insert into public.analytics_events (user_id, event, path, props)
  values (v_uid, p_event, left(p_path, 200), v_props);
  return true;
end;
$$;

comment on function public.track_event(text, jsonb, text) is
  'Zeichnet ein Nutzungsereignis des angemeldeten Kontos auf und schreibt last_seen_at fort. Wirft nie; false heißt nicht aufgezeichnet.';

revoke all on function public.track_event(text, jsonb, text) from public, anon;
grant execute on function public.track_event(text, jsonb, text) to authenticated;

-- Eigene Einstellungen lesen und setzen.
create or replace function public.my_preferences()
returns table (analytics_opt_out boolean, terms_accepted_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select p.analytics_opt_out, p.terms_accepted_at
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.my_preferences() from public, anon;
grant execute on function public.my_preferences() to authenticated;

create or replace function public.set_my_preferences(p_analytics_opt_out boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  update public.profiles
  set analytics_opt_out = coalesce(p_analytics_opt_out, false)
  where id = v_uid;
  -- Wer die Auswertung abschaltet, will auch das Bisherige nicht behalten wissen
  if coalesce(p_analytics_opt_out, false) then
    delete from public.analytics_events where user_id = v_uid;
  end if;
end;
$$;

comment on function public.set_my_preferences(boolean) is
  'Schaltet die Nutzungsauswertung für das eigene Konto ab oder an. Abschalten löscht die bisher aufgezeichneten Ereignisse.';

revoke all on function public.set_my_preferences(boolean) from public, anon;
grant execute on function public.set_my_preferences(boolean) to authenticated;

-- Bestätigung der Nutzungsbedingungen festhalten (einmalig, beim Onboarding).
create or replace function public.accept_terms()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set terms_accepted_at = coalesce(terms_accepted_at, now())
  where id = auth.uid();
$$;

revoke all on function public.accept_terms() from public, anon;
grant execute on function public.accept_terms() to authenticated;

-- Aufbewahrung: Ereignisse älter als 13 Monate braucht keine Auswertung mehr.
select cron.schedule(
  'purge-analytics-events',
  '17 3 * * *',
  $$delete from public.analytics_events where created_at < now() - interval '13 months'$$
);
