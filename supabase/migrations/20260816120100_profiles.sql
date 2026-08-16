-- Spielerprofile. Ein Profil gehört 1:1 zu einem auth.users-Eintrag und trägt
-- den Anzeigenamen, unter dem der Fonds eines Spielers in der Rangliste
-- erscheint. Anzeigenamen müssen eindeutig sein (case-insensitiv).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) between 3 and 24),
  constraint profiles_display_name_format check (display_name ~ '^[[:alnum:] _.äöüÄÖÜß-]+$')
);

comment on table public.profiles is
  'Spielerprofile mit dem eindeutigen Anzeigenamen für die Rangliste.';
comment on column public.profiles.id is
  'Entspricht auth.users.id des angemeldeten Nutzers.';

-- Eindeutigkeit unabhängig von Groß-/Kleinschreibung ("Alex" und "alex"
-- dürfen nicht beide existieren).
create unique index profiles_display_name_unique_idx on public.profiles (lower(display_name));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Anzeigenamen sind bewusst öffentlich lesbar: Sie erscheinen in Ranglisten
-- und Lobbys, damit andere Spieler sehen, wer mitspielt.
create policy "profiles_select_all"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Ein Nutzer darf ausschließlich sein eigenes Profil anlegen.
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

-- Ein Nutzer darf ausschließlich sein eigenes Profil ändern.
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
