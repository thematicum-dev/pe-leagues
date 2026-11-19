-- Konto löschen, ohne an eigenen Partien hängen zu bleiben.
--
-- seasons.created_by verweist mit ON DELETE RESTRICT auf profiles: Ein
-- Konto, das irgendwann eine Partie eröffnet hat, die noch existiert, ließ
-- sich nicht löschen — weder vom Admin (/admin/users meldete einen
-- Fremdschlüsselfehler) noch, was es bisher gar nicht gab, vom Nutzer selbst.
-- Das Recht auf Löschung (Art. 17 DSGVO) darf nicht an einer Partie von vor
-- drei Monaten scheitern.
--
-- release_created_seasons() räumt genau diese Verweise ab, bevor das Konto
-- gelöscht wird:
--
--   * Sitzt ein anderer Mensch in der Partie, gehen die Ersteller-Rechte an
--     ihn über (wie bei leave_season()). Sein Spielstand und seine
--     Platzierung bleiben unberührt.
--   * Ist der Nutzer der einzige Mensch, wird die Partie gelöscht — außer
--     KI-Fonds ist niemand betroffen.
--
-- Alles Übrige erledigen die bestehenden Kaskaden (Profil, Plätze, Abgaben,
-- Ereignisse).

create or replace function public.release_created_seasons(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.seasons s
  set created_by = (
    select sp.profile_id
    from public.season_players sp
    where sp.season_id = s.id and sp.profile_id is not null and sp.profile_id <> p_user_id
    order by sp.joined_at, sp.slot
    limit 1
  )
  where s.created_by = p_user_id
    and exists (
      select 1 from public.season_players sp
      where sp.season_id = s.id and sp.profile_id is not null and sp.profile_id <> p_user_id
    );

  delete from public.seasons s where s.created_by = p_user_id;
end;
$$;

-- Nur über die beiden folgenden Funktionen erreichbar
revoke all on function public.release_created_seasons(uuid) from public, anon, authenticated;

-- Schritt 1 der Selbstlöschung; Schritt 2 ist das Löschen des Auth-Kontos
-- durch den Server (app/profile/actions.ts).
create or replace function public.prepare_my_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if public.is_root_admin() then
    raise exception 'root_admin_cannot_be_deleted';
  end if;
  perform public.release_created_seasons(auth.uid());
end;
$$;

comment on function public.prepare_my_account_deletion() is
  'Gibt die eigenen Ersteller-Verweise auf Partien frei, damit das Konto gelöscht werden kann.';

revoke all on function public.prepare_my_account_deletion() from public, anon;
grant execute on function public.prepare_my_account_deletion() to authenticated;

create or replace function public.admin_prepare_user_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  select u.email::text into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then
    raise exception 'user_not_found';
  end if;
  if lower(v_email) = 'thematicum.dev@gmail.com' then
    raise exception 'root_admin_cannot_be_deleted';
  end if;
  -- Ein ernannter Admin löscht keinen anderen Admin; das bleibt beim Root.
  if exists (select 1 from public.app_admins a where a.user_id = p_user_id) and not public.is_root_admin() then
    raise exception 'not_root_admin';
  end if;
  perform public.release_created_seasons(p_user_id);
  perform public.admin_log('user.delete', v_email, jsonb_build_object('user_id', p_user_id));
end;
$$;

comment on function public.admin_prepare_user_deletion(uuid) is
  'Gibt die Ersteller-Verweise eines Nutzers frei und protokolliert die Löschung. Danach löscht der Server das Auth-Konto.';

revoke all on function public.admin_prepare_user_deletion(uuid) from public, anon;
grant execute on function public.admin_prepare_user_deletion(uuid) to authenticated;
