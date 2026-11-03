-- Abgabe bearbeiten: Die Spielansicht bietet nach der Abgabe bis zur Frist an,
-- die eigene Abgabe noch einmal zu ändern (UPDATE auf die eigene Zeile in
-- turn_submissions). Die Policy dafür gibt es seit der ersten Migration; sie
-- prüft Frist und Halbjahr, aber nicht, ob die Auswertung schon läuft.
--
-- Genau das ist nach dem Ändern aber die Lücke: Sobald alle abgegeben haben,
-- vergibt claim_season_for_evaluation() einen Claim, und die Edge Function
-- liest die Abgaben ein. Ein UPDATE in diesem Fenster ginge durch (Frist und
-- Halbjahr stimmen ja noch), würde aber nicht mehr ausgewertet -- der Spieler
-- sähe "Abgabe aktualisiert" und bekäme trotzdem die alte. Mit dieser
-- Bedingung lehnt die Datenbank das UPDATE ab, solange ein frischer Claim
-- besteht (dieselbe 5-Minuten-Grenze wie in claim_season_for_evaluation: ein
-- verwaister Claim sperrt nicht dauerhaft). Die Ansicht meldet dann, dass die
-- bisherige Abgabe gilt.
--
-- Das Einreichen (INSERT) bleibt unverändert: Wer bei laufender Auswertung
-- erstmals abgibt, hat die Frist ohnehin verpasst oder ist der Auslöser.

drop policy if exists "turn_submissions_update_own" on public.turn_submissions;

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
        and (s.evaluation_lock_at is null or s.evaluation_lock_at < now() - interval '5 minutes')
    )
  );
