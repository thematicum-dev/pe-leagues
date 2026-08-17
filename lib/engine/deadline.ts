/* Berechnung der Abgabefrist eines Halbjahres, Zeitzone Europe/Berlin.
   Pure Funktionen ohne Datenbankzugriff — die Auswertungsroutine berechnet
   die Frist einmal pro Auswertung und schreibt sie nach
   seasons.current_half_year_deadline (timestamptz); sie wird nicht bei
   jeder Anzeige neu berechnet.

   Der pg_cron-Zeitplaner selbst arbeitet in UTC. "Mitternacht" ist hier
   deshalb ausdrücklich Mitternacht Ortszeit Europe/Berlin, umgerechnet in
   einen eindeutigen UTC-Zeitpunkt — nicht "UTC-Mitternacht plus fester
   Versatz". Deutschland stellt die Uhr immer um 2 bzw. 3 Uhr morgens um,
   nie um Mitternacht: Mitternacht existiert deshalb an jedem Kalendertag
   genau einmal (nie doppelt, nie gar nicht). Was sich an einer
   Umstellung ändert, ist einzig der Abstand zweier aufeinanderfolgender
   Mitternächte in UTC-Stunden (23 statt 24 beim Vorspringen im März, 25
   statt 24 beim Zurückspringen im Oktober) — deshalb wird hier niemals
   "24 UTC-Stunden addiert", sondern jede Mitternacht einzeln aus dem
   Kalendertag in Europe/Berlin zurückgerechnet.                          */

const TZ = "Europe/Berlin";
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

interface BerlinParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function berlinParts(instant: Date): BerlinParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  let hour = get("hour");
  // Manche ICU-Implementierungen geben Mitternacht als Stunde "24" statt "00" aus.
  if (hour === 24) hour = 0;
  return { year: get("year"), month: get("month"), day: get("day"), hour, minute: get("minute"), second: get("second") };
}

function addDays(year: number, month: number, day: number, days: number): { year: number; month: number; day: number } {
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

/* Wandelt Mitternacht (00:00:00) eines Kalendertags in Europe/Berlin in den
   eindeutigen UTC-Zeitpunkt um. Iterativ, damit der (in Deutschland stets
   ganzstündige) UTC-Versatz korrekt berücksichtigt wird, unabhängig davon,
   auf welcher Seite einer Umstellung der Tag liegt. */
function zonedMidnightToUtc(year: number, month: number, day: number): Date {
  const target = Date.UTC(year, month - 1, day, 0, 0, 0);
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const p = berlinParts(new Date(guess));
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const diff = target - actual;
    if (diff === 0) break;
    guess += diff;
  }
  return new Date(guess);
}

/* Die nächste Mitternacht (Europe/Berlin) streng nach dem übergebenen
   Zeitpunkt. */
function nextMidnightAfter(instant: Date): Date {
  const p = berlinParts(instant);
  const next = addDays(p.year, p.month, p.day, 1);
  let candidate = zonedMidnightToUtc(next.year, next.month, next.day);
  if (candidate.getTime() <= instant.getTime()) {
    // Verteidigungslinie gegen Rundungsfälle: einen weiteren Tag später.
    const next2 = addDays(next.year, next.month, next.day, 1);
    candidate = zonedMidnightToUtc(next2.year, next2.month, next2.day);
  }
  return candidate;
}

/* Frist des ersten Halbjahres: Mitternacht des Tages nach dem Partiestart.
   "Startet die Partie am 3. um 23 Uhr, ist die Frist der 5. um 00:00 Uhr":
   die Uhrzeit des Starts selbst spielt keine Rolle, nur sein Kalendertag in
   Europe/Berlin — die Frist ist immer der übernächste Tag, 00:00 Uhr. Das
   garantiert jedem Spieler mindestens 24 und höchstens 48 Stunden, egal zu
   welcher Uhrzeit die Partie tatsächlich startet. */
export function firstHalfYearDeadline(seasonStartedAt: Date): Date {
  const start = berlinParts(seasonStartedAt);
  const target = addDays(start.year, start.month, start.day, 2);
  return zonedMidnightToUtc(target.year, target.month, target.day);
}

/* Frist eines Folge-Halbjahres: die nächste Mitternacht nach der
   vorangegangenen Auswertung — außer es bleiben weniger als sechs Stunden
   bis dahin, dann die übernächste. */
export function nextHalfYearDeadline(evaluatedAt: Date): Date {
  let candidate = nextMidnightAfter(evaluatedAt);
  if (candidate.getTime() - evaluatedAt.getTime() < SIX_HOURS_MS) {
    candidate = nextMidnightAfter(candidate);
  }
  return candidate;
}
