# Serverpfad gegen ein lokales Postgres

`serverPath.pg.test.ts` spielt vollständige Mehrspielerpartien durch die echten
Migrationen, RPCs und RLS-Policies und durch den Code der Edge Function
`evaluate-seasons` selbst. supabase-js wird dabei durch `pgClient.ts` ersetzt,
das dieselben Aufrufe direkt gegen Postgres stellt, in der Rolle, die der
jeweilige Schlüssel hätte (`service_role` bzw. `authenticated` mit `auth.uid()`).

Ohne `PEL_PG` wird der Test übersprungen — `npm test` braucht keine Datenbank.

## Ablauf

```bash
# 1. Postgres 16 starten (Beispiel ohne Docker)
initdb -D /tmp/pel-pg -U postgres --auth=trust
pg_ctl -D /tmp/pel-pg -o "-p 54329" -l /tmp/pel-pg.log start

# 2. Datenbank aufsetzen: Stub-Erweiterungen (pg_cron, pg_net), Supabase-Nachbau, alle Migrationen
#    (schreibt die Stub-Erweiterungen in das Erweiterungsverzeichnis von Postgres)
PEL_PG_ADMIN="postgresql://postgres@localhost:54329" bash supabase/tests/setup-local-db.sh

# 3. Test
npm i --no-save pg
PEL_PG="postgresql://postgres@localhost:54329/pel" npx vitest run -c supabase/tests/vitest.config.ts
```

## Was geprüft wird

- Zugang, Lobby und Start wie im Spiel: Freigabe, Fondsprofil, Beitritt,
  Verlassen, Start beim fünften Spieler, Start nach Ablauf der Lobby mit
  KI-Auffüllung, Grenze der aktiven Partien, Abbruch per Abstimmung.
- Zwei vollständige Partien über 20 Halbjahre (fünf Menschen; zwei Menschen
  mit KI und abgelaufener Frist in jedem Halbjahr). Nach jedem Halbjahr muss der
  gespeicherte Stand exakt dem entsprechen, den `runQuarter()` mit denselben
  Abgaben im Speicher rechnet.
- Endrangliste, globale Rangliste, beste Deals, Admin-Übersicht.
- Rechte: keine fremden Abgaben, kein fremder Spielstand, keine Abgabe für ein
  anderes Halbjahr oder nach der Frist, keine Auswertung ohne Secret, keine
  doppelte Auswertung bei gleichzeitigen Aufrufen, und eine kaputte Abgabe hält
  die Partie nicht an.

Nicht abgedeckt: Supabase Auth (Registrierung, E-Mail), Realtime und der
zeitgesteuerte Aufruf über pg_cron/pg_net — die Stubs zeichnen nur auf.
