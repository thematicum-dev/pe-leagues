/* Serverzeit für die Fristenanzeige.

   Wozu: Die Abgabefrist eines Halbjahres wird serverseitig durchgesetzt --
   die RLS-Policy auf turn_submissions vergleicht now() gegen
   seasons.current_half_year_deadline. Ein Countdown, der gegen die Uhr des
   Browsers rechnet, zeigt deshalb bei jeder Abweichung dieser Uhr etwas
   anderes an, als tatsächlich gilt: Geht sie zehn Minuten nach, verspricht
   die Anzeige zehn Minuten, die es nicht gibt.

   Maßgeblich ist streng genommen die Uhr der Datenbank, nicht diese hier.
   Beide sind zeitsynchronisierte verwaltete Dienste und liegen im
   Millisekundenbereich auseinander, während die Uhr eines Endgeräts um
   Minuten oder Stunden danebenliegen kann -- der verbleibende Unterschied
   ist gegenüber dem behobenen Fehler vernachlässigbar. Eine Abfrage der
   Datenbankzeit bräuchte eine eigene Funktion samt Rechten, nur um eine Uhr
   zu lesen.

   force-dynamic und no-store, weil eine zwischengespeicherte Uhrzeit genau
   das Gegenteil dessen wäre, wofür es diese Route gibt. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return Response.json({ now: Date.now() }, {
    headers: { "cache-control": "no-store, max-age=0" },
  });
}
