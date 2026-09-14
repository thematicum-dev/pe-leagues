# Eingangsbild

Das Motiv hinter Startseite und Anmeldung. Anders als die Kartenmotive gibt es
nur eines, und es steht vor allem anderen: Es ist das Erste, was ein neuer
Spieler von PE Leagues sieht. Abgelegt wird es nach `public/kulisse/README.md`
als `public/kulisse/eingang.webp`.

Claude erzeugt keine Rasterbilder. Das Motiv entsteht in einem Bildmodell
(Midjourney, Firefly, DALL·E, Flux — der Prompt ist so geschrieben, dass er in
allen funktioniert) oder kommt aus einer Bilddatenbank.

---

## Der Prompt

> Photorealistic interior of a private equity fund's corner office at night,
> high above a financial district. Floor-to-ceiling glass on the right half of
> the frame; beyond it a dense skyline of dark towers, their windows lit in
> warm amber, receding into haze. Inside, on a polished black marble desk in
> the lower right: a glass globe with continents traced in fine glowing gold
> lines, a short row of brushed-brass bars stepping upward beside it, and a
> tablet lying flat whose screen throws a faint gold line-chart onto the stone.
> A single thin ring of warm light hangs above, out of focus. The entire left
> 45 percent of the frame is empty, unlit office — deep near-black shadow with
> only the faintest reflection on the floor.
>
> Cinematic night photograph, shot on a 35mm lens at f/2, shallow depth of
> field with the skyline softly out of focus. Lighting is entirely practical
> and warm: amber and brass against near-black. No daylight, no white or blue
> light sources, no overhead fill. Deep crushed blacks, high contrast, subtle
> film grain. Vertical composition, 9:16.
>
> No text, no numbers, no logos, no brand marks, no watermarks, no people, no
> faces, no hands.

### Wenn das Ergebnis nicht sitzt

| Fehler | Ergänzung an den Prompt |
| --- | --- |
| Zu hell, sieht aus wie ein Werbefoto | `extremely dark, underexposed by two stops, black point crushed` |
| Linke Hälfte ist zugestellt | `the left half of the frame is completely empty negative space` |
| Kaltes oder weißes Licht | `strictly warm color temperature, 2700K, no cool tones anywhere` |
| Motiv sitzt mittig | `subject pushed entirely into the right third and lower third` |
| Zu viele Gegenstände | `only three objects on the desk, nothing else` |

---

## Die technischen Vorgaben

Diese Punkte entscheiden darüber, ob das Bild an seiner Stelle funktioniert —
sie sind nicht Geschmack, sondern gemessen.

**Format.** Hochformat 9:16, **mindestens 900 Pixel breit** (das eingesetzte
Motiv hat 941 × 1672). Die Seite wird zuerst auf einem Telefon gesehen. Auf dem
Rechner wird das Motiv seitlich angeschnitten; das ist eingeplant, der
Bildausschnitt liegt auf `68% center`.

**Datei.** **WebP, höchstens 250 KB.** Das eingesetzte Motiv liegt bei
Qualität 86 und 113 KB. Es ist ein einzelnes
Bild auf einer einzelnen Seite und darf deutlich mehr wiegen als ein
Kartenmotiv (die liegen bei 20–27 KB). Es steht aber vor der Anmeldung und
damit vor allem anderen — wer es auf 600 KB aufbläst, verlängert genau den
einen Moment, in dem noch niemand Geduld hat.

**Helligkeit.** Dunkel, mit warmen Lichtern. Die mittlere Helligkeit gehört
unter etwa 12 % — ein Nachtbild, kein abgedunkeltes Tagbild. Lichtquellen nur
als kleine Punkte und Kanten, nicht als Flächen. Das eingesetzte Motiv liegt
bei 7,5 %, seine linken 45 % bei 1,8 %.

**Farbe.** Bernstein, Messing, Gold gegen Fast-Schwarz. Kein Weiß, kein
Tageslicht, keine kalten Blautöne. Dieselbe Sprache wie die Kartenmotive in
`public/sektoren/` — wer beides nebeneinanderlegt, soll dieselbe Welt sehen.

**Bildaufteilung.** Das Geschehen gehört nach **rechts und unten**. Die
linken rund 45 % müssen ruhig und dunkel sein. Grund: Die Karte steht mittig
und ist höchstens 420 Punkte breit; auf dem Telefon deckt sie die Bildmitte
fast vollständig ab, sichtbar bleibt vor allem der Rand.

**Inhalt.** Kein Text, keine Zahlen, keine Logos, keine Wasserzeichen. Keine
Personen, keine Gesichter, keine Hände — auch nicht angeschnitten oder
unscharf im Hintergrund.

---

## Was im Code darüber liegt

In `app/globals.css` unter `.landing, .authwrap` stehen drei Ebenen, von vorn
nach hinten: ein gerichteter Verlauf, der die Schrift trägt; eine Abdunklung
zu den Rändern; das Motiv selbst.

Unter 560 Pixel Breite kommt ein eigener Ausschnitt dazu. Auf dem Telefon füllt
die Karte die Breite; vom Motiv bleiben nur die Bänder darüber und darunter,
und die zeigen bei `cover` ausgerechnet die dunkelsten Stellen. Der engere
Ausschnitt holt stattdessen den hellsten Teil des Motivs ins obere Band.

Die Karte selbst deckt nur zu 58 % — das Motiv wandert sichtbar unter ihr
durch. Was die Schrift trägt, ist nicht ihre Fläche, sondern der
`backdrop-filter` dahinter: Die Unschärfe nimmt den Lichtern ihre Kanten,
`brightness(0.55)` dämpft sie. Eine deckende Fläche hätte beides nicht
gleichzeitig gekonnt. Wo es keinen `backdrop-filter` gibt, deckt die Karte
über `@supports` zu 94 %, weil dort nichts die Lichter dämpfen würde.

Nachgemessen wurde nicht geschätzt: Die Seite wird zweimal aufgenommen, einmal
mit und einmal ohne Schrift; aus der zweiten Aufnahme kommt der tatsächliche
Grund hinter jeder Textstelle, dagegen wird die Textfarbe gerechnet. Über
beide Seiten, 412 und 1280 Pixel Breite, liegt der engste Wert bei **4,77:1**
gegen die Anforderung 4,5:1 (Fließtext) beziehungsweise 3:1 (große Schrift) —
gemessen jeweils gegen das hellste Prozent des Grundes, nicht den Mittelwert.

Wer das Motiv austauscht, sollte diese Messung wiederholen. Ein helleres Motiv
kostet zuerst die Feldbeschriftungen der Anmeldung; Stellschrauben sind
`brightness` im `backdrop-filter` und die Deckkraft der Karte.

Die Deckkraft der Verläufe entscheidet dagegen nicht über die Lesbarkeit,
sondern darüber, wie viel vom Motiv überhaupt zu sehen ist. Beim jetzigen, sehr
dunklen Motiv mussten sie von 0,86/0,74/0,42/0,66 auf 0,6/0,42/0,1/0,34
herunter; ein helleres Motiv braucht sie wieder höher.
