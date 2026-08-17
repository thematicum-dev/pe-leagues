-- Ergänzt seasons um das, was die serverseitige Rundenauswertung zusätzlich
-- braucht: den echten Startzeitpunkt (für die Frist des ersten Halbjahres,
-- siehe lib/engine/deadline.ts), einen Claim-Mechanismus gegen doppelte
-- gleichzeitige Auswertung derselben Partie, und die Endrangliste nach
-- Halbjahr 20.

alter table public.seasons
  add column started_at timestamptz,
  add column evaluation_lock_token uuid,
  add column evaluation_lock_at timestamptz,
  add column final_ranking jsonb;

comment on column public.seasons.started_at is
  'Zeitpunkt des tatsächlichen Partiestarts (start_season()) — Grundlage für die Frist des ersten Halbjahres. NULL solange die Lobby offen ist.';
comment on column public.seasons.evaluation_lock_token is
  'Claim-Token einer laufenden Auswertung (siehe claim_season_for_evaluation/commit_season_evaluation). NULL, wenn gerade keine Auswertung läuft — verhindert, dass zwei gleichzeitige Cron-Ticks dieselbe Partie doppelt auswerten.';
comment on column public.seasons.evaluation_lock_at is
  'Zeitpunkt, zu dem der aktuelle Claim gesetzt wurde. Ein Claim, der deutlich älter als eine plausible Auswertungsdauer ist (siehe claim_season_for_evaluation), gilt als verwaist und darf erneut vergeben werden.';
comment on column public.seasons.final_ranking is
  'Endrangliste nach Halbjahr 20 (50:50-Wertung aus IRR und TVPI), von der Auswertungsroutine einmalig geschrieben. NULL, solange die Partie nicht "finished" ist.';
