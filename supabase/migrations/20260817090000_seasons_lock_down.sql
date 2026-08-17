-- Mit dem automatischen Matchmaking gibt es keinen "Lobby-Host" mehr, der
-- Partien manuell verwaltet: Anlegen, Beitreten und Starten laufen jetzt
-- ausschließlich über SECURITY DEFINER-Funktionen (siehe spätere
-- Migrationen), die RLS gezielt umgehen. Direkte INSERT/UPDATE-Policies für
-- authenticated Nutzer werden deshalb entfernt — sonst gäbe es einen Weg an
-- der Startlogik vorbei, z. B. eine Partie künstlich vorzeitig zu starten.

drop policy if exists "seasons_insert_own" on public.seasons;
drop policy if exists "seasons_update_creator" on public.seasons;

-- Eine Partie ohne einen einzigen menschlichen Spieler wird nicht
-- gestartet, sondern geschlossen. Dafür der neue Status "cancelled".
alter table public.seasons
  drop constraint seasons_status_check;

alter table public.seasons
  add constraint seasons_status_check
  check (status in ('lobby', 'running', 'finished', 'cancelled'));
