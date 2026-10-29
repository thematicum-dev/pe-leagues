#!/usr/bin/env bash
# Legt eine lokale Datenbank für den Serverpfad-Test an (siehe README.md):
# Stub-Erweiterungen für pg_cron und pg_net, Supabase-Nachbau, alle Migrationen.
# Erwartet einen laufenden Postgres-Server (16) und PEL_PG_ADMIN als
# Verbindungsadresse eines Superusers ohne Datenbanknamen, z. B.
#   PEL_PG_ADMIN="postgresql://postgres@localhost:54329"
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${PEL_PG_ADMIN:?PEL_PG_ADMIN setzen}"
DB="${PEL_PG_DB:-pel}"
EXT="$(pg_config --sharedir 2>/dev/null || echo /usr/share/postgresql/16)/extension"

# pg_cron und pg_net gibt es lokal nicht. Die Stubs legen nur an, was die
# Migrationen aufrufen; die zeitgesteuerten Läufe stößt der Test selbst an.
if [ ! -f "$EXT/pg_cron.control" ]; then
  printf "comment = 'Stub'\ndefault_version = '1.0'\nrelocatable = false\nschema = extensions\n" > "$EXT/pg_cron.control"
  cat > "$EXT/pg_cron--1.0.sql" <<'SQL'
create schema if not exists cron;
create table if not exists cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text);
create or replace function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create or replace function cron.unschedule(job_name text) returns boolean language sql as $$ delete from cron.job where jobname = job_name returning true $$;
SQL
fi
if [ ! -f "$EXT/pg_net.control" ]; then
  printf "comment = 'Stub'\ndefault_version = '1.0'\nrelocatable = false\nschema = extensions\n" > "$EXT/pg_net.control"
  cat > "$EXT/pg_net--1.0.sql" <<'SQL'
create schema if not exists net;
create table if not exists net.requests (id bigserial primary key, url text, headers jsonb, body jsonb, at timestamptz default now());
create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb, timeout_milliseconds int default 5000) returns bigint language sql as $$
  insert into net.requests (url, headers, body) values (url, headers, body) returning id $$;
SQL
fi

psql "$PEL_PG_ADMIN/postgres" -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB" -c "create database $DB"
psql "$PEL_PG_ADMIN/$DB" -v ON_ERROR_STOP=1 -q -f supabase/tests/scaffold.sql 2>&1 | grep -v "wal_level\|logical" || true
for f in supabase/migrations/*.sql; do
  psql "$PEL_PG_ADMIN/$DB" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null || { echo "Migration fehlgeschlagen: $f"; exit 1; }
done
echo "bereit: PEL_PG=$PEL_PG_ADMIN/$DB"
