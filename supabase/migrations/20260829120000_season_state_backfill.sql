-- Nachtrag der Periodenmitschrift für Partien, die vor ihrer Einführung
-- begonnen haben.
--
-- Hintergrund: Die Berichtsansicht (GuV, Bilanz, Kapitalflussrechnung je
-- Beteiligung) zeigt die Beträge, mit denen die Engine in der jeweiligen
-- Periode tatsächlich gerechnet hat. Seit lib/engine/engine.ts diese Beträge
-- mitschreibt, stehen sie in jeder neuen hist-Zeile. Für Halbjahre, die vorher
-- ausgewertet wurden, fehlen sie -- und geschätzte Zahlen sind in einem
-- Abschluss keine Zahlen.
--
-- Sie lassen sich vollständig zurückgewinnen, weil die Auswertung
-- deterministisch ist: season_state hält den Spielstand nach jedem Halbjahr,
-- turn_submissions jede Abgabe, und die Position im Zufallsstrom lässt sich
-- aus seasons.seed zurückrechnen (siehe lib/engine/replay.ts). Die Edge
-- Function spielt die Partie damit noch einmal nach und prüft dabei Halbjahr
-- für Halbjahr, dass exakt derselbe Spielstand herauskommt -- Feld für Feld,
-- samt Dealflow, Meldungen und Kassenständen. Nur wenn das durchgängig
-- gelingt, werden die Zeilen überschrieben; andernfalls bleibt alles, wie es
-- ist. Der Spielverlauf ändert sich dadurch nie, es kommen ausschließlich die
-- mitgeschriebenen Beträge hinzu.

-- Merker, damit der minütliche Sweep nicht bei jeder Runde jede laufende
-- Partie erneut liest. Null heißt "noch nicht geprüft"; gesetzt heißt
-- "nachgetragen oder nichts nachzutragen".
alter table public.seasons
  add column if not exists statements_backfilled_at timestamptz;

comment on column public.seasons.statements_backfilled_at is
  'Zeitpunkt, zu dem die Periodenmitschrift der Beteiligungen nachgetragen (oder als nicht nachtragbar erkannt) wurde. Null = noch offen; auf null zurücksetzen stellt die Partie wieder in die Warteschlange.';

-- Claim für den Nachtrag. Benutzt dieselbe Sperre wie die Auswertung, damit
-- beide sich nie in die Quere kommen -- aber ohne Fälligkeitsprüfung: Ein
-- Nachtrag ist unabhängig davon fällig, ob das laufende Halbjahr ausgewertet
-- werden kann.
create or replace function public.claim_season_for_backfill(p_season_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_lock_at timestamptz;
  v_done timestamptz;
  v_token uuid;
begin
  select status, evaluation_lock_at, statements_backfilled_at
  into v_status, v_lock_at, v_done
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null or v_status <> 'running' then
    return null;
  end if;
  if v_done is not null then
    return null;
  end if;
  -- Ein frischer Claim heißt: die Auswertung (oder ein anderer Nachtrag)
  -- läuft gerade. Nur ein verwaister Claim darf überschrieben werden --
  -- dieselbe Regel wie in claim_season_for_evaluation().
  if v_lock_at is not null and v_lock_at >= now() - interval '5 minutes' then
    return null;
  end if;

  v_token := gen_random_uuid();
  update public.seasons
  set evaluation_lock_token = v_token, evaluation_lock_at = now()
  where id = p_season_id;

  return v_token;
end;
$$;

-- Ergebnis des Nachtrags festschreiben. p_states ist ein Array von
-- {"half_year": n, "state": {...}} und ersetzt genau die Zeilen, die es
-- benennt. Ein leeres Array ist der reguläre Fall "nichts nachzutragen": Die
-- Partie wird als geprüft markiert und die Sperre sofort freigegeben, statt
-- sie fünf Minuten verwaist stehen zu lassen.
create or replace function public.commit_season_backfill(
  p_season_id uuid, p_token uuid, p_states jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
  v_row jsonb;
begin
  select evaluation_lock_token into v_token
  from public.seasons where id = p_season_id for update;

  if v_token is null or v_token <> p_token then
    raise exception 'stale_or_missing_claim';
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(p_states, '[]'::jsonb))
  loop
    update public.season_state
    set state = v_row -> 'state'
    where season_id = p_season_id
      and half_year = (v_row ->> 'half_year')::int;
  end loop;

  update public.seasons
  set statements_backfilled_at = now(),
      evaluation_lock_token = null, evaluation_lock_at = null
  where id = p_season_id;
end;
$$;

-- Sperre freigeben, ohne den Nachtrag als erledigt zu markieren -- für
-- vorübergehende Fehler (Netz, Datenbank). Beim nächsten Sweep wird es erneut
-- versucht. Ein Verlauf, der sich nicht wiederherstellen lässt, wird dagegen
-- regulär abgehakt: Ohne Codeänderung käme beim nächsten Mal dasselbe heraus.
create or replace function public.abort_season_backfill(p_season_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  select evaluation_lock_token into v_token
  from public.seasons where id = p_season_id for update;
  if v_token is null or v_token <> p_token then
    return;
  end if;
  update public.seasons
  set evaluation_lock_token = null, evaluation_lock_at = null
  where id = p_season_id;
end;
$$;

-- Laufende Partien, deren Mitschrift noch nicht geprüft wurde. Bewusst
-- schlank: Ob tatsächlich etwas fehlt, entscheidet die Edge Function am
-- geladenen Spielstand -- in SQL wäre das eine tiefe Suche durch jsonb.
create or replace function public.list_seasons_for_statements_backfill()
returns table (season_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select s.id
  from public.seasons s
  where s.status = 'running'
    and s.statements_backfilled_at is null
  order by s.started_at nulls last
  limit 20;
$$;

revoke all on function public.claim_season_for_backfill(uuid) from public, authenticated, anon;
revoke all on function public.commit_season_backfill(uuid, uuid, jsonb) from public, authenticated, anon;
revoke all on function public.abort_season_backfill(uuid, uuid) from public, authenticated, anon;
revoke all on function public.list_seasons_for_statements_backfill() from public, authenticated, anon;

grant execute on function public.claim_season_for_backfill(uuid) to service_role;
grant execute on function public.commit_season_backfill(uuid, uuid, jsonb) to service_role;
grant execute on function public.abort_season_backfill(uuid, uuid) to service_role;
grant execute on function public.list_seasons_for_statements_backfill() to service_role;
