# Kulisse

Hier liegt das Motiv hinter der Startseite (`/`) und den Anmeldeseiten
(`/login`, `/signup`, `/forgot-password`, `/update-password`, `/confirm-email`,
`/access`). Das Dashboard bekommt es bewusst nicht: Dort wird gearbeitet,
hier wird empfangen.

Fehlt die Datei, bleiben die beiden Verläufe über dem Grundton stehen — die
Seite sieht dann gewollt aus und nicht nach einem kaputten Bild. Sobald eine
Datei da ist, erscheint sie von selbst; im Code ist nichts umzustellen.

## Der aktuelle Stand

`eingang.webp`, 941 × 1672, 113 KB. Nachgemessen: Seitenverhältnis 0,5628
gegen 0,5625 für 9:16, mittlere Helligkeit 7,5 %, linke 45 % bei 1,8 %.

## Die Datei ersetzen

Ablegen als `eingang.webp`. Genau dieser Name, genau dieser Ordner.

- **Hochformat 9:16, mindestens 900 Pixel breit.** Der Bildschirm, auf dem die
  Seite zuerst gesehen wird, ist ein Telefon. Auf dem Rechner wird das Motiv
  seitlich angeschnitten — das ist eingeplant, siehe `background-position`
  unten.
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

1. ein gerichteter Verlauf, links kräftiger, in der rechten Bildhälfte offener
   — er hält die Umgebung der Karte ruhig,
2. eine Abdunklung zu den Rändern hin,
3. das Motiv selbst, `cover` und auf `68% center` gesetzt.

Unter 560 Pixel Breite kommt ein eigener Ausschnitt dazu (`auto 220%` auf
`60% 95%`). Grund: Auf dem Telefon füllt die Karte die Breite, vom Motiv
bleiben nur die Bänder darüber und darunter — und die zeigen bei `cover`
ausgerechnet die dunkelsten Stellen, Decke und Stuhllehne. Der engere
Ausschnitt holt stattdessen die beleuchtete Modellanlage ins obere Band.

Ist das eigene Motiv heller als dieses, ist der erste Verlauf die
Stellschraube: die vier Deckkraftwerte gemeinsam anheben. Ist es dunkler, sie
gemeinsam senken — für das jetzige Motiv mussten sie von 0,86/0,74/0,42/0,66
auf 0,6/0,42/0,1/0,34 herunter, sonst war vom Bild nichts zu sehen. Sitzt der
Bildinhalt an anderer Stelle, sind es die beiden `background-position`.
