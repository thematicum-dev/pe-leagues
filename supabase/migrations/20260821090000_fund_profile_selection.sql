-- Im Hauptspiel (Mehrspielerpartie) fehlte bislang die Definition des
-- Fondsprofils, die es im Einzelspieler-Übungsmodus vor dem "Fonds
-- auflegen" gibt (components/PeLeagues.tsx, Phase "setup"): 12 Punkte frei
-- auf Origination/Due Diligence/Execution/Value Creation/Financing
-- verteilen, verbindlich für die gesamte Fondslaufzeit. start_season()
-- griff für jeden menschlichen Fonds bislang immer auf
-- default_human_attrs() zurück (siehe Kommentar dort: "vor der ersten
-- eigenen Wahl" — die eigene Wahl selbst gab es aber noch nicht). Diese
-- Migration ergänzt genau das, mit denselben Regeln wie im Übungsmodus.

alter table public.season_players
  add column fund_attrs jsonb;

comment on column public.season_players.fund_attrs is
  'Selbst gewähltes Fondsprofil eines menschlichen Spielers (siehe set_fund_profile()). Null = noch nicht gewählt; start_season() verwendet dann weiterhin default_human_attrs().';

-- Strukturprüfung, identisch zur Begrenzung im Übungsmodus: genau die
-- fünf bekannten Attribute, je eine ganze Zahl zwischen 0 und 5, Summe
-- exakt 12 Punkte.
create or replace function public.valid_fund_attrs(p_attrs jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  v_keys text[] := array['sourcing', 'analysis', 'negotiation', 'operations', 'financing'];
  v_key text;
  v_val numeric;
  v_sum numeric := 0;
begin
  if p_attrs is null or jsonb_typeof(p_attrs) <> 'object' then
    return false;
  end if;
  if (select count(*) from jsonb_object_keys(p_attrs)) <> array_length(v_keys, 1) then
    return false;
  end if;
  foreach v_key in array v_keys loop
    if not (p_attrs ? v_key) or jsonb_typeof(p_attrs -> v_key) <> 'number' then
      return false;
    end if;
    v_val := (p_attrs ->> v_key)::numeric;
    if v_val <> floor(v_val) or v_val < 0 or v_val > 5 then
      return false;
    end if;
    v_sum := v_sum + v_val;
  end loop;
  return v_sum = 12;
end;
$$;

alter table public.season_players
  add constraint season_players_fund_attrs_check
  check (fund_attrs is null or public.valid_fund_attrs(fund_attrs));

-- Ein menschlicher Spieler darf sein eigenes Fondsprofil setzen und —
-- solange die Lobby offen ist — beliebig oft ändern. SECURITY DEFINER,
-- weil season_players seit 20260817090100_season_players_lock_down.sql
-- keine direkte UPDATE-Policy mehr für Clients hat.
create or replace function public.set_fund_profile(p_season_id uuid, p_attrs jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_updated int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.valid_fund_attrs(p_attrs) then
    raise exception 'invalid_fund_attrs';
  end if;

  select status into v_status
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null then
    raise exception 'season_not_found';
  end if;
  if v_status <> 'lobby' then
    raise exception 'season_not_in_lobby';
  end if;

  update public.season_players
  set fund_attrs = p_attrs
  where season_id = p_season_id
    and profile_id = v_uid
    and is_ai = false;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'not_a_member';
  end if;
end;
$$;

revoke all on function public.set_fund_profile(uuid, jsonb) from public, anon;
grant execute on function public.set_fund_profile(uuid, jsonb) to authenticated;

-- start_season() neu, unverändert gegenüber dem aktuellen Stand aus
-- 20260819100000_fix_start_season_slot_reshuffle.sql bis auf eine einzige
-- inhaltliche Änderung: ein menschlicher Fonds startet mit seinem selbst
-- gewählten fund_attrs, falls vorhanden, sonst weiterhin mit
-- default_human_attrs().
create or replace function public.start_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_human_count int;
  v_free_count int;
  v_archetypes text[];
  v_perm int[];
  v_market jsonb;
  v_funds jsonb;
begin
  select status into v_status
  from public.seasons
  where id = p_season_id
  for update;

  if v_status is null or v_status <> 'lobby' then
    return;
  end if;

  perform 1 from public.season_players where season_id = p_season_id for update;

  select count(*) into v_human_count
  from public.season_players
  where season_id = p_season_id;

  if v_human_count = 0 then
    update public.seasons
    set status = 'cancelled', cancelled_reason = 'empty'
    where id = p_season_id;
    return;
  end if;

  v_free_count := 5 - v_human_count;

  -- Zufällige Permutation von 1..5 für die endgültige, zufällige
  -- Platzvergabe an alle fünf Fonds (Mensch und KI gemischt).
  select array_agg(s order by rn) into v_perm
  from (
    select s, row_number() over (order by random()) as rn
    from unnest(array[1, 2, 3, 4, 5]) as s
  ) t;

  -- Menschliche Spieler bekommen die ersten v_human_count Werte der
  -- Permutation, in zufälliger Zuordnung zu ihren (bisherigen) Zeilen. Ein
  -- einziges UPDATE genügt: die Unique-Regel (season_id, slot) ist seit
  -- 20260819100000_fix_start_season_slot_reshuffle.sql deferred, eine
  -- Zwischenkollision beim Vertauschen der Plätze innerhalb dieser einen
  -- Anweisung blockiert also nicht.
  with ranked as (
    select id, row_number() over (order by random()) as rn
    from public.season_players
    where season_id = p_season_id
  )
  update public.season_players sp
  set slot = v_perm[ranked.rn]
  from ranked
  where sp.id = ranked.id;

  -- Freie Plätze mit KI aus ARCHES besetzen: jeder Archetyp höchstens
  -- einmal, zufällig ausgewählt aus den vier möglichen.
  select array_agg(a order by rn) into v_archetypes
  from (
    select a, row_number() over (order by random()) as rn
    from unnest(array['sourcing', 'ops', 'fin', 'all']) as a
  ) t
  where rn <= v_free_count;

  insert into public.season_players (season_id, slot, is_ai, ai_archetype)
  select p_season_id, v_perm[v_human_count + gs], true, v_archetypes[gs]
  from generate_series(1, v_free_count) as gs;

  -- Zufalls-Startwert erst jetzt (beim tatsächlichen Start) erzeugen.
  update public.seasons
  set seed = floor(random() * 9223372036854775807)::bigint
  where id = p_season_id;

  v_market := jsonb_build_object(
    'Industrials', 8.5,
    'Healthcare', 11.0,
    'Software', 13.0,
    'Services', 9.0,
    'Consumer', 8.0
  );

  select jsonb_agg(
    jsonb_build_object(
      'slot', sp.slot,
      'profileId', sp.profile_id,
      'isAi', sp.is_ai,
      'archetype', sp.ai_archetype,
      'name', coalesce(pr.display_name, public.archetype_display_name(sp.ai_archetype)),
      'attrs',
        case when sp.is_ai
          then public.archetype_attrs(sp.ai_archetype)
          else coalesce(sp.fund_attrs, public.default_human_attrs())
        end,
      'cash', 500, 'proceeds', 0, 'investedTotal', 0, 'fees', 0,
      'holdings', '[]'::jsonb, 'realized', '[]'::jsonb,
      'undrawn', 500, 'drawn', 0, 'recyc', 0, 'recycled', 0,
      'distTotal', 0, 'accrued', 0, 'calls', '[]'::jsonb, 'dists', '[]'::jsonb
    )
    order by sp.slot
  )
  into v_funds
  from public.season_players sp
  left join public.profiles pr on pr.id = sp.profile_id
  where sp.season_id = p_season_id;

  insert into public.season_state (season_id, half_year, state)
  values (
    p_season_id,
    0,
    jsonb_build_object(
      'market', v_market,
      'funds', v_funds,
      'feed', jsonb_build_array(
        jsonb_build_object(
          'halfYear', 0, 'emoji', '🏁', 'tone', 'neu',
          'text', 'Partie eröffnet. Fünf Fonds, je 500 Mio. €, zehn Jahre.'
        )
      ),
      'deals', '[]'::jsonb,
      'landmark', null,
      'exitQueue', '{}'::jsonb,
      'shortlist', '{}'::jsonb
    )
  );

  update public.seasons
  set status = 'running', current_half_year = 1, started_at = now()
  where id = p_season_id;
end;
$$;

-- Nur für interne Aufrufer (Trigger, Cron-Job — beide laufen mit den
-- Rechten des Funktionseigentümers). Kein Client darf diese Funktion
-- direkt aufrufen, sonst ließe sich der 5-Spieler- bzw. 12-Stunden-Ablauf
-- umgehen und eine Partie künstlich vorzeitig erzwingen.
revoke all on function public.start_season(uuid) from public, authenticated, anon;
