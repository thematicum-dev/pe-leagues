# Prompt: Kartenbilder für Dealflow und Portfolio

Zum Einfügen in eine Claude-Code-Sitzung in diesem Repository. Er beauftragt
genau eine Sache: die fünf Bildszenen im Kopfbereich der Unternehmenskarten neu
zu zeichnen. Alles andere an der Karte bleibt, wie es ist.

Der Prompt steht hier und nicht in einer Notiz, weil er an die Schnittstelle
gebunden ist, die er beschreibt: Ändert sich `HeroArt` oder `identityOf` in
`components/pel/battle.tsx`, muss er mitgeändert werden.

---

## Der Prompt

> Zeichne die fünf Bildszenen der Unternehmenskarten in
> `components/pel/battle.tsx` neu. Nur die Szenen — Aufbau, Daten, Text und
> Kennzahlen der Karte bleiben unverändert.
>
> ### Was heute nicht funktioniert
>
> Sieh dir die Szenen zuerst an (`Racks`, `Helix`, `Robot`, `Bottle`,
> `Network`). Sie sind Diagramme, keine Bilder. Konkret:
>
> 1. **Kein Licht.** Jede Fläche ist ein Volltonwert. Ohne Lichtquelle gibt es
>    keine Kante, kein Volumen, kein Material. Ein Roboterarm aus drei Linien
>    bleibt ein Strichmännchen.
> 2. **Kein Tiefenaufbau.** Vorder-, Mittel- und Hintergrund liegen auf
>    derselben Helligkeit. Nichts steht vorn, nichts fällt zurück.
> 3. **Nebel statt Leuchten.** Der unscharfe Doppelgänger unter der Szene liegt
>    gleichmäßig hinter allem und vernebelt die Form, statt einzelne Lichter
>    hervorzuheben. (Er lief obendrein mit einem anderen Startwert als die
>    Zeichnung darüber — der Hof gehörte zu einem anderen Bild.)
> 4. **Kein Blickpunkt.** Fünf gleich große Schränke, neun gleich große Knoten.
>    Keine Hierarchie, kein Motiv, das die Karte trägt.
> 5. **Zu viel gleichzeitig.** Muster, Farbfeld, Glühen, Szene und zwei
>    Abdeckungen ergeben zusammen Matsch.
>
> ### Wie es aussehen soll
>
> Ein Bild, kein Schaubild. Die Vorlage ist die Bildsprache moderner
> Sammelkartenspiele: ein Hauptobjekt, groß, klar in der Silhouette, vom
> rechten Kartenrand angeschnitten, mit gerichtetem Licht auf dunklem Grund.
>
> Halte dich an diese fünf Regeln, sie sind der Unterschied:
>
> - **Ein Hauptobjekt je Szene**, groß genug, dass es angeschnitten wird. Alles
>   andere ist Beiwerk und muss deutlich zurücktreten.
> - **Eine Lichtquelle**, oben rechts. Jede Fläche bekommt dadurch eine helle
>   und eine dunkle Seite. Kanten, die zum Licht zeigen, tragen einen schmalen
>   hellen Saum (`id.lit`), abgewandte Flächen laufen nach `id.shade`.
> - **Drei Tiefenebenen** mit deutlich verschiedenem Helligkeitswert:
>   Hintergrund fast im Grund verschwindend, Mittelgrund gedämpft, Hauptobjekt
>   mit dem vollen Kontrastumfang.
> - **Verläufe statt Volltonflächen** für Material. Ein `linearGradient` von
>   `id.shade` nach `id.own` über einen Zylinder gelesen ergibt ein Rohr; eine
>   Volltonfläche ergibt einen Balken.
> - **Wenige Lichter, gezielt gesetzt.** Höchstens drei wirklich helle Stellen
>   je Szene. Sie sind der Grund, warum das Bild leuchtet.
>
> ### Die fünf Motive
>
> Sektor, Szene, Hauptobjekt — die Bildidee bleibt, die Ausführung ändert sich:
>
> | Sektor | Funktion | Hauptobjekt |
> |---|---|---|
> | Software & IT | `Racks` | Ein einzelner Serverschrank in Dreiviertelansicht, angeschnitten. Offene Front, Einschübe in perspektivischer Staffelung, wenige helle Dioden. Der Gang dahinter verliert sich im Dunkeln. |
> | Healthcare | `Helix` | Eine Doppelhelix in Aufsicht mit Tiefe: die vordere Strebe deckt die hintere ab, die Sprossen verkürzen sich zur Mitte. Vorn dick und hell, hinten dünn und dunkel. |
> | Industrials | `Robot` | Ein Roboterarm als Maschine: Gehäuse mit Fase, sichtbare Gelenkringe, Kabelführung, ein Greifer mit zwei Backen. Halle dahinter nur als Silhouette. |
> | Consumer | `Bottle` | Eine Flasche mit Glanzkante, Schulter und eingezogener Taille, Etikett mit Prägung. Blätter dahinter gefächert, mit Mittelrippe und überlappend — nicht als Strahlenkranz. |
> | Business Services | `Network` | Ein Netz mit Zentrum: ein großer Knoten vorn, kleinere nach hinten kleiner und dunkler werdend, Verbindungen als leicht gebogene Bögen statt gerader Linien. |
>
> ### Technische Bedingungen — jede einzelne ist bindend
>
> - **Signatur:** `function Racks({ rnd, id, k = "", glow = false })`, jede gibt
>   ein `<g>` zurück. `SCENES` bleibt wie es ist. `k` ist der Namensraum für
>   eigene Verlaufs-IDs, `glow` schaltet den Leuchtdurchgang.
> - **Zwei Durchgänge:** `HeroArt` ruft jede Szene zweimal auf, mit derselben
>   Zufallsfolge. Bei `glow` zeichnest du **nur, was Licht abgibt** — Dioden,
>   Kanten im Licht, Funken —, kräftig und ohne Beiwerk; dieser Durchgang läuft
>   unscharf unter der Zeichnung und gibt ihr den Hof. Beide Durchgänge müssen
>   dieselbe Geometrie ergeben, also `rnd()` in beiden Zweigen gleich oft und in
>   gleicher Reihenfolge aufrufen (am einfachsten: erst alles berechnen, dann
>   auf `glow` verzweigen).
> - **Koordinaten:** lokal `0..220` in x und `0..200` in y. `HeroArt` versetzt
>   die Szene um `translate(80 0)` in eine `300 x 200`-Fläche mit
>   `preserveAspectRatio="xMaxYMax slice"`. Sichtbar ist auf einem Telefon
>   ungefähr `y = 26..200`; unter `y = 20` zeichnen ist verlorene Arbeit. Der
>   Boden der Szene gehört auf `y ≈ 185`.
> - **Nur die vier Farbmarken** aus `id`: `id.shade` (fast schwarz),
>   `id.deep`, `id.own`, `id.lit`. Keine festen Hex-Werte, kein `#fff`, kein
>   `black`. Grund: Der Farbton ist je Unternehmen ein anderer, und die Karte
>   steht in beiden Themes.
> - **Prüfe beide Themes.** Der Kartengrund ist im hellen Theme `#FFFFFF`. Eine
>   Szene, die nur auf Dunkel funktioniert, ist nicht fertig.
> - **Eigene Verlaufs- und Filter-IDs** müssen `id.uid` enthalten
>   (`` `${id.uid}rack` ``). Auf einem Bildschirm stehen bis zu zehn Karten;
>   doppelte IDs greifen quer über Karten hinweg.
> - **`rnd()` ist die einzige Zufallsquelle** und muss in fester Reihenfolge
>   aufgerufen werden. Kein `Math.random`, kein `Date`. Dieselbe Firma muss
>   über die ganze Partie dasselbe Bild behalten.
> - **Variation je Unternehmen:** Zwei Karten desselben Sektors dürfen nicht
>   dasselbe Bild zeigen. Variiere aus `rnd()` Stellung, Anzahl, Staffelung und
>   Blickwinkel — aber nie so weit, dass der Sektor als Gruppe zerfällt.
> - **Aufwand begrenzen:** Jede Szene wird zweimal gerendert (scharf und
>   unscharf), bei zehn Karten also zwanzigmal. Höchstens etwa 120 Knoten je
>   Szene, keine Filter innerhalb der Szene, keine Schleife über hundert
>   Elemente.
> - **Der linke Bildbereich bleibt ruhig.** Über den ersten rund 40 % liegen
>   Name und Anspruch. Kein Hauptmotiv links von `x = 60` (lokal).
> - **Nichts dem Zufall überlassen, was die Bildaufteilung trägt.** Das
>   Hauptobjekt gehört an eine feste Stelle; gestreut wird das Beiwerk. Nimmt
>   man etwa den zufällig vordersten Knoten als Zentrum, landet er bei manchen
>   Startwerten in der unteren rechten Ecke — dort steht der Anspruch des
>   Sektors, und angeschnitten ist er obendrein.
>
> ### Was du nicht anfassen darfst
>
> Kennzahlen, Sichtbarkeitsregeln (was ohne Datenraum verdeckt bleibt),
> Kartenaufbau, `lib/engine`, Tests. Das hier ist reine Darstellung.
>
> ### Vorgehen
>
> Zeichnen ohne Hinsehen führt zurück zu Schaubildern. Arbeite deshalb am Bild:
>
> 1. Starte den Entwicklungsserver und lege dir eine Seite an, die eine Karte je
>    Sektor rendert (`newDeal` mit fester Zufallsinstanz über `createRng`).
>    Achtung: Erzeuge die Deals im Client, sonst gibt es einen
>    Hydration-Fehler. Räume die Seite am Ende wieder weg.
> 2. Nimm mit Playwright den Kopfbereich jeder Karte auf
>    (`/opt/pw-browsers/chromium` ist installiert) und **sieh dir jedes Bild
>    an**, bevor du weitermachst.
> 3. Eine Szene nach der anderen: zeichnen, ansehen, nachbessern. Erst wenn eine
>    überzeugt, die nächste.
> 4. Zum Schluss alle fünf in beiden Themes und auf 320, 360 und 412 px prüfen,
>    dazu zwei Karten desselben Sektors nebeneinander — sehen sie verwandt aus,
>    ohne gleich zu sein?
>
> ### Wann es fertig ist
>
> - Jede Szene hat ein erkennbares Hauptobjekt, gerichtetes Licht und drei
>   unterscheidbare Tiefenebenen.
> - Die Silhouette ist lesbar, wenn man die Augen zusammenkneift.
> - Name und Anspruch links bleiben in beiden Themes gut lesbar.
> - Zwei Unternehmen desselben Sektors sind auf einen Blick auseinanderzuhalten.
> - `npm run build`, `npm test` und `npx eslint .` laufen ohne neue Befunde.
> - Du hast die Bilder selbst gesehen und würdest sie zeigen.

---

## Falls es doch gerenderte Bilder sein sollen

Der Prompt oben bleibt bei gezeichnetem SVG, und zwar aus einem Grund, der die
Sache entscheidet: Die Zielunternehmen entstehen erst zur Laufzeit aus einem
Archetypenkatalog. Ein Bildmodell liefert fünf Bilder — eines je Sektor —, kein
Bild je Unternehmen. Die Identität der einzelnen Firma, die gerade das Ziel des
Umbaus war, ginge damit verloren; alle Dentallabore sähen wieder gleich aus.

Wenn das in Kauf genommen wird, ist der Weg: fünf Bilder in einem Bildmodell
erzeugen (Claude erzeugt selbst keine Rasterbilder), unter `public/sektoren/`
ablegen und in `HeroArt` statt der Szene ein `<image>` einsetzen. Als Vorlage
für das Bildmodell, hier am Beispiel Healthcare:

> Dark editorial hero illustration for a private equity trading card, healthcare
> sector. A single luminous DNA double helix rising from the lower right,
> cropped by the right edge of the frame. Deep near-black emerald background,
> one light source from the upper right, strong rim light on the front strand,
> the rear strand falling into darkness. Volumetric glow, subtle depth of field.
> No text, no logos, no people. The left 45 percent of the frame is near-empty
> dark space for typography. Aspect ratio 3:2.

Die übrigen vier analog: Serverschrank in Elektrikblau, Roboterarm in Gold vor
einer Werkhalle, Flasche mit Botanik in Violett, Standortnetz in Rosé. Immer
mit denselben drei Vorgaben am Ende — freie dunkle Fläche links, kein Text,
Seitenverhältnis 3:2.
