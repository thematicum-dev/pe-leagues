-- Diese drei Funktionen spiegeln bewusst exakt die Konstante ARCHES aus
-- components/PeLeagues.tsx (und lib/engine/constants.ts) wider: vier
-- KI-Archetypen mit Name und Attributverteilung, sowie die
-- Standard-Attributverteilung für menschliche Spieler vor ihrer eigenen
-- Wahl. Ändert sich ARCHES, müssen diese Funktionen mitgepflegt werden.

create or replace function public.archetype_display_name(p_key text)
returns text
language sql
immutable
as $$
  select case p_key
    when 'sourcing' then 'Nordkap Capital'
    when 'ops' then 'Hansabruck Partners'
    when 'fin' then 'Aurum Partners'
    when 'all' then 'Vierturm Beteiligungen'
    else null
  end;
$$;

create or replace function public.archetype_attrs(p_key text)
returns jsonb
language sql
immutable
as $$
  select case p_key
    when 'sourcing' then
      jsonb_build_object('sourcing', 5, 'analysis', 2, 'negotiation', 2, 'operations', 2, 'financing', 1)
    when 'ops' then
      jsonb_build_object('sourcing', 2, 'analysis', 3, 'negotiation', 1, 'operations', 5, 'financing', 1)
    when 'fin' then
      jsonb_build_object('sourcing', 1, 'analysis', 2, 'negotiation', 3, 'operations', 1, 'financing', 5)
    when 'all' then
      jsonb_build_object('sourcing', 3, 'analysis', 3, 'negotiation', 2, 'operations', 2, 'financing', 2)
    else null
  end;
$$;

-- Vor der ersten eigenen Wahl steht jeder menschliche Fonds mit dieser
-- Verteilung da, genau wie im Einzelspieler-Übungsmodus vor dem Start.
create or replace function public.default_human_attrs()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object('sourcing', 2, 'analysis', 3, 'negotiation', 2, 'operations', 3, 'financing', 2);
$$;
