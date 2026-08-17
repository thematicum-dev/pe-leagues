-- Der vollständige Spielstand einer Partie nach jedem abgeschlossenen
-- Halbjahr (Marktzustand, alle Fonds/Portfolios usw.). Das ist der
-- öffentliche, bereits ausgewertete Zustand — im Unterschied zu den privaten
-- Einreichungen in turn_submissions.

create table public.season_state (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  half_year integer not null constraint season_state_half_year_check check (half_year >= 0),
  state jsonb not null,
  created_at timestamptz not null default now(),
  constraint season_state_unique unique (season_id, half_year)
);

comment on table public.season_state is
  'Vollständiger, bereits ausgewerteter Spielstand einer Partie nach jedem Halbjahr.';

alter table public.season_state enable row level security;

-- Nur Mitspieler der Partie sehen ihren Verlauf; nach Spielende ist der
-- Endstand zusätzlich öffentlich einsehbar (Abschlusstabelle).
create policy "season_state_select"
  on public.season_state
  for select
  to authenticated
  using (
    public.is_season_member(season_id)
    or exists (
      select 1 from public.seasons s
      where s.id = season_state.season_id and s.status = 'finished'
    )
  );

-- Bewusst keine INSERT/UPDATE/DELETE-Policy für authenticated: season_state
-- wird ausschließlich von der serverseitigen Auswertungsroutine geschrieben,
-- die mit dem service_role-Key läuft und damit RLS umgeht. Kein Spieler
-- kann sich so einen falschen Spielstand selbst schreiben.
