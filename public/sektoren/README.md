# Sektormotive

Hier liegen die Fotos, die der Kartenkopf im Dealflow und im Portfolio zeigt.
Der Ordner ist absichtlich leer ausgeliefert: Solange kein Motiv hinterlegt
ist, zeichnet die Karte ihre Szene selbst.

## Eine Datei hinzufügen

1. Datei ablegen als `<sektor>-<nummer>.webp`, durchnummeriert ab 1.
   Sektoren: `software`, `healthcare`, `industrials`, `services`, `consumer`.
2. In `components/pel/battle.tsx` die Zahl in `PHOTO_VARIANTS` auf die Anzahl
   der vorhandenen Motive dieses Sektors setzen. Was dort nicht gezählt ist,
   wird nie gezogen; eine Null bedeutet "weiter zeichnen".

Beispiel: `software-1.webp`, `software-2.webp`, `software-3.webp` ablegen und
`Software: 3` eintragen.

Die Reihenfolge der beiden Schritte ist gleichgültig: Lässt sich ein
gezähltes Motiv nicht laden, zeichnet die Karte weiter. Ein Sektor darf also
scharfgeschaltet werden, bevor seine Datei im Ordner liegt — sobald sie da
ist, erscheint sie von selbst.

## Wie ein Motiv beschaffen sein muss

- **Seitenverhältnis 3:2**, 900 × 600 Pixel. Größer bringt nichts, die Fläche
  ist auf dem Telefon rund 412 × 238 Punkte groß.
- **WebP, Qualität um 72, höchstens 120 KB.** Auf einem Bildschirm stehen bis
  zu zehn Karten; jedes Kilobyte zählt zehnfach.
- **Dunkel, mit einer Lichtquelle oben rechts.** Die Karte legt die
  Sektorfarbe darüber und blendet nach links zum Kartengrund aus — ein helles
  oder gleichmäßig ausgeleuchtetes Motiv verliert dabei seine Form.
- **Das Motiv gehört in die rechte Bildhälfte.** Über den linken rund 45 %
  stehen Name und Anspruch; dort muss das Bild ruhig und dunkel sein.
- **Kein Text, keine Logos, keine erkennbaren Gesichter.**

## Zwei Stellschrauben

`PHOTO_SATURATION` (Sättigung des Motivs) und `PHOTO_TINT` (Deckkraft der
Sektorfarbe darüber) stehen in `components/pel/battle.tsx` direkt unter
`PHOTO_VARIANTS`. Wirken die Karten zu farbgleich, `PHOTO_TINT` senken; sehen
sie aus wie fünf verschiedene Anwendungen, erhöhen.

## Warum mehrere Motive je Sektor

Ein Motiv je Sektor hieße: Alle Dentallabore sehen gleich aus. Aus dem
Startwert des Unternehmens wird eines der vorhandenen Motive gezogen, drei je
Sektor reichen dafür gut aus. Was ein Foto nicht leisten kann — die Identität
des einzelnen Unternehmens — tragen weiterhin Farbton, Monogramm und Signet.
