-- Damit die Lobby-Ansicht ohne Neuladen live aktualisiert (Belegung der
-- Plätze, Status-Wechsel lobby -> running), müssen die betroffenen
-- Tabellen der supabase_realtime-Publikation hinzugefügt werden. RLS gilt
-- dabei weiterhin: ein Client bekommt über Realtime nur die Änderungen an
-- Zeilen, die er laut den bestehenden SELECT-Policies auch sehen dürfte.
alter publication supabase_realtime add table public.season_players;
alter publication supabase_realtime add table public.seasons;
