-- Admin-Zugang, hart auf eine einzige E-Mail-Adresse begrenzt. Bewusst keine
-- Rolle/Spalte, die sich versehentlich (oder über eine Sicherheitslücke in
-- der Anwendung) auf einen zweiten Account übertragen ließe: is_admin()
-- prüft bei jedem Aufruf frisch gegen auth.users.email. Wer die Adresse
-- ändern will, ändert diese eine Migration (neue Migration, nicht
-- rückwirkend) statt Datenbankzeilen.
--
-- SECURITY DEFINER, weil 'authenticated' die auth.users-Tabelle sonst gar
-- nicht lesen kann (Supabase blendet das auth-Schema aus der Client-API
-- aus). Die Funktion selbst gibt ausschließlich ein boolean zurück, legt
-- also keine Zeile aus auth.users offen.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and lower(email) = 'thematicum.dev@gmail.com'
  );
$$;

comment on function public.is_admin() is
  'True, wenn der aktuell angemeldete Nutzer die fest hinterlegte Admin-E-Mail-Adresse hat. Einzige Grundlage für sämtliche admin_*-Funktionen.';

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
