-- Abgabestand je Spieler für die Admin-Übersicht der Partien (/admin/seasons).
-- admin_list_seasons() liefert nur die Zahl der Abgaben im laufenden
-- Halbjahr; hier steht, WER schon abgegeben hat und wer noch fehlt.
--
-- Eine Zeile je menschlichem Spielerplatz in laufenden Partien, mit dem
-- Zeitpunkt der Abgabe für das aktuelle Halbjahr (null = fehlt noch). Der
-- Inhalt der Abgabe (turn_submissions.payload) bleibt auch hier außen vor —
-- der Admin sieht, dass abgegeben wurde, nicht was.
create or replace function public.admin_season_submissions()
returns table (
  season_id uuid,
  slot integer,
  profile_id uuid,
  display_name text,
  email text,
  submitted_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  return query
  select
    s.id,
    sp.slot,
    sp.profile_id,
    p.display_name,
    u.email::text,
    ts.submitted_at
  from public.seasons s
  join public.season_players sp on sp.season_id = s.id and sp.is_ai = false
  left join public.profiles p on p.id = sp.profile_id
  left join auth.users u on u.id = sp.profile_id
  left join public.turn_submissions ts
    on ts.season_id = s.id and ts.half_year = s.current_half_year and ts.profile_id = sp.profile_id
  where s.status = 'running'
  order by s.id, sp.slot;
end;
$$;

comment on function public.admin_season_submissions() is
  'Admin-Übersicht: je menschlichem Spieler einer laufenden Partie, ob (und wann) er für das aktuelle Halbjahr abgegeben hat. Ohne Inhalt der Abgabe. Nur für is_admin().';

revoke all on function public.admin_season_submissions() from public, anon;
grant execute on function public.admin_season_submissions() to authenticated;
