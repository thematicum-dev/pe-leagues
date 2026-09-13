# Kartenbilder

Der Kartenkopf im Dealflow und im Portfolio zeigt entweder ein Foto oder eine
gezeichnete Szene. Fotos sind der Zielzustand; gezeichnet wird nur, solange für
einen Sektor kein Motiv hinterlegt ist.

Dieses Dokument enthält beides: die Bildprompts für die Fotos (unten Teil 1)
und den Arbeitsauftrag für die gezeichneten Szenen (Teil 2), falls an ihnen
weitergearbeitet werden soll.

---

## Teil 1 — Fotos

### Woher sie kommen

Claude erzeugt keine Rasterbilder. Die Motive entstehen in einem Bildmodell
(Midjourney, Firefly, DALL·E, Flux — die Prompts sind so geschrieben, dass sie
in allen funktionieren) oder kommen aus einer Bilddatenbank. Danach ablegen
nach der Anleitung in `public/sektoren/README.md`.

### Die technischen Vorgaben — gelten für alle fünf

Diese vier Zeilen gehören an jeden Prompt, sie entscheiden darüber, ob das Bild
in der Karte funktioniert:

> Aspect ratio 3:2. Dark cinematic scene, single light source from the upper
> right, deep shadows. The subject sits in the right half of the frame; the
> left 45 percent falls off into near-black empty space. No text, no logos, no
> watermarks, no recognisable faces.

Warum: Die Karte legt die Sektorfarbe über das Bild und blendet es nach links
zum Kartengrund aus — dort stehen Name und Anspruch. Ein hell und gleichmäßig
ausgeleuchtetes Motiv verliert dabei jede Form, ein mittig platziertes Motiv
verschwindet zur Hälfte unter der Schrift.

### Die fünf Motive

Je Sektor drei Fassungen erzeugen und die überzeugendste dreimal variieren
(anderer Ausschnitt, andere Brennweite) — dann sehen nicht alle Unternehmen
eines Sektors gleich aus.

**Software & IT** — `software-1.webp` … Grundfarbe elektrisches Blau

> Editorial photograph of a modern data centre aisle at night. A single black
> server rack in sharp focus on the right, its status LEDs glowing electric
> blue; the rest of the row falls away into darkness with shallow depth of
> field. Cold blue key light from the upper right, faint volumetric haze, fine
> film grain. Aspect ratio 3:2. Dark cinematic scene, single light source from
> the upper right, deep shadows. The subject sits in the right half of the
> frame; the left 45 percent falls off into near-black empty space. No text, no
> logos, no watermarks, no recognisable faces.

**Healthcare** — `healthcare-1.webp` … Grundfarbe Smaragd

> Editorial photograph of a sterile laboratory clean room at night. Precision
> instruments and glass vials on a stainless steel bench on the right, catching
> emerald green light; the room behind dissolves into darkness. Shallow depth
> of field, volumetric light, fine film grain. Aspect ratio 3:2. Dark cinematic
> scene, single light source from the upper right, deep shadows. The subject
> sits in the right half of the frame; the left 45 percent falls off into
> near-black empty space. No text, no logos, no watermarks, no recognisable
> faces.

**Industrials** — `industrials-1.webp` … Grundfarbe Gold

> Editorial photograph of an industrial robot arm in a dark machine shop. The
> articulated arm fills the right of the frame, its metal edges catching warm
> amber light, a shower of sparks from the tool head. Factory hall behind in
> silhouette, shallow depth of field, fine film grain. Aspect ratio 3:2. Dark
> cinematic scene, single light source from the upper right, deep shadows. The
> subject sits in the right half of the frame; the left 45 percent falls off
> into near-black empty space. No text, no logos, no watermarks, no
> recognisable faces.

**Consumer & Retail** — `consumer-1.webp` … Grundfarbe Violett

> Editorial product photograph of an unlabelled amber glass supplement bottle
> on a dark stone surface, fresh botanicals and leaves arranged behind it.
> Violet rim light from the upper right traces the shoulder of the bottle,
> background falling to near black. Shallow depth of field, soft reflections,
> fine film grain. Aspect ratio 3:2. Dark cinematic scene, single light source
> from the upper right, deep shadows. The subject sits in the right half of the
> frame; the left 45 percent falls off into near-black empty space. No text, no
> logos, no watermarks, no recognisable faces.

**Business Services** — `services-1.webp` … Grundfarbe Rosé

> Editorial photograph of a modern operations floor at night, seen from a low
> angle. Illuminated workstations and screens recede into the darkness on the
> right, their glow tinted magenta rose; empty dark floor in the foreground.
> Shallow depth of field, volumetric haze, fine film grain. Aspect ratio 3:2.
> Dark cinematic scene, single light source from the upper right, deep shadows.
> The subject sits in the right half of the frame; the left 45 percent falls
> off into near-black empty space. No text, no logos, no watermarks, no
> recognisable faces.

### Wenn ein Modell Negativ-Prompts kennt

> bright, flat lighting, white background, text, letters, watermark, logo,
> collage, borders, faces, hands, cartoon, illustration, 3d render, low
> contrast

### Nach dem Erzeugen

Auf 900 × 600 zuschneiden, als WebP mit Qualität um 72 speichern (Ziel unter
120 KB), nach `public/sektoren/` legen und `PHOTO_VARIANTS` in
`components/pel/battle.tsx` hochzählen. Details in
`public/sektoren/README.md`.

### Die zwei Stellschrauben danach

`PHOTO_SATURATION` und `PHOTO_TINT` stehen in `components/pel/battle.tsx`. Die
Vorgabe nimmt die Sättigung des Motivs auf 40 % zurück und legt die Sektorfarbe
mit 38 % darüber — genug, dass fünf Sektoren als fünf Farbfamilien lesbar
bleiben, wenig genug, dass das Motiv ein Foto bleibt. Wirken die Karten zu
farbgleich, `PHOTO_TINT` senken.

---

## Teil 2 — Die gezeichneten Szenen

Sie sind das, was ohne Foto zu sehen ist. Wer daran weiterarbeitet, kann den
folgenden Auftrag in eine Claude-Code-Sitzung in diesem Repository einfügen.

Vorweg der ehrliche Befund aus zwei Anläufen: Gezeichnetes SVG erreicht keine
fotografische Anmutung. Was es erreichen kann, ist eine saubere, beleuchtete
Illustration — und der Unterschied zwischen einem Schaubild und einer
Illustration liegt in den fünf Regeln unten.

> Zeichne die fünf Bildszenen der Unternehmenskarten in
> `components/pel/battle.tsx` neu. Nur die Szenen — Aufbau, Daten, Text und
> Kennzahlen der Karte bleiben unverändert.
>
> **Die fünf Regeln, an denen es hängt:**
> - **Ein Hauptobjekt** je Szene, groß genug, dass es vom rechten Rand
>   angeschnitten wird. Alles andere ist Beiwerk und tritt deutlich zurück.
> - **Eine Lichtquelle**, oben rechts. Jede Fläche bekommt eine helle und eine
>   dunkle Seite; Kanten zum Licht tragen einen schmalen Saum (`id.lit`),
>   abgewandte Flächen laufen nach `id.shade`.
> - **Drei Tiefenebenen** mit deutlich verschiedenem Helligkeitswert.
> - **Verläufe statt Volltonflächen** für Material. Ein Verlauf über einen
>   Zylinder ergibt ein Rohr, eine Volltonfläche einen Balken.
> - **Höchstens drei wirklich helle Stellen** je Szene. Sie sind der Grund,
>   warum das Bild leuchtet.
>
> **Die Schnittstelle:**
> - `function Racks({ rnd, id, k = "", glow = false })`, gibt ein `<g>` zurück.
>   `k` ist der Namensraum für eigene Verlaufs-IDs (auf einem Bildschirm stehen
>   bis zu zehn Karten, doppelte IDs greifen quer darüber hinweg), `glow`
>   schaltet den Leuchtdurchgang.
> - **Zwei Durchgänge:** `HeroArt` ruft jede Szene zweimal mit derselben
>   Zufallsfolge auf. Bei `glow` zeichnest du **nur, was Licht abgibt** —
>   Dioden, Kanten im Licht, Funken —, kräftig und ohne Beiwerk; dieser
>   Durchgang läuft unscharf darunter und gibt der Zeichnung ihren Hof. Erst
>   alles berechnen, dann auf `glow` verzweigen, damit beide Durchgänge
>   dieselbe Geometrie ergeben.
> - **Koordinaten:** lokal `0..220` in x, `0..200` in y; `HeroArt` versetzt die
>   Szene um `translate(80 0)` in eine `300 x 200`-Fläche mit
>   `preserveAspectRatio="xMaxYMax slice"`. Sichtbar ist auf einem Telefon etwa
>   `y = 26..200`, der Boden gehört auf `y ≈ 185`. Über den ersten rund 60 % der
>   Breite liegt die Abdeckung, die den Text lesbar hält — was dort steht, ist
>   gedämpft.
> - **Nur die vier Farbmarken** aus `id`: `id.shade`, `id.deep`, `id.own`,
>   `id.lit`. Keine festen Hex-Werte: Der Farbton ist je Unternehmen ein
>   anderer, und die Karte steht in beiden Themes.
> - **`rnd()` ist die einzige Zufallsquelle**, in fester Reihenfolge. Dieselbe
>   Firma muss über die ganze Partie dasselbe Bild behalten.
> - **Nichts dem Zufall überlassen, was die Bildaufteilung trägt.** Das
>   Hauptobjekt gehört an eine feste Stelle, gestreut wird das Beiwerk. Nimmt
>   man etwa den zufällig vordersten Knoten als Zentrum, landet er bei manchen
>   Startwerten in der unteren rechten Ecke — dort steht der Anspruch des
>   Sektors, und angeschnitten ist er obendrein.
> - **Aufwand:** höchstens etwa 120 Knoten je Szene, keine Filter innerhalb der
>   Szene.
>
> **Vorgehen.** Zeichnen ohne Hinsehen führt zurück zu Schaubildern. Leg dir
> eine Seite mit einer Karte je Sektor an (`newDeal` mit fester Zufallsinstanz,
> im Client erzeugt, sonst Hydration-Fehler), nimm den Kopfbereich mit
> Playwright auf (`/opt/pw-browsers/chromium` ist installiert) und sieh dir
> jedes Bild an, bevor du weitermachst. Eine Szene nach der anderen. Zum
> Schluss beide Themes, 320/360/412 px und zwei Karten desselben Sektors
> nebeneinander.
>
> **Nicht anfassen:** Kennzahlen, Sichtbarkeitsregeln, Kartenaufbau,
> `lib/engine`, Tests.
