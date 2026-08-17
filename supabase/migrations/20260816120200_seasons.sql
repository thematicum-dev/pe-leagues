-- Partien (Seasons). Eine Season durchläuft lobby -> running -> finished.
-- Der Zufalls-Startwert (seed) treibt die serverseitige Simulation an, damit
-- alle Mitspieler denselben Markt sehen.

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'lobby'
    constraint seasons_status_check check (status in ('lobby', 'running', 'finished')),
  seed bigint not null default floor(random() * 9223372036854775807)::bigint,
  lobby_opened_at timestamptz not null default now(),
  current_half_year integer not null default 0
    constraint seasons_current_half_year_check check (current_half_year >= 0),
  current_half_year_deadline timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.seasons is
  'Eine Partie (Season) mit bis zu 5 Fondsplätzen, Status und Halbjahres-Takt.';
comment on column public.seasons.seed is
  'Zufalls-Startwert für die serverseitige Marktsimulation dieser Partie.';
comment on column public.seasons.current_half_year is
  'Das aktuell laufende bzw. zuletzt abgeschlossene Halbjahr (0 = vor Start).';
comment on column public.seasons.current_half_year_deadline is
  'Abgabefrist für turn_submissions im aktuellen Halbjahr. NULL solange die Lobby offen ist.';

create trigger seasons_set_updated_at
  before update on public.seasons
  for each row
  execute function public.set_updated_at();

alter table public.seasons enable row level security;

-- Jeder angemeldete Nutzer darf eine neue Partie eröffnen (Lobby-Host).
create policy "seasons_insert_own"
  on public.seasons
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

-- Der Lobby-Host darf Lobby-Metadaten pflegen (z. B. KI-Plätze befüllen).
-- Das Fortschalten von Halbjahren und Auswerten von Ergebnissen läuft über
-- eine privilegierte Server-Routine (service_role) und ist hier bewusst
-- nicht als Client-Policy freigegeben.
create policy "seasons_update_creator"
  on public.seasons
  for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- Die SELECT-Policy (offene Lobbys durchsuchbar, eigene Partien sichtbar)
-- wird in 20260816120400_membership_helpers.sql ergänzt, sobald
-- season_players existiert.
