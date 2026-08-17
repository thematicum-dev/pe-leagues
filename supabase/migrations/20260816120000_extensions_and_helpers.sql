-- Grundlage für alle folgenden Migrationen: Erweiterungen und eine
-- wiederverwendbare Hilfsfunktion. Funktionen, die bereits existierende
-- Tabellen voraussetzen (z. B. Mitgliedschaftsprüfungen), stehen in einer
-- eigenen, späteren Migration (siehe 20260816120400_membership_helpers.sql).

create extension if not exists pgcrypto;

-- Hält "updated_at" automatisch aktuell.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
