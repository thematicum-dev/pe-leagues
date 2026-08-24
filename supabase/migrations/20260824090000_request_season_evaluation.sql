-- Halbjahreswechsel dauerte in der Praxis Minuten, auch im Einzelspielerfall
-- mit vier KI-Fonds, wo nach der eigenen Abgabe niemand mehr fehlt.
--
-- Ursache: Die Auswertung wurde ausschließlich vom pg_cron-Job angestoßen
-- (invoke_evaluate_seasons, minütlich). Zwischen "abgegeben" und "ausgewertet"
-- lag deshalb immer bis zu eine volle Minute Cron-Wartezeit, dazu die
-- pg_net-Zustellung und der Kaltstart der Edge Function -- und danach noch bis
-- zu 20 Sekunden, bis der Browser den neuen Stand pollte. Der Button "Weiter
-- zum nächsten Halbjahr" hat daran nichts geändert, weil er den Stand nur
-- abgefragt (SELECT auf seasons) und die Auswertung nie ausgelöst hat.
--
-- Diese Funktion schließt genau diese Lücke: ein Mitspieler darf die
-- Auswertung seiner eigenen Partie anstoßen -- aber nur dann, wenn sie
-- ohnehin fällig ist. Die Fälligkeitsprüfung ist dieselbe wie im Cron-Sweep
-- (alle Menschen abgegeben, oder Frist erreicht, oder Bootstrap ausstehend).
-- Ein Browser kann damit weder ein Halbjahr vorzeitig erzwingen noch die
-- 12-Stunden-Frist umgehen; er kann nur den Zeitpunkt vorziehen, zu dem der
-- Cron-Job es ohnehin binnen einer Minute getan hätte.
--
-- Die eigentliche Berechnung bleibt unverändert dort, wo sie hingehört: in
-- der Edge Function mit dem service_role-Key. Diese Funktion stößt lediglich
-- denselben pg_net-Aufruf an, den auch der Cron-Job benutzt -- das Secret
-- bleibt in Vault und wird dem Aufrufer nie gezeigt.

create or replace function public.season_evaluation_due(p_season_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.seasons s
    where s.id = p_season_id
      and s.status = 'running'
      and (
        -- Bootstrap des ersten Halbjahres steht noch aus
        s.current_half_year_deadline is null
        -- Frist erreicht
        or now() >= s.current_half_year_deadline
        -- alle menschlichen Fonds haben abgegeben
        or (
          select count(*) from public.season_players sp
          where sp.season_id = s.id and sp.is_ai = false
        ) <= (
          select count(*) from public.turn_submissions ts
          where ts.season_id = s.id and ts.half_year = s.current_half_year
        )
      )
      -- Läuft bereits eine Auswertung, ist ein weiterer Anstoß sinnlos.
      and (s.evaluation_lock_at is null or s.evaluation_lock_at < now() - interval '5 minutes')
  );
$$;

revoke all on function public.season_evaluation_due(uuid) from public, anon;
grant execute on function public.season_evaluation_due(uuid) to authenticated, service_role;

create or replace function public.request_season_evaluation(p_season_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Nur wer selbst in dieser Partie spielt, darf ihre Auswertung anstoßen.
  if not exists (
    select 1 from public.season_players sp
    where sp.season_id = p_season_id and sp.profile_id = v_uid
  ) then
    raise exception 'not_a_member';
  end if;

  if not public.season_evaluation_due(p_season_id) then
    -- Kein Fehler: der Aufrufer hat schlicht zu früh gefragt. Der Client
    -- unterscheidet daran "läuft noch" von "gleich fertig".
    return false;
  end if;

  perform public.invoke_evaluate_seasons();
  return true;
end;
$$;

revoke all on function public.request_season_evaluation(uuid) from public, anon;
grant execute on function public.request_season_evaluation(uuid) to authenticated;
