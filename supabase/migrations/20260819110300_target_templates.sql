-- Pool an Zielunternehmen-Archetypen, aus dem der Dealflow einer Partie
-- zufällig zieht (siehe lib/engine/engine.ts: newDeal()/newLandmark()).
-- Ersetzt bei Bedarf den fest im Code hinterlegten BOOK-Katalog, ohne ihn zu
-- entfernen -- BOOK bleibt der Fallback, solange diese Tabelle für einen
-- Sektor leer ist (z. B. direkt nach dem ersten Deploy, vor der ersten
-- Admin-Generierung).
create table public.target_templates (
  id uuid primary key default gen_random_uuid(),
  sector text not null
    constraint target_templates_sector_check
    check (sector in ('Industrials', 'Healthcare', 'Software', 'Services', 'Consumer')),
  name_parts text[] not null
    constraint target_templates_name_parts_check check (array_length(name_parts, 1) >= 1),
  description text not null,
  capex_pct numeric not null,
  nwc_pct numeric not null,
  margin_min numeric not null,
  margin_max numeric not null constraint target_templates_margin_check check (margin_max >= margin_min),
  growth_min numeric not null,
  growth_max numeric not null constraint target_templates_growth_check check (growth_max >= growth_min),
  revenue_min numeric not null,
  revenue_max numeric not null constraint target_templates_revenue_check check (revenue_max >= revenue_min),
  leverage_min numeric not null,
  leverage_max numeric not null constraint target_templates_leverage_check check (leverage_max >= leverage_min),
  quality_min numeric not null,
  quality_max numeric not null constraint target_templates_quality_check check (quality_max >= quality_min),
  flags text[] not null default '{}',
  batch_id uuid not null,
  created_at timestamptz not null default now()
);

comment on table public.target_templates is
  'Von einem Admin generierter Pool an Zielunternehmen-Archetypen für den Dealflow. Fallback ist der Katalog BOOK in lib/engine/engine.ts, solange diese Tabelle leer ist.';
comment on column public.target_templates.batch_id is
  'Kennzeichnet, in welchem Generierungslauf ein Eintrag entstand -- so kann eine Neu-Generierung den alten Bestand erst löschen, nachdem der neue vollständig geschrieben ist.';

create index target_templates_sector_idx on public.target_templates (sector);
create index target_templates_batch_idx on public.target_templates (batch_id);

alter table public.target_templates enable row level security;

-- Öffentlich lesbar wie der bisherige, fest im Code stehende BOOK-Katalog:
-- Zielunternehmen sind Spielinhalt, keine Nutzerdaten. Schreibzugriff gibt
-- es für Clients bewusst nicht -- Neu-Generierung läuft ausschließlich über
-- eine Server-Aktion mit dem service_role-Key, gesichert durch is_admin().
create policy "target_templates_select_all"
  on public.target_templates
  for select
  to authenticated, anon
  using (true);
