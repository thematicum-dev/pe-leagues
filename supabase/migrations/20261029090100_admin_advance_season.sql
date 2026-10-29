-- Admin-Funktion: eine laufende Partie sofort ins nächste Halbjahr schieben,
-- ohne auf fehlende Abgaben oder die Frist zu warten.
--
-- Die Funktion rechnet nichts selbst. Sie zieht nur die Frist des laufenden
-- Halbjahres auf jetzt vor und stößt dann denselben pg_net-Aufruf an wie
-- request_season_evaluation(). Damit gilt überall dieselbe Regel wie bei
-- einer regulär abgelaufenen Frist: Der Cron-Sweep und
-- claim_season_for_evaluation() halten die Partie für fällig, die
-- RLS-Policy auf turn_submissions nimmt keine Abgabe mehr an, und wer
-- nicht abgegeben hat, spielt das Halbjahr ohne Gebote und Maßnahmen —
-- genau wie nach dem Ablauf der Frist. Die Frist des Folgehalbjahres
-- berechnet die Edge Function wie immer aus dem Zeitpunkt der Auswertung.
--
-- Gibt das Halbjahr zurück, das damit abgeschlossen wird (0 = Bootstrap des
-- ersten Halbjahres stand ohnehin noch aus).
create or replace function public.admin_advance_season(p_season_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_half_year int;
  v_lock_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  select status, current_half_year, evaluation_lock_at
  into v_status, v_half_year, v_lock_at
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null then
    raise exception 'season_not_found';
  end if;
  if v_status <> 'running' then
    raise exception 'season_not_running';
  end if;
  -- Dieselbe Schwelle wie in claim_season_for_evaluation(): ein frischer
  -- Claim heißt, das Halbjahr wird gerade ausgewertet.
  if v_lock_at is not null and v_lock_at >= now() - interval '5 minutes' then
    raise exception 'evaluation_running';
  end if;

  -- Ohne Frist (Bootstrap ausstehend) ist die Partie bereits fällig.
  update public.seasons
  set current_half_year_deadline = now()
  where id = p_season_id
    and current_half_year_deadline is not null
    and current_half_year_deadline > now();

  perform public.invoke_evaluate_seasons();
  return v_half_year;
end;
$$;

comment on function public.admin_advance_season(uuid) is
  'Admin: Frist des laufenden Halbjahres auf jetzt vorziehen und die Auswertung sofort anstoßen. Fehlende Abgaben zählen wie nach Fristablauf. Nur für is_admin().';

revoke all on function public.admin_advance_season(uuid) from public, anon;
grant execute on function public.admin_advance_season(uuid) to authenticated;
