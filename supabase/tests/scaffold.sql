-- Nachbau der Supabase-Umgebung, gerade so weit, wie die Migrationen sie
-- brauchen: Rollen, auth.uid(), Vault, Realtime-Publikation und die
-- Standardrechte von Supabase (RLS entscheidet, nicht GRANT). Nur für den
-- lokalen Test des Serverpfads, siehe supabase/tests/README.md.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant anon, authenticated, service_role to postgres;
create schema extensions; create schema auth;
grant usage on schema public, extensions to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(), email text unique, created_at timestamptz not null default now(),
  raw_user_meta_data jsonb default '{}'::jsonb, email_confirmed_at timestamptz default now(), last_sign_in_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create schema vault;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid language sql as $$
  insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null) returns void language sql as $$
  update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id $$;
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
create publication supabase_realtime;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
