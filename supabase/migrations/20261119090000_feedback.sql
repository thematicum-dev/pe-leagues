-- Feedback der Spieler: Gesamtbewertung in Sternen (1-5) und ein Freitext
-- mit Verbesserungsvorschlägen (Spielerlebnis, Simulation, Bedienung ...).
--
-- Schreiben darf jeder spielberechtigte Nutzer (has_game_access()), und zwar
-- nur unter eigener profile_id. Mehrfaches Feedback ist ausdrücklich erlaubt
-- -- jede Abgabe ist ein eigener Eintrag mit Zeitstempel. Lesen darf
-- ausschließlich der Admin, und zwar über admin_list_feedback(), die den
-- Anzeigenamen und die E-Mail dazuholt.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own"
  on public.feedback
  for insert
  to authenticated
  with check (profile_id = auth.uid() and public.has_game_access());

-- Kein SELECT/UPDATE/DELETE für Clients: ohne Policy ist alles verweigert.
revoke all on public.feedback from anon;
grant insert on public.feedback to authenticated;

create or replace function public.admin_list_feedback()
returns table (
  id uuid,
  created_at timestamptz,
  rating smallint,
  comment text,
  profile_id uuid,
  display_name text,
  email text
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
  select f.id, f.created_at, f.rating, f.comment, f.profile_id, p.display_name, u.email::text
  from public.feedback f
  left join public.profiles p on p.id = f.profile_id
  left join auth.users u on u.id = f.profile_id
  order by f.created_at desc;
end;
$$;

comment on function public.admin_list_feedback() is
  'Admin-Übersicht aller Feedback-Einträge inkl. Anzeigename und E-Mail. Nur für is_admin().';

revoke all on function public.admin_list_feedback() from public, anon;
grant execute on function public.admin_list_feedback() to authenticated;
