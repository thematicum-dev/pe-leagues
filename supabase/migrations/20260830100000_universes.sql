-- Universen: voneinander getrennte Spielwelten. Eine Partie gehört immer zu
-- genau einem Universum, und ein Spieler sieht ausschließlich Partien und
-- Ranglisten der Universen, die ihm der Admin zugeteilt hat. Zwei Universen
-- sind von Anfang an angelegt (Test und Live); weitere legt der Admin über
-- admin_create_universe() an -- ohne Migration, ohne Code-Änderung.
--
-- Der Schlüssel (key) ist der kurze, technische Name ("test", "live"), der
-- in Links und Logs auftaucht; name ist die Beschriftung in der Oberfläche.

create table public.universes (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint universes_key_format check (key ~ '^[a-z0-9][a-z0-9_-]{1,30}$'),
  constraint universes_name_length check (char_length(name) between 2 and 60)
);

comment on table public.universes is
  'Voneinander getrennte Spielwelten. Partien, Ranglisten und Mitspieler eines Universums sind für andere Universen unsichtbar.';
comment on column public.universes.key is
  'Kurzer technischer Schlüssel (klein geschrieben), z. B. "test" oder "live".';
comment on column public.universes.is_active is
  'False = stillgelegt: keine neuen Partien mehr, bestehende bleiben lesbar.';

create unique index universes_key_unique_idx on public.universes (lower(key));

create trigger universes_set_updated_at
  before update on public.universes
  for each row
  execute function public.set_updated_at();

alter table public.universes enable row level security;

-- Die reine Liste der Universen (Name, Beschreibung) ist für angemeldete
-- Nutzer lesbar -- welche Partien darin laufen, entscheidet dagegen die
-- Mitgliedschaft (siehe profile_universes und die seasons-Policies).
-- Geschrieben wird ausschließlich über die admin_*-Funktionen.
create policy "universes_select_all"
  on public.universes
  for select
  to authenticated
  using (true);

insert into public.universes (key, name, description, sort_order)
values
  ('live', 'Live-Universum', 'Die reguläre Liga: hier zählen die Ergebnisse.', 10),
  ('test', 'Test-Universum', 'Spielwiese zum Ausprobieren, getrennt von der regulären Liga.', 20);
