---
name: live
description: Die App im Browser starten und wirklich bedienen — Spielansichten, Karten, Regler, Meldungen. Nutzen, wenn eine Änderung an components/pel/ui.tsx, app/season/[id]/MultiplayerGame.tsx, components/PeLeagues.tsx oder components/ExplainMode.tsx im echten Rendering geprüft werden soll, wenn ein Screenshot gebraucht wird oder wenn "live testen", "starten", "im Browser ansehen" verlangt ist. Nicht nötig für reine Engine-Änderungen unter lib/engine — dafür reicht `npm test`.
---

# Die Partie live bedienen

Die Spielansichten hängen hinter `requireAccess()` und damit an Supabase.
In einem frischen Container gibt es keine Zugangsdaten, und selbst mit
welchen wäre es falsch, eine echte Partie anzufassen, um ein Layout zu
prüfen.

Der Weg drumherum: eine **Wegwerf-Route**, die mit dem echten
`runQuarter()` ein paar Halbjahre durchspielt und darauf die **echte**
`MultiplayerGame`-Komponente rendert. Kein Mock der Oberfläche — nur ein
Ersatz für die Datenquelle. Was danach im Browser steht, ist das, was ein
Spieler sieht.

## Ablauf

```bash
bash .claude/skills/live/setup.sh      # Harness einsetzen, bauen, starten
# … prüfen (siehe unten) …
bash .claude/skills/live/teardown.sh   # Harness entfernen, Server beenden
```

`setup.sh` schreibt den Port, unter dem der Server läuft, nach
`/tmp/pel-live-port`. Danach:

```
http://127.0.0.1:$(cat /tmp/pel-live-port)/live-test?hy=8
http://127.0.0.1:$(cat /tmp/pel-live-port)/live-test/practice
```

Zwei Routen, zwei Zwecke:

- **`/live-test`** rendert die Mehrspielerpartie auf einem fertigen Zustand.
  Gut für Ansichten, Karten und Meldungen — aber ein Halbjahr lässt sich dort
  nicht abschließen, das macht der Server.
- **`/live-test/practice`** ist der Übungsmodus. Er rechnet seine Halbjahre im
  Browser und lässt sich deshalb wirklich durchspielen: kaufen, Maßnahmen
  starten, zwanzig Halbjahre abschließen, Berichte lesen. Das ist der Weg,
  wenn eine Wirkung über mehrere Perioden zu prüfen ist.

Parameter der Route:

| Parameter | Wirkung |
|---|---|
| `hy=N` | Halbjahr, in dem die Partie steht (1–20). Ab 16 greift die Tail-End-Vorschau. Ausgewertet sind N−1 Halbjahre — über das N-te wird gerade entschieden. |
| `hold=1` | Nichts verkaufen. Ohne das steht das Portfolio spät in der Laufzeit leer. |
| `breach=1` | Genau ein Unternehmen, danach nur Zukäufe, bis der Covenant reißt und das Portfolio leer ist. Für alles, was ein Totalverlust auslöst. |
| `seed=N` | Anderer Startwert derselben Mechanik. Der Weg zu jedem Zustand, den die Standardpartie nicht hergibt — suchen lässt er sich mit einem kurzen Vitest-Lauf über `runQuarter`, statt ihn im Browser zu erwürfeln. |

Gefahren im Browser dann mit `node .claude/skills/live/drive.mjs` als
Vorlage — dort stecken die Helfer, die sonst jedes Mal neu erfunden werden
(Start ohne Proxy, Warten auf Hydration, Regler bedienen, Überlauf messen).

**Nach dem Prüfen `teardown.sh` laufen lassen und `git status` ansehen.**
Der Harness gehört nicht in einen Commit.

## Was hier weh tut (und schon gelöst ist)

Diese fünf Punkte haben beim ersten Mal zusammen über eine Stunde
gekostet. Alle sind in den Skripten erledigt; sie stehen hier, damit
niemand sie erneut sucht.

1. **Port 3000 ist unbrauchbar.** Requests dorthin bekommen ein leeres
   `200` zurück, ohne dass der Server sie je sieht — irgendetwas in der
   Umgebung fängt sie ab. `setup.sh` nimmt deshalb 3333.

2. **Kein `next dev`, sondern `next build && next start`.** Im Dev-Modus
   antwortet die Umgebung auf einen Turbopack-Chunk mit `403`; der fehlt
   dann, React hydriert nie, und die Seite sieht aus, als wäre sie tot —
   ohne eine einzige Fehlermeldung. Im Produktionsbuild tritt das nicht auf.

3. **Chromium braucht `--no-proxy-server`.** Sonst laufen auch die
   `127.0.0.1`-Anfragen in den Agent-Proxy.

4. **Ordner mit `_` am Anfang werden vom App Router nicht geroutet.**
   `app/__live` liefert 404, `app/live-test` funktioniert.

5. **Regler lassen sich nicht über `el.value` setzen.** React verfolgt den
   Wert über einen eigenen Setter und ignoriert die Zuweisung — die Anzeige
   bleibt stehen, und man hält es für einen Fehler in der Komponente. Echte
   Tastatureingabe nehmen (`focus()`, dann `Home` / `End` / `ArrowRight`);
   `drive.mjs` hat das als `press()`.

6. **Ein offener Dialog hält die ganze Partie an, ohne dass etwas nach einem
   Fehler aussieht.** Der Maßnahmenkatalog schließt über seinen
   „Abbrechen"-Knopf oder einen Klick auf den Hintergrund — **nicht** über
   `Escape`. Bleibt er stehen (etwa weil eine Maßnahme gesperrt war und das
   Skript danach `Escape` drückt), verdeckt er „Halbjahr abschließen", jeder
   weitere Klick geht ins Leere, und der Mitschnitt zeigt zwölf Halbjahre
   lang exakt dieselben Zahlen. Das liest sich wie ein stehengebliebenes
   Spiel und ist keins. Deshalb: vor jedem `Halbjahr abschließen` prüfen,
   dass kein `.modal` offen ist, und das Halbjahr aus der Kopfzeile
   (`HALBJAHR n/20`) mitschreiben — dann fällt ein Stillstand sofort auf.

7. **„Mehr Details" ist ein Umschalter.** Wer in einer Schleife immer nur das
   erste Vorkommen anklickt, klappt dieselbe Karte auf und wieder zu und
   liest danach überall `null`. Je Karte einmal klicken und vorher prüfen,
   ob sie schon offen ist.

Harmlos und erwartbar: Google Fonts scheitert am Zertifikat des Proxys
(es wird die Systemschrift genommen), und der Supabase-Realtime-Socket
läuft gegen die Platzhalter-URL ins Leere. Beides ignorieren.

## Handgriffe, die sonst hängen bleiben

- **Tab wechseln:** `.tabs button` in der Reihenfolge Dealflow, Portfolio,
  Peer Group. Vor dem ersten erfolgreichen Klick ist die Seite eventuell
  noch nicht hydriert — `drive.mjs` klickt so lange, bis der Tab wirklich
  wechselt, und meldet das als `hydriert`.
- **Eigenkapital nachschießen:** Der Bestätigungsknopf im Dialog ist
  anfangs **deaktiviert** ("0 Mio. € zuführen"), weil der voreingestellte
  Betrag der Equity Cure ist und der bei haltendem Covenant null beträgt.
  Erst den Regler bewegen.
- **Maßnahmenkatalog:** Der Dialog schließt bei einem Klick auf den
  Hintergrund. Regler nicht am äußersten Rand anklicken.
- **Der Feed ist nach Fondsplatz gefiltert.** Die Route rendert Platz 0;
  was Platz 1 privat sieht, steht dort nicht — das ist richtig so.

## Worauf sich schauen lohnt

Einmal ansehen, nicht nur Screenshots ablegen: ein leeres Bild heißt,
dass die Seite nicht hydriert ist, nicht dass alles gut aussieht.

- `document.documentElement.scrollWidth` muss 390 bleiben — alles darüber
  heißt, dass etwas aus seiner Karte läuft (`drive.mjs`: `overflow()`).
- `pageerror` und `console`-Fehler mitschreiben, Supabase und Fonts
  herausfiltern.
