-- Mehrere Administratoren und ein Protokoll ihrer Eingriffe.
--
-- Bis hierher war der Admin-Zugang fest an eine einzige E-Mail-Adresse
-- gebunden (is_admin(), 20260819110000_admin_access.sql). Für einen Betrieb
-- mit mehr als einer Person reicht das nicht: Wer Support leistet, braucht
-- den Admin-Bereich, ohne das Postfach des Gründers zu teilen. Und sobald
-- mehrere Personen freigeben, sperren und Partien zurücksetzen, muss
-- nachvollziehbar sein, wer was getan hat.
--
--   app_admins        zusätzlich ernannte Administratoren
--   is_root_admin()   der fest hinterlegte Account — nur er ernennt und entzieht
--   is_admin()        Root ODER ernannt; alle bestehenden admin_*-Funktionen
--                     prüfen weiterhin genau diese Funktion
--   admin_audit_log   wer hat wann was getan

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);

comment on table public.app_admins is
  'Zusätzlich ernannte Administratoren. Der Root-Account steht nicht hier, sondern fest in is_root_admin().';

alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

create or replace function public.is_root_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and lower(email) = 'thematicum.dev@gmail.com'
  );
$$;

comment on function public.is_root_admin() is
  'True nur für den fest hinterlegten Admin-Account. Er allein ernennt weitere Administratoren.';

revoke all on function public.is_root_admin() from public, anon;
grant execute on function public.is_root_admin() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_root_admin()
      or exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

comment on function public.is_admin() is
  'True für den Root-Account und für ernannte Administratoren (app_admins). Grundlage sämtlicher admin_*-Funktionen.';

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  admin_email text,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_log_action_format check (action ~ '^[a-z][a-z0-9_.]{1,59}$')
);

comment on table public.admin_audit_log is
  'Protokoll der Admin-Eingriffe. Nur über admin_log() geschrieben, nur über admin_list_audit() gelesen; kein UPDATE, kein DELETE.';

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- Einen Eingriff festhalten. Die E-Mail des Handelnden wird mitgeschrieben,
-- damit der Eintrag lesbar bleibt, wenn das Konto später gelöscht wird.
create or replace function public.admin_log(p_action text, p_target text default null, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  insert into public.admin_audit_log (admin_id, admin_email, action, target, details)
  values (
    v_uid,
    (select u.email::text from auth.users u where u.id = v_uid),
    p_action,
    left(p_target, 200),
    case when jsonb_typeof(coalesce(p_details, '{}'::jsonb)) = 'object' then coalesce(p_details, '{}'::jsonb) else '{}'::jsonb end
  );
end;
$$;

revoke all on function public.admin_log(text, text, jsonb) from public, anon;
grant execute on function public.admin_log(text, text, jsonb) to authenticated;

create or replace function public.admin_list_audit(p_limit integer default 100)
returns table (
  id bigint,
  admin_email text,
  action text,
  target text,
  details jsonb,
  created_at timestamptz
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
  select l.id, l.admin_email, l.action, l.target, l.details, l.created_at
  from public.admin_audit_log l
  order by l.created_at desc, l.id desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

revoke all on function public.admin_list_audit(integer) from public, anon;
grant execute on function public.admin_list_audit(integer) to authenticated;

-- Administrator ernennen oder entziehen. Nur der Root-Account: sonst könnte
-- ein ernannter Admin beliebig weitere ernennen oder den Root aussperren.
create or replace function public.admin_set_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if not public.is_root_admin() then
    raise exception 'not_root_admin';
  end if;
  select u.email::text into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then
    raise exception 'user_not_found';
  end if;
  if p_is_admin then
    insert into public.app_admins (user_id, granted_by)
    values (p_user_id, auth.uid())
    on conflict (user_id) do nothing;
  else
    delete from public.app_admins where user_id = p_user_id;
  end if;
  perform public.admin_log(
    case when p_is_admin then 'admin.grant' else 'admin.revoke' end,
    v_email,
    jsonb_build_object('user_id', p_user_id)
  );
end;
$$;

comment on function public.admin_set_admin(uuid, boolean) is
  'Ernennt einen Nutzer zum Administrator oder entzieht ihm die Rolle. Nur für den Root-Account.';

revoke all on function public.admin_set_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;
