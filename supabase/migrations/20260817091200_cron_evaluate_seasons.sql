-- Ruft die Edge Function "evaluate-seasons" minütlich über pg_net auf.
-- Anders als start_due_seasons() kann diese Auswertung nicht direkt in
-- PL/pgSQL laufen: sie braucht lib/engine/runQuarter (TypeScript), siehe
-- supabase/functions/evaluate-seasons.
--
-- Das Secret, mit dem die Edge Function den Aufruf als "kommt wirklich vom
-- eigenen Cron-Job" erkennt, wird hier zufällig erzeugt
-- (gen_random_bytes) und ausschließlich in Supabase Vault abgelegt -- es
-- steht an keiner Stelle im Migrationstext oder in der Versionskontrolle.
-- Die Edge Function vergleicht den eingehenden Header gegen denselben
-- Vault-Eintrag; ein Browser kennt das Secret nicht und kann die Auswertung
-- damit nicht selbst auslösen (siehe supabase/README.md, Abschnitt
-- "Sicherheit").
--
-- Die Funktions-URL ist projektabhängig und kann in einer Migration nicht
-- bekannt sein. Sie wird deshalb als leerer Platzhalter angelegt;
-- invoke_evaluate_seasons() tut nichts, solange sie nicht gesetzt ist. Nach
-- dem Deploy einmalig setzen (siehe supabase/README.md):
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'evaluate_seasons_function_url'),
--     'https://<project-ref>.functions.supabase.co/evaluate-seasons'
--   );
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'evaluate_seasons_secret') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'evaluate_seasons_secret');
  end if;
  if not exists (select 1 from vault.secrets where name = 'evaluate_seasons_function_url') then
    perform vault.create_secret('', 'evaluate_seasons_function_url');
  end if;
end;
$$;

create or replace function public.invoke_evaluate_seasons()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_url text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'evaluate_seasons_secret';
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'evaluate_seasons_function_url';

  if v_url is null or v_url = '' then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-evaluate-secret', v_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.invoke_evaluate_seasons() from public, authenticated, anon;

select cron.schedule(
  'evaluate-seasons',
  '* * * * *',
  $$select public.invoke_evaluate_seasons();$$
);
