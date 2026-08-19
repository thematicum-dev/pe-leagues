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
17. `20260817090800_season_evaluation_columns.sql` – `seasons` um `started_at`, Claim-Token und `final_ranking` erweitert
18. `20260817090900_start_season_sets_started_at.sql` – `start_season()` setzt `started_at`
19. `20260817091000_season_submission_status.sql` – `season_submission_status()`: aggregierter Status für den Wartezustand
20. `20260817091100_evaluation_claim_commit.sql` – Claim/Commit-Funktionen für die Rundenauswertung (nur `service_role`)
21. `20260817091200_cron_evaluate_seasons.sql` – pg_net + Vault-Secret + minütlicher pg_cron-Job, ruft die Edge Function `evaluate-seasons` auf
22. `20260818100000_seasons_cancelled_reason.sql` – unterscheidet `cancelled_reason` ('empty' vs. 'creator_deleted')
23. `20260818100100_leave_season.sql` – Lobby verlassen
24. `20260818100200_delete_and_force_start_season.sql` – Ersteller-Rechte: Partie löschen/sofort starten
25. `20260819100000_fix_start_season_slot_reshuffle.sql` – Fix für die Platzvergabe beim Partiestart
26. `20260819110000_admin_access.sql` – `is_admin()`: Admin-Zugang fest auf `thematicum.dev@gmail.com` begrenzt
27. `20260819110100_admin_read_functions.sql` – `admin_list_seasons()`/`admin_list_users()`: Admin-Übersichten inkl. E-Mail und Statistik
28. `20260819110200_admin_reset_season.sql` – `admin_reset_season()`: Partie vollständig zurücksetzen
29. `20260819110400_global_leaderboard.sql` – `global_leaderboard()`: Rangliste aller Spieler über alle abgeschlossenen Partien
30. `20260819110500_realtime_season_state.sql` – Realtime auch für `season_state`, damit der Halbjahreswechsel ohne manuellen Reload ankommt

## Admin-Bereich

`/admin` (siehe `app/admin/`) ist ausschließlich für den Account mit der
E-Mail-Adresse `thematicum.dev@gmail.com` sichtbar (`public.is_admin()`,
Migration 26). Dort lassen sich alle Partien inkl. Fortschritt und alle
Nutzer inkl. E-Mail und Statistik einsehen, einzelne Nutzer löschen
(`auth.admin.deleteUser`, service_role) und eine Partie vollständig
zurücksetzen (`admin_reset_season()`).

Jede `admin_*`-Funktion prüft `is_admin()` selbst noch einmal serverseitig
-- die Prüfung in `app/admin/adminAuth.ts` ist nur für den sofortigen
Redirect da, keine alleinige Sicherheitsschranke.

## Serverseitige Rundenauswertung

Die eigentliche Auswertung eines Halbjahres (Auktionen auflösen,
Maßnahmen/Personal/Markt fortschreiben, Halbjahr vorrücken) läuft in der
Edge Function `supabase/functions/evaluate-seasons` und benutzt dafür
`lib/engine/runQuarter` — dieselbe Logik wie der Übungsmodus, nur über bis
zu fünf menschliche oder KI-Fondsplätze statt nur einen. `lib/engine/deadline.ts`
berechnet die Frist des jeweils nächsten Halbjahres (Zeitzone
Europe/Berlin, DST-sicher, siehe die Tests dort für die beiden
Umstellungstermine).

Ablauf pro Partie und Halbjahr:

1. `claim_season_for_evaluation()` sperrt die `seasons`-Zeile, prüft
   erneut, ob die Partie wirklich fällig ist (alle menschlichen Spieler
   haben abgegeben, oder die Frist ist abgelaufen), und vergibt bei Erfolg
   ein Claim-Token — alles in einer kurzen Transaktion.
2. Die Edge Function lädt `season_state`/`turn_submissions` mit dem
   `service_role`-Key (umgeht RLS gezielt für diesen einen, vertrauenswürdigen
   Zweck) und führt `runQuarter()` aus.
3. `commit_season_evaluation()` (bzw. `commit_season_bootstrap()` für den
   allerersten Dealflow direkt nach `start_season()`) schreibt das Ergebnis
   nur, wenn das übergebene Token noch zum aktuellen Claim passt.

### Nach dem Deploy einmalig einzurichten

Migration 21 legt zwei Vault-Secrets an (`evaluate_seasons_secret` — der
zufällig erzeugte Wert, mit dem sich Cron-Aufrufe ausweisen — und
`evaluate_seasons_function_url` als leerer Platzhalter). Ohne die folgenden
beiden Schritte ruft `invoke_evaluate_seasons()` nichts auf (es prüft die
URL und tut bei einem leeren Platzhalter nichts):

1. Edge Function deployen und den in Vault erzeugten Secret-Wert als
   Function-Secret setzen (derselbe Wert, den die Datenbank kennt):
   ```
   supabase functions deploy evaluate-seasons
   select decrypted_secret from vault.decrypted_secrets where name = 'evaluate_seasons_secret';
   supabase secrets set EVALUATE_SEASONS_SECRET=<der eben ausgelesene Wert>
   ```
2. Die tatsächliche Function-URL in Vault eintragen:
   ```sql
   select vault.update_secret(
     (select id from vault.secrets where name = 'evaluate_seasons_function_url'),
     'https://<project-ref>.functions.supabase.co/evaluate-seasons'
   );
   ```

Danach zur Kontrolle: **Database → Cron Jobs** sollte zusätzlich zu
`start-due-seasons` den Job `evaluate-seasons` mit der Planung `* * * * *`
zeigen.

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

## Sicherheit der Rundenauswertung

Vier Garantien, in der Reihenfolge geprüft, in der sie in der
Aufgabenstellung standen:

1. **Keine Abgabe geht an den Browser eines anderen Spielers.**
   `turn_submissions` hat unverändert nur die `SELECT`-Policy
   `profile_id = auth.uid()` (siehe unten). Die neue Statusabfrage
   `season_submission_status()` liefert ausdrücklich nur Zählwerte (wie
   viele von wie vielen) und den eigenen Status, nie wer was abgegeben hat.
   Die Edge Function liest `turn_submissions` ausschließlich mit dem
   `service_role`-Key innerhalb ihrer eigenen, nicht-öffentlichen
   Server-Umgebung; was daraus in `season_state`/`turn_results` geschrieben
   wird, ist der bereits ausgewertete öffentliche Zustand (Portfolios aller
   Fonds), nicht die rohe Abgabe — genau dieselbe Transparenz, die
   `season_state` für abgeschlossene Halbjahre ohnehin schon für alle
   Mitspieler vorsieht.
2. **Der Server prüft jede Abgabe, vertraut keinem gesendeten Wert.**
   `lib/engine/runQuarter.ts` verwendet aus einer Abgabe ausschließlich
   Absichten (`dealId`, `multiple`, `leverage`, Maßnahmen-/Personal-/
   Exit-Referenzen) und berechnet Preise, Kassenstände, Zinsen, IRR/TVPI
   selbst. Jede Referenz (Deal, Beteiligung, Angebot, Kandidat) wird gegen
   den tatsächlichen Zustand geprüft; unbekannte, unzulässige oder
   fehlerhafte Werte (auch nicht-numerische, fehlende oder falsch typisierte
   Felder) werden ignoriert, nie ungeprüft übernommen — ein manipuliertes
   `payload` kann höchstens dazu führen, dass die eigene Abgabe wirkungslos
   bleibt.
3. **Keine doppelte Abgabe, keine doppelte Auswertung — auch nicht
   gleichzeitig.** `turn_submissions_unique(season_id, half_year,
   profile_id)` verhindert eine zweite Abgabe auf Datenbankebene (der
   Client fängt den daraus resultierenden `23505`-Fehler ab und zeigt den
   Wartezustand, statt einen Fehler zu melden). Die Auswertung einer Partie
   läuft über ein Zwei-Phasen-Claim (`claim_season_for_evaluation()` sperrt
   die Zeile und prüft Fälligkeit erneut, `commit_*` schreibt nur mit
   gültigem Token) plus dem unique-Constraint auf
   `season_state(season_id, half_year)` als zweite, unabhängige Sperre.
4. **Der Browser kann die Auswertung nicht selbst auslösen.**
   `claim_season_for_evaluation()`, `commit_season_bootstrap()`,
   `commit_season_evaluation()` und `list_seasons_for_evaluation_sweep()`
   sind ausschließlich für `service_role` freigegeben (`revoke all ... from
   public, authenticated, anon`) — ein Postgres-Berechtigungsfehler, keine
   Anwendungslogik, die man umgehen könnte. Die Edge Function selbst prüft
   zusätzlich einen Secret-Header, der ausschließlich in Supabase Vault und
   als Function-Secret hinterlegt ist, nie im Quelltext oder im Browser.

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
