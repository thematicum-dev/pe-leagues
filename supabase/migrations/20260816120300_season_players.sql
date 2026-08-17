-- Wer besetzt welchen Fondsplatz einer Partie: ein Mensch (profile_id) oder
-- eine KI mit einem Archetyp aus ARCHES (components/PeLeagues.tsx). Jede
-- Partie hat 5 Fondsplätze, wie im bestehenden Spielmodell.

create table public.season_players (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  slot integer not null constraint season_players_slot_check check (slot between 1 and 5),
  profile_id uuid references public.profiles (id) on delete cascade,
  is_ai boolean not null default false,
  ai_archetype text
    constraint season_players_ai_archetype_check check (ai_archetype in ('sourcing', 'ops', 'fin', 'all')),
  joined_at timestamptz not null default now(),
  constraint season_players_ai_xor_human check (
    (is_ai = true and profile_id is null and ai_archetype is not null)
    or
    (is_ai = false and profile_id is not null and ai_archetype is null)
  ),
  constraint season_players_slot_unique unique (season_id, slot)
);

comment on table public.season_players is
  'Belegung der 5 Fondsplätze je Partie: Mensch (profile_id) oder KI (ai_archetype).';

-- Ein Profil kann in derselben Partie nur einen Fondsplatz belegen.
create unique index season_players_profile_unique_idx
  on public.season_players (season_id, profile_id)
  where profile_id is not null;

alter table public.season_players enable row level security;

-- Sichtbar sind: Spieler offener Lobbys (zum Durchsuchen/Beitreten), die
-- eigenen Mitspieler einer Partie, an der man selbst teilnimmt, sowie die
-- Belegung eigener (gehosteter) Partien.
create policy "season_players_select"
  on public.season_players
  for select
  to authenticated
  using (
    exists (
      select 1 from public.seasons s
      where s.id = season_players.season_id and s.status = 'lobby'
    )
    or exists (
      select 1 from public.season_players me
      where me.season_id = season_players.season_id
        and me.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.seasons s
      where s.id = season_players.season_id and s.created_by = (select auth.uid())
    )
  );

-- Ein Nutzer darf sich selbst einem offenen Lobby-Platz zuweisen; der
-- Lobby-Host darf zusätzlich KI-Plätze in seiner eigenen offenen Lobby
-- anlegen.
create policy "season_players_insert"
  on public.season_players
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.seasons s
      where s.id = season_players.season_id and s.status = 'lobby'
    )
    and (
      (is_ai = false and profile_id = (select auth.uid()))
      or (
        is_ai = true
        and exists (
          select 1 from public.seasons s
          where s.id = season_players.season_id and s.created_by = (select auth.uid())
        )
      )
    )
  );

-- Verlassen einer offenen Lobby: der eigene Platz oder (durch den Host) ein
-- KI-Platz kann entfernt werden, solange die Partie noch nicht läuft.
create policy "season_players_delete"
  on public.season_players
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.seasons s
      where s.id = season_players.season_id and s.status = 'lobby'
    )
    and (
      profile_id = (select auth.uid())
      or (
        is_ai = true
        and exists (
          select 1 from public.seasons s
          where s.id = season_players.season_id and s.created_by = (select auth.uid())
        )
      )
    )
  );
