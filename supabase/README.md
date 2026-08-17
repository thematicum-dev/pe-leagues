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

## Anwenden ohne SQL-Editor (empfohlen, funktioniert am Handy)

Im Supabase-Dashboard unter **Project Settings → Integrations → GitHub**
dieses Repository verbinden und den Produktions-Branch auf `main` setzen.
Supabase wendet danach `supabase/migrations/*.sql` automatisch an, sobald
ein Pull Request auf `main` gemerged wird.

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
