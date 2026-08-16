# PE Leagues

Dieses Projekt ist ein kleines Spiel im Browser: eine Private-Equity-Simulation
auf Deutsch. Man spielt einen Investmentfonds gegen vier computergesteuerte
Fonds über mehrere Spieljahre.

Damit das Spiel im Internet aufrufbar ist (z. B. über Vercel), steckt es in
einem sogenannten "Next.js-Projekt". Das ist im Grunde nur ein Ordnergerüst,
das dafür sorgt, dass eine Webseite daraus gebaut werden kann.

## Wo liegt was?

- **`components/PeLeagues.tsx`**
  Das ist das eigentliche Spiel. Die komplette Spiellogik, alle Formeln,
  Zahlen und die Oberfläche stecken in dieser einen Datei. Sie wurde 1:1 aus
  der ursprünglichen Datei `pe-leagues-mvp7.tsx` übernommen — an der Logik
  wurde nichts verändert.

- **`app/page.tsx`**
  Die Startseite. Sie macht nichts anderes, als das Spiel aus
  `components/PeLeagues.tsx` anzuzeigen. Wer die Webseite öffnet, landet
  hier.

- **`app/layout.tsx`**
  Das "Grundgerüst" jeder Seite (z. B. der `<html>`-Rahmen und der
  Seitentitel im Browser-Tab).

- **`app/globals.css`**
  Ein paar ganz grundlegende Stil-Einstellungen (z. B. dass die Seite die
  volle Bildschirmhöhe nutzt). Die eigentliche Gestaltung des Spiels
  (Farben, Schriftarten, Layout) steckt direkt in `components/PeLeagues.tsx`
  und wird von dort geladen — inklusive der Schriftarten, die sich das Spiel
  selbst aus dem Internet lädt (Google Fonts).

- **`public/`**
  Ordner für Dateien, die direkt und unverändert ausgeliefert werden (aktuell
  nur das Browser-Icon "favicon.ico").

- **`package.json`**
  Liste aller Zusatz-Bausteine ("Abhängigkeiten"), die das Projekt braucht,
  z. B. Next.js selbst, React und `lucide-react` (eine kleine Bibliothek für
  die Icons, die im Spiel verwendet werden).

- **`tsconfig.json`, `next.config.ts`, `eslint.config.mjs`**
  Technische Einstellungsdateien für das Projekt-Gerüst. Da die
  Original-Spieldatei nicht durchgehend "typisiert" ist (ein Merkmal der
  Programmiersprache TypeScript), wurde die Typprüfung bewusst locker
  eingestellt, damit sie den Bau der Seite nicht blockiert.

- **`.gitignore`**
  Liste von Dateien und Ordnern, die nicht mit ins Projekt-Archiv (Git)
  aufgenommen werden sollen — vor allem automatisch erzeugte Dateien, z. B.
  aus `node_modules` (heruntergeladene Zusatz-Bausteine) oder `.next`
  (Bau-Ergebnisse).

## Projekt lokal starten

Falls jemand das Spiel auf dem eigenen Rechner ausprobieren möchte:

```
npm install
npm run dev
```

Danach ist die Seite unter `http://localhost:3000` erreichbar.

## Auf Vercel veröffentlichen

Das Projekt ist so aufgebaut, dass Vercel (ein Anbieter zum Veröffentlichen
von Webseiten) es ohne weitere Einstellungen erkennt und bauen kann. Es
reicht, das Repository dort zu verbinden.
