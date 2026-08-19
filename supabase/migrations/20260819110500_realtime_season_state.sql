-- Bislang wurde nur Änderungen an "seasons" und "season_players" live an
-- den Client gemeldet. Die Auswertung eines Halbjahres schreibt aber vor
-- allem season_state (neuer Spielstand) -- ohne diese Publikation bemerkt
-- die Mehrspieler-Ansicht das neue Halbjahr nur über den current_half_year-
-- Vergleich auf "seasons", was beim Abschluss der letzten Runde (Status
-- wechselt auf "finished", current_half_year bleibt unverändert) ins Leere
-- läuft -- die Seite musste dafür manuell neu geladen werden. RLS gilt
-- weiterhin: ein Client bekommt nur Änderungen an Zeilen, die er laut
-- season_state_select ohnehin sehen dürfte.
alter publication supabase_realtime add table public.season_state;
