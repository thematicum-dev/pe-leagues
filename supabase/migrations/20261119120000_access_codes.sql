-- Zugangscodes: Freigabe ohne Handarbeit.
--
-- Jeder Zugang lief bisher über eine einzelne Entscheidung des Admins
-- (/admin/users). Für einen Pilotkreis ist das richtig, für einen Kurs mit
-- sechzig Teilnehmern oder einen Firmenkunden nicht: Niemand will sechzig
-- Anfragen einzeln freigeben, und niemand will nach der Registrierung
-- warten, bis jemand Zeit dafür hat.
--
-- Ein Zugangscode ist eine vorab erteilte Freigabe: Der Admin legt ihn für
-- genau ein Universum an, optional mit Höchstzahl an Einlösungen und
-- Ablaufdatum, und gibt ihn weiter. Wer ihn beim Onboarding eingibt, ist
-- sofort freigegeben und dem Universum zugeteilt. Die Einzelfreigabe bleibt
-- daneben unverändert bestehen.
--
-- Der Code ist damit auch die Einheit, in der sich Kontingente verkaufen und
-- abrechnen lassen: ein Code je Kunde oder Kurs, die Zahl der Einlösungen
-- steht dabei, und jedes Konto merkt sich, über welchen Code es kam.

create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  label text not null,
  universe_id uuid not null references public.universes (id) on delete cascade,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint access_codes_code_format check (code ~ '^[A-Z0-9][A-Z0-9-]{5,31}$'),
  constraint access_codes_label_length check (char_length(label) between 2 and 80),
  constraint access_codes_max_uses_positive check (max_uses is null or max_uses > 0)
);

comment on table public.access_codes is
  'Vorab erteilte Freigaben: Wer den Code beim Onboarding einlöst, ist sofort freigegeben und dem Universum zugeteilt.';

create unique index access_codes_code_unique_idx on public.access_codes (code);

alter table public.access_codes enable row level security;
revoke all on public.access_codes from anon, authenticated;

alter table public.profiles
  add column access_code_id uuid references public.access_codes (id) on delete set null;

comment on column public.profiles.access_code_id is
  'Zugangscode, über den dieses Konto freigegeben wurde (null bei Einzelfreigabe durch den Admin).';

-- Fehlversuche, damit sich Codes nicht durchprobieren lassen.
create table public.access_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index access_code_attempts_user_idx on public.access_code_attempts (user_id, created_at desc);
alter table public.access_code_attempts enable row level security;
revoke all on public.access_code_attempts from anon, authenticated;

create or replace function public.normalize_access_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
$$;

-- Code einlösen. Legt das Profil an (wie request_access) oder gibt ein
-- bereits wartendes Profil frei — wer erst ohne Code angefragt hat und den
-- Code danach bekommt, muss kein zweites Konto anlegen.
--
-- Gibt einen Status zurück, statt zu werfen: Ein Fehlversuch muss gezählt
-- werden, und eine Ausnahme würde genau diese Zählung zurückrollen.
--   'ok' | 'invalid_code' | 'code_expired' | 'code_exhausted' | 'too_many_attempts' | 'rejected'
create or replace function public.redeem_access_code(p_code text, p_display_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := public.normalize_access_code(p_code);
  v_row public.access_codes%rowtype;
  v_status text;
  v_name text := btrim(coalesce(p_display_name, ''));
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if (select count(*) from public.access_code_attempts a
      where a.user_id = v_uid and a.created_at > now() - interval '1 hour') >= 10 then
    return 'too_many_attempts';
  end if;

  select p.access_status into v_status from public.profiles p where p.id = v_uid;
  -- Eine Sperre durch den Admin hebt kein Code auf
  if v_status = 'rejected' then
    return 'rejected';
  end if;

  select * into v_row from public.access_codes c where c.code = v_code for update;
  if not found or not v_row.is_active then
    insert into public.access_code_attempts (user_id) values (v_uid);
    return 'invalid_code';
  end if;
  if v_row.expires_at is not null and v_row.expires_at <= now() then
    return 'code_expired';
  end if;

  -- Schon freigegeben und im Universum: nichts zu tun, nichts zu verbrauchen
  if v_status = 'approved' and exists (
    select 1 from public.profile_universes pu where pu.profile_id = v_uid and pu.universe_id = v_row.universe_id
  ) then
    return 'ok';
  end if;

  if v_row.max_uses is not null and v_row.used_count >= v_row.max_uses then
    return 'code_exhausted';
  end if;

  if v_status is null then
    -- Anzeigename: dieselben Regeln wie überall, durchgesetzt von den
    -- Constraints auf profiles (Länge, Zeichen, Eindeutigkeit).
    insert into public.profiles (id, display_name, access_status, access_decided_at, access_code_id)
    values (v_uid, v_name, 'approved', now(), v_row.id);
  else
    update public.profiles
    set access_status = 'approved',
        access_decided_at = now(),
        access_code_id = coalesce(access_code_id, v_row.id)
    where id = v_uid;
  end if;

  insert into public.profile_universes (profile_id, universe_id)
  values (v_uid, v_row.universe_id)
  on conflict do nothing;

  update public.profiles
  set active_universe_id = coalesce(active_universe_id, v_row.universe_id)
  where id = v_uid;

  update public.access_codes set used_count = used_count + 1 where id = v_row.id;
  return 'ok';
end;
$$;

comment on function public.redeem_access_code(text, text) is
  'Löst einen Zugangscode ein: legt das Profil freigegeben an bzw. gibt ein wartendes frei und teilt das Universum des Codes zu. Liefert einen Statustext.';

revoke all on function public.redeem_access_code(text, text) from public, anon;
grant execute on function public.redeem_access_code(text, text) to authenticated;

-- Der Wächter über die Zugangsspalten muss auch die neue Spalte schützen.
create or replace function public.profiles_guard_access_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.access_code_id := old.access_code_id;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_access_code
  before update on public.profiles
  for each row
  execute function public.profiles_guard_access_code();

-- ---------- Verwaltung ----------

create or replace function public.admin_create_access_code(
  p_label text,
  p_universe_id uuid,
  p_max_uses integer default null,
  p_expires_at timestamptz default null,
  p_code text default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text := nullif(public.normalize_access_code(p_code), '');
  -- ohne 0/O und 1/I: der Code wird abgetippt und vorgelesen
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_try integer := 0;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if not exists (select 1 from public.universes u where u.id = p_universe_id) then
    raise exception 'universe_not_found';
  end if;

  if v_code is null then
    loop
      v_code := 'PEL-';
      for i in 1..8 loop
        v_code := v_code || substr(v_alphabet, 1 + floor(random() * 32)::int, 1);
        if i = 4 then v_code := v_code || '-'; end if;
      end loop;
      exit when not exists (select 1 from public.access_codes c where c.code = v_code);
      v_try := v_try + 1;
      if v_try > 20 then raise exception 'code_generation_failed'; end if;
    end loop;
  end if;

  insert into public.access_codes (code, label, universe_id, max_uses, expires_at, created_by)
  values (v_code, btrim(p_label), p_universe_id, p_max_uses, p_expires_at, auth.uid());

  perform public.admin_log('access_code.create', v_code,
    jsonb_build_object('label', btrim(p_label), 'universe_id', p_universe_id, 'max_uses', p_max_uses, 'expires_at', p_expires_at));
  return v_code;
end;
$$;

revoke all on function public.admin_create_access_code(text, uuid, integer, timestamptz, text) from public, anon;
grant execute on function public.admin_create_access_code(text, uuid, integer, timestamptz, text) to authenticated;

create or replace function public.admin_set_access_code_active(p_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  update public.access_codes set is_active = p_is_active where id = p_id returning code into v_code;
  if v_code is null then
    raise exception 'code_not_found';
  end if;
  perform public.admin_log(case when p_is_active then 'access_code.activate' else 'access_code.deactivate' end, v_code);
end;
$$;

revoke all on function public.admin_set_access_code_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_access_code_active(uuid, boolean) to authenticated;

create or replace function public.admin_list_access_codes()
returns table (
  id uuid,
  code text,
  label text,
  universe_id uuid,
  universe_name text,
  max_uses integer,
  used_count integer,
  expires_at timestamptz,
  is_active boolean,
  created_at timestamptz,
  members bigint,
  members_played bigint,
  members_active_30d bigint
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
    c.id, c.code, c.label, c.universe_id, u.name, c.max_uses, c.used_count, c.expires_at, c.is_active, c.created_at,
    (select count(*) from public.profiles p where p.access_code_id = c.id),
    (select count(*) from public.profiles p where p.access_code_id = c.id
       and exists (select 1 from public.season_players sp where sp.profile_id = p.id)),
    (select count(*) from public.profiles p where p.access_code_id = c.id
       and p.last_seen_at > now() - interval '30 days')
  from public.access_codes c
  join public.universes u on u.id = c.universe_id
  order by c.created_at desc;
end;
$$;

comment on function public.admin_list_access_codes() is
  'Alle Zugangscodes mit Einlösungen und der Aktivität der darüber gekommenen Konten.';

revoke all on function public.admin_list_access_codes() from public, anon;
grant execute on function public.admin_list_access_codes() to authenticated;

select cron.schedule(
  'purge-access-code-attempts',
  '23 3 * * *',
  $$delete from public.access_code_attempts where created_at < now() - interval '2 days'$$
);
