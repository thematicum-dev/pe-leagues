# Kulisse

Hier liegt das Motiv hinter der Startseite (`/`) und den Anmeldeseiten
(`/login`, `/signup`, `/forgot-password`, `/update-password`, `/confirm-email`,
`/access`). Das Dashboard bekommt es bewusst nicht: Dort wird gearbeitet,
hier wird empfangen.

Der Ordner ist absichtlich ohne Bild ausgeliefert. Fehlt die Datei, bleiben die
beiden Verläufe über dem Grundton stehen — die Seite sieht gewollt aus und
nicht nach einem kaputten Bild. Sobald die Datei da ist, erscheint sie von
selbst; im Code ist nichts umzustellen.

## Die Datei

Ablegen als `eingang.webp`. Genau dieser Name, genau dieser Ordner.

- **Hochformat, etwa 1080 × 1920 Pixel.** Der Bildschirm, auf dem die Seite
  zuerst gesehen wird, ist ein Telefon. Auf dem Rechner wird das Motiv seitlich
  angeschnitten — das ist eingeplant, siehe `background-position` unten.
- **WebP, Qualität um 76, höchstens 250 KB.** Es ist ein einzelnes Bild auf
  einer einzelnen Seite, darf also deutlich mehr wiegen als ein Kartenmotiv;
  es steht aber vor der Anmeldung und damit vor allem anderen.
- **Dunkel, mit warmen Lichtern.** Dieselbe Sprache wie die Kartenmotive:
  nächtlich, goldene Lichtquellen, tiefe Schatten. Ein helles Motiv trägt die
  Schrift der Karte nicht.
- **Das Geschehen gehört nach rechts und unten.** Die Karte steht mittig und
  ist höchstens 420 Punkte breit; links davon muss das Bild ruhig sein.
- **Kein Text, keine Logos, keine erkennbaren Gesichter.**

## Was darüber liegt

In `app/globals.css` unter `.landing, .authwrap` stehen drei Ebenen, von vorn
nach hinten:

1. ein gerichteter Verlauf, links fast deckend, in der rechten Bildhälfte
   offener — er trägt die Schrift,
2. eine Abdunklung zu den Rändern hin,
3. das Motiv selbst, `cover` und auf `68% center` gesetzt.

Ist das eigene Motiv heller oder unruhiger als vorgesehen, ist die erste Ebene
die Stellschraube: Die vier Deckkraftwerte dort gemeinsam anheben. Wandert der
Bildinhalt zu weit aus dem Bild, ist es die `background-position` der dritten.
