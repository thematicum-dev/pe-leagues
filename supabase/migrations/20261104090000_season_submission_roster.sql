-- Wer hat im laufenden Halbjahr schon abgegeben? Für die Warteleiste der
-- Spielansicht, die nach der eigenen Abgabe neben der Zahl auch die Namen
-- zeigt: "✓ Anna · ✓ Du · ○ Bert".
--
-- season_submission_status() gibt bewusst nur Zählwerte zurück. Diese
-- Funktion geht einen Schritt weiter und nennt je menschlichem Spielerplatz,
-- ob abgegeben wurde. Das ist eine Produktentscheidung: Mitspieler sehen,
-- auf wen gewartet wird. Weiterhin NICHT sichtbar sind der Inhalt einer
-- Abgabe und ihr Zeitpunkt -- turn_submissions bleibt ausschließlich für den
-- Autor lesbar (siehe 20260816120600_turn_submissions.sql).
--
-- Nur für Mitglieder der Partie und nur, solange sie läuft. KI-Fonds geben
-- nie ab und stehen deshalb nicht in der Liste.
create or replace function public.season_submission_roster(p_season_id uuid)
returns table (
  slot int,
  display_name text,
  is_me boolean,
  submitted boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    sp.slot,
    coalesce(p.display_name, 'Spieler'),
    sp.profile_id = (select auth.uid()),
    exists (
      select 1 from public.turn_submissions ts
      where ts.season_id = s.id and ts.half_year = s.current_half_year and ts.profile_id = sp.profile_id
    )
  from public.seasons s
  join public.season_players sp on sp.season_id = s.id and sp.is_ai = false
  left join public.profiles p on p.id = sp.profile_id
  where s.id = p_season_id
    and s.status = 'running'
    and public.is_season_member(s.id)
  order by sp.slot;
$$;

comment on function public.season_submission_roster(uuid) is
  'Je menschlichem Spieler einer laufenden Partie: Anzeigename und ob er für das aktuelle Halbjahr abgegeben hat. Ohne Inhalt und Zeitpunkt der Abgabe. Nur für Mitglieder der Partie.';

revoke all on function public.season_submission_roster(uuid) from public, anon;
grant execute on function public.season_submission_roster(uuid) to authenticated;
