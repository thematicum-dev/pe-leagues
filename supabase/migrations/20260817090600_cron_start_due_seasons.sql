-- Zeitsteuerung über pg_cron statt Vercel Cron (dessen kostenlose Stufe nur
-- einen Lauf pro Tag erlaubt — viel zu selten für eine 12-Stunden-Frist).
-- pg_cron ruft minütlich start_due_seasons() auf, die alle abgelaufenen
-- Lobbys startet. Der 5-Spieler-Sofortstart läuft unabhängig davon über
-- den Trigger aus der vorigen Migration; diese Funktion ist zusätzlich die
-- Absicherung für den 12-Stunden-Fall (und ein Fallback, falls der Trigger
-- aus irgendeinem Grund nicht gefeuert hätte).
create extension if not exists pg_cron with schema extensions;

create or replace function public.start_due_seasons()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  for v_id in
    select s.id
    from public.seasons s
    where s.status = 'lobby'
      and (
        now() >= s.lobby_opened_at + interval '12 hours'
        or (select count(*) from public.season_players sp where sp.season_id = s.id) >= 5
      )
  loop
    begin
      perform public.start_season(v_id);
    exception when others then
      -- Eine fehlerhafte Partie darf die übrigen fälligen Starts nicht
      -- verhindern; der Fehler landet in den Postgres-Logs.
      raise warning 'start_season fehlgeschlagen für %: %', v_id, sqlerrm;
    end;
  end loop;
end;
$$;

revoke all on function public.start_due_seasons() from public, authenticated, anon;

-- Benannter Job: erneutes Ausführen dieser Migration ersetzt den
-- bestehenden Job statt einen Duplikat-Job anzulegen.
select cron.schedule(
  'start-due-seasons',
  '* * * * *',
  $$select public.start_due_seasons();$$
);
