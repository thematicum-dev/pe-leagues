-- Startet eine Partie sofort, sobald der 5. menschliche Spieler beitritt.
--
-- WICHTIG: Der Trigger reagiert bewusst nur auf is_ai = false. Wenn
-- start_season() selbst die KI-Plätze einfügt, feuert derselbe
-- AFTER-INSERT-Trigger für jede dieser Zeilen erneut — würde er dann auch
-- auf KI-Zeilen reagieren, riefe er start_season() rekursiv innerhalb der
-- noch laufenden, mitten im Umbau befindlichen Transaktion auf (Status
-- steht zu dem Zeitpunkt noch auf "lobby", die Sperre wird von derselben
-- Transaktion klaglos erneut erteilt) und würde die gerade erst
-- geshuffelten Plätze bzw. frisch eingefügten KI-Zeilen doppelt anfassen.
create or replace function public.trg_maybe_start_full_season()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.season_players where season_id = new.season_id) >= 5 then
    perform public.start_season(new.season_id);
  end if;
  return new;
end;
$$;

drop trigger if exists season_players_after_insert_maybe_start on public.season_players;

create trigger season_players_after_insert_maybe_start
  after insert on public.season_players
  for each row
  when (new.is_ai = false)
  execute function public.trg_maybe_start_full_season();
