-- Das Ergebnis der Auswertung eines Halbjahres: ein Eintrag pro Partie und
-- Halbjahr mit dem gemeinsamen Nachrichtenfeed (z. B. "Zuschlag erhalten",
-- "Covenant gerissen"). Enthält keine individuellen Gebote oder sonstige
-- Interna anderer Spieler — nur die öffentlichen Auswirkungen, wie sie auch
-- im bestehenden Einzelspieler-Feed erscheinen.

create table public.turn_results (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  half_year integer not null constraint turn_results_half_year_check check (half_year >= 1),
  feed jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint turn_results_unique unique (season_id, half_year)
);

comment on table public.turn_results is
  'Ergebnis der Auswertung eines Halbjahres inklusive der Nachrichten für den gemeinsamen Feed.';
comment on column public.turn_results.feed is
  'Array von Nachrichtenfeed-Einträgen, wie im Übungsmodus (z. B. {q, e, tone, t}).';

alter table public.turn_results enable row level security;

-- Sichtbar für Mitspieler der Partie sowie öffentlich für beendete Partien.
create policy "turn_results_select"
  on public.turn_results
  for select
  to authenticated
  using (
    public.is_season_member(season_id)
    or exists (
      select 1 from public.seasons s
      where s.id = turn_results.season_id and s.status = 'finished'
    )
  );

-- Bewusst keine INSERT/UPDATE/DELETE-Policy für authenticated: Ergebnisse
-- entstehen ausschließlich in der serverseitigen Auswertungsroutine
-- (service_role), die dafür zwingend alle turn_submissions eines Halbjahres
-- lesen muss, um sie gegeneinander aufzulösen (höchstes Gebot gewinnt usw.).
-- Der service_role-Key läuft nur in dieser vertrauenswürdigen Server-Umgebung
-- und wird niemals an den Browser eines Spielers ausgeliefert.
