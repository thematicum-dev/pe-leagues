# Supabase-Schema für PE Leagues

Alle Migrationen liegen unter `supabase/migrations/` und werden in
Dateinamen-Reihenfolge angewendet:

1. `20260816120000_extensions_and_helpers.sql` – Erweiterungen, `updated_at`-Trigger
2. `20260816120100_profiles.sql` – Spielerprofile mit eindeutigem Anzeigenamen
3. `20260816120200_seasons.sql` – Partien (Lobby/Running/Finished)
4. `20260816120300_season_players.sql` – Fondsplätze je Partie (Mensch/KI)
5. `20260816120400_membership_helpers.sql` – Mitgliedschaftsprüfungen + verbleibende `seasons`-Policy
6. `20260816120500_season_state.sql` – Ausgewerteter Spielstand je Halbjahr
7. `20260816120600_turn_submissions.sql` – Private Abgaben je Spieler und Halbjahr
8. `20260816120700_turn_results.sql` – Auswertungsergebnis + Nachrichtenfeed je Halbjahr
9. `20260817090000_seasons_lock_down.sql` – kein direkter Client-Zugriff mehr auf `seasons`, neuer Status `cancelled`
10. `20260817090100_season_players_lock_down.sql` – kein direkter Client-INSERT mehr auf `season_players`
11. `20260817090200_matchmaking_helpers.sql` – Archetyp-Hilfsfunktionen (Spiegelbild von `ARCHES`)
12. `20260817090300_start_season.sql` – atomarer Partiestart (Sperren, KI-Auffüllung, Ausgangszustand)
13. `20260817090400_season_players_start_trigger.sql` – Sofortstart bei 5 Spielern
14. `20260817090500_join_and_create_season.sql` – `join_season`/`create_and_join_season` RPCs für den Client
15. `20260817090600_cron_start_due_seasons.sql` – pg_cron-Job, startet abgelaufene Lobbys minütlich
16. `20260817090700_enable_realtime.sql` – Realtime für `seasons`/`season_players`

## Anwenden ohne SQL-Editor (empfohlen, funktioniert am Handy)

Im Supabase-Dashboard unter **Project Settings → Integrations → GitHub**
dieses Repository verbinden und den Produktions-Branch auf `main` setzen.
Supabase wendet danach `supabase/migrations/*.sql` automatisch an, sobald
ein Pull Request auf `main` gemerged wird.

## Zeitsteuerung (pg_cron)

Migration 16 legt einen minütlichen pg_cron-Job an (`start-due-seasons`),
der abgelaufene Lobbys startet. Die pg_cron-Erweiterung selbst wird von der
Migration aktiviert (`create extension if not exists pg_cron`); zum
Prüfen, ob der Job wirklich läuft: **Database → Extensions** nach
„pg_cron" suchen (sollte aktiviert/grün sein), sowie **Database → Cron
Jobs** (oder per SQL: `select * from cron.job;`) — dort sollte
`start-due-seasons` mit der Planung `* * * * *` auftauchen.

## Race-Condition-Sicherheit beim Partiestart

`start_season()` sperrt zuerst die betroffene `seasons`-Zeile
(`FOR UPDATE`) und danach alle zugehörigen `season_players`-Zeilen, bevor
irgendetwas gezählt oder geschrieben wird. Jeder zweite gleichzeitige
Versuch, dieselbe Partie zu starten — sei es der Trigger beim 5. Beitritt
oder der Cron-Job bei Ablauf der 12 Stunden — blockiert an genau dieser
Sperre, bis der erste Versuch fertig committed hat, und bricht danach
sofort und folgenlos ab (Status ist dann bereits `running`/`cancelled`,
nicht mehr `lobby`). Der Trigger reagiert außerdem bewusst nur auf
menschliche Beitritte (`is_ai = false`), damit die KI-Einfügungen von
`start_season()` selbst nicht denselben Trigger rekursiv erneut auslösen.

## Wichtigste Sicherheitsregel

`turn_submissions` (Gebote, Due Diligence, Maßnahmen eines Spielers) hat
**ausschließlich** eine `SELECT`-Policy `profile_id = auth.uid()`. Es gibt
keine weitere Policy, die Mitspielern, dem Lobby-Host oder abgeschlossenen
Partien Lesezugriff gewährt — auch nicht nach Auswertung des Halbjahres.
Postgres Row Level Security ist "deny by default": Ohne passende Policy
bleibt eine Zeile für alle anderen Nutzer unsichtbar, unabhängig davon, wie
die Abfrage formuliert ist. Die serverseitige Auswertungsroutine, die für
die Gebotsauflösung zwangsläufig alle Abgaben eines Halbjahres lesen muss,
läuft ausschließlich mit dem geheimen `service_role`-Key in einer
vertrauenswürdigen Server-Umgebung (z. B. Edge Function) und schreibt nur
die öffentlichen Ergebnisse nach `season_state` / `turn_results`. Dieser
Key wird niemals an den Browser eines Spielers ausgeliefert.
