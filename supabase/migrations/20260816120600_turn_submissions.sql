-- Die Entscheidungen eines Spielers für ein Halbjahr (Gebote, Due Diligence,
-- Maßnahmen). Das ist die sensibelste Tabelle im Schema: Eine Abgabe darf
-- ausschließlich von der Person gelesen werden, die sie erstellt hat — nie
-- von Mitspielern, auch nicht nach Auswertung des Halbjahres.

create table public.turn_submissions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  half_year integer not null constraint turn_submissions_half_year_check check (half_year >= 1),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  payload jsonb not null,
  submitted_at timestamptz not null default now(),
  constraint turn_submissions_unique unique (season_id, half_year, profile_id)
);

comment on table public.turn_submissions is
  'Private Abgabe eines Spielers (Gebote, Due Diligence, Maßnahmen) für ein Halbjahr. Nur vom Autor lesbar.';
comment on column public.turn_submissions.payload is
  'Gebote, Due-Diligence-Wahl und Maßnahmen als JSON, wie vom Client zusammengestellt.';

alter table public.turn_submissions enable row level security;

-- SELECT: absichtlich die einzige Sichtbarkeits-Policy. Es gibt keine
-- weitere SELECT-Policy für Mitspieler, Lobby-Hosts oder "finished"-Partien
-- — Postgres RLS ist standardmäßig "deny", jede Zeile ohne passende Policy
-- bleibt unsichtbar. Damit sieht ausnahmslos der Autor seine eigene Abgabe.
create policy "turn_submissions_select_own"
  on public.turn_submissions
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

-- Einreichen ist nur für den eigenen Fondsplatz möglich, nur innerhalb des
-- aktuell laufenden Halbjahres und nur vor Ablauf der Frist.
create policy "turn_submissions_insert_own"
  on public.turn_submissions
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.season_players sp
      where sp.season_id = turn_submissions.season_id
        and sp.profile_id = (select auth.uid())
    )
    and exists (
      select 1 from public.seasons s
      where s.id = turn_submissions.season_id
        and s.status = 'running'
        and s.current_half_year = turn_submissions.half_year
        and (s.current_half_year_deadline is null or now() < s.current_half_year_deadline)
    )
  );

-- Korrigieren der eigenen Abgabe, ebenfalls nur vor Ablauf der Frist. Nach
-- Fristablauf schlägt die WITH CHECK-Bedingung fehl, die Abgabe ist damit
-- effektiv eingefroren.
create policy "turn_submissions_update_own"
  on public.turn_submissions
  for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.seasons s
      where s.id = turn_submissions.season_id
        and s.status = 'running'
        and s.current_half_year = turn_submissions.half_year
        and (s.current_half_year_deadline is null or now() < s.current_half_year_deadline)
    )
  );

-- Bewusst keine DELETE-Policy: Abgaben bleiben als unveränderliche
-- Historie für ihren Autor erhalten.
