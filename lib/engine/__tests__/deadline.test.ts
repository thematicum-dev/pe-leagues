import { describe, expect, it } from "vitest";
import { firstHalfYearDeadline, nextHalfYearDeadline } from "../deadline";

/* Hilfsfunktion für lesbare Erwartungswerte: baut einen UTC-Zeitpunkt aus
   Jahr/Monat/Tag/Stunde in der jeweils gültigen Offset-Angabe (Europe/Berlin
   ist UTC+1 im Winter, UTC+2 im Sommer). */
function berlin(y: number, m: number, d: number, hh: number, mm: number, offsetHours: number): Date {
  return new Date(Date.UTC(y, m - 1, d, hh - offsetHours, mm, 0));
}

describe("firstHalfYearDeadline", () => {
  it("liefert die Mitternacht des übernächsten Tages (Beispiel aus der Spezifikation)", () => {
    // Partiestart am 3. um 23 Uhr (Winterzeit, UTC+1) -> Frist am 5. um 00:00.
    const start = berlin(2026, 1, 3, 23, 0, 1);
    const deadline = firstHalfYearDeadline(start);
    expect(deadline.getTime()).toEqual(berlin(2026, 1, 5, 0, 0, 1).getTime());
  });

  it("hängt nur vom Kalendertag des Starts ab, nicht von der Uhrzeit", () => {
    const early = firstHalfYearDeadline(berlin(2026, 6, 10, 0, 5, 2));
    const late = firstHalfYearDeadline(berlin(2026, 6, 10, 23, 55, 2));
    expect(early.getTime()).toEqual(late.getTime());
    expect(early.getTime()).toEqual(berlin(2026, 6, 12, 0, 0, 2).getTime());
  });

  it("garantiert zwischen 24 und 48 Stunden Frist, unabhängig von der Startuhrzeit", () => {
    for (let hour = 0; hour < 24; hour++) {
      const start = berlin(2026, 5, 1, hour, 0, 2);
      const deadline = firstHalfYearDeadline(start);
      const hoursUntil = (deadline.getTime() - start.getTime()) / 3_600_000;
      expect(hoursUntil).toBeGreaterThan(24);
      expect(hoursUntil).toBeLessThanOrEqual(48);
    }
  });
});

describe("nextHalfYearDeadline", () => {
  it("liefert die nächste Mitternacht, wenn mehr als sechs Stunden bleiben", () => {
    const evaluatedAt = berlin(2026, 6, 10, 10, 0, 2); // 14h bis Mitternacht
    const deadline = nextHalfYearDeadline(evaluatedAt);
    expect(deadline.getTime()).toEqual(berlin(2026, 6, 11, 0, 0, 2).getTime());
  });

  it("überspringt die nächste Mitternacht, wenn weniger als sechs Stunden bleiben (Beispiel aus der Spezifikation)", () => {
    // Auswertung um 21 Uhr -> nächste Mitternacht liegt nur drei Stunden
    // entfernt -> Frist ist die übernächste Mitternacht, nicht drei Stunden
    // später.
    const evaluatedAt = berlin(2026, 6, 10, 21, 0, 2);
    const deadline = nextHalfYearDeadline(evaluatedAt);
    expect(deadline.getTime()).toEqual(berlin(2026, 6, 12, 0, 0, 2).getTime());
  });

  it("behandelt genau sechs Stunden als 'nicht weniger als' (Grenzfall)", () => {
    const evaluatedAt = berlin(2026, 6, 10, 18, 0, 2); // exakt 6h bis Mitternacht
    const deadline = nextHalfYearDeadline(evaluatedAt);
    expect(deadline.getTime()).toEqual(berlin(2026, 6, 11, 0, 0, 2).getTime());
  });

  it("liefert bei Auswertung exakt um Mitternacht die nächste Mitternacht (24h), nicht dieselbe", () => {
    const evaluatedAt = berlin(2026, 6, 10, 0, 0, 2);
    const deadline = nextHalfYearDeadline(evaluatedAt);
    expect(deadline.getTime()).toEqual(berlin(2026, 6, 11, 0, 0, 2).getTime());
  });
});

/* Die beiden Umstellungstermine der Sommerzeit 2026 in Deutschland
   (programmatisch verifiziert: 2026-03-29 01:00 UTC springt CET->CEST vor,
   2026-10-25 01:00 UTC springt CEST->CET zurück). Die Fristberechnung darf
   an keinem der beiden Tage eine Frist verschieben oder verdoppeln — jede
   Mitternacht existiert in Europe/Berlin an jedem Kalendertag genau einmal,
   unabhängig von der Umstellung, die um 2/3 Uhr stattfindet. */
describe("Sommerzeitumstellung", () => {
  it("Frühjahr 2026 (29.03., Uhren springen von 2 auf 3 Uhr vor): Mitternacht bleibt eindeutig, kein Sprung in der Frist", () => {
    // Auswertung am 28.03. um 14 Uhr (noch Winterzeit, UTC+1) -> mehr als 6h
    // bis Mitternacht -> Frist ist die Mitternacht 28./29.03., die selbst
    // noch vor der Umstellung liegt (die Umstellung ist erst um 2 Uhr).
    const evaluatedBefore = berlin(2026, 3, 28, 14, 0, 1);
    const deadlineBefore = nextHalfYearDeadline(evaluatedBefore);
    expect(deadlineBefore.getTime()).toEqual(berlin(2026, 3, 29, 0, 0, 1).getTime());

    // Auswertung am 29.03. um 14 Uhr (bereits Sommerzeit, UTC+2) -> Frist ist
    // die Mitternacht 29./30.03., ebenfalls UTC+2 — die Fristberechnung muss
    // den neuen Versatz verwenden, nicht mehr den alten.
    const evaluatedAfter = berlin(2026, 3, 29, 14, 0, 2);
    const deadlineAfter = nextHalfYearDeadline(evaluatedAfter);
    expect(deadlineAfter.getTime()).toEqual(berlin(2026, 3, 30, 0, 0, 2).getTime());

    // Der Umstellungstag selbst hat in Lokalzeit nur 23 Stunden. Zwischen den
    // beiden Mitternächten 29.03. 00:00 und 30.03. 00:00 liegen deshalb nur
    // 23 UTC-Stunden, nicht 24 — genau das darf firstHalfYearDeadline nicht
    // ignorieren (kein pauschales "+24h in UTC").
    const midnight29 = berlin(2026, 3, 29, 0, 0, 1);
    const midnight30 = berlin(2026, 3, 30, 0, 0, 2);
    expect((midnight30.getTime() - midnight29.getTime()) / 3_600_000).toEqual(23);

    // Ein Partiestart unmittelbar vor der Umstellung darf keine doppelte
    // oder ausgefallene Frist erzeugen: 28.03. um 23 Uhr -> Frist 30.03. 00:00.
    const start = berlin(2026, 3, 28, 23, 0, 1);
    const deadline = firstHalfYearDeadline(start);
    expect(deadline.getTime()).toEqual(berlin(2026, 3, 30, 0, 0, 2).getTime());
    // Die "24 bis 48 Stunden"-Garantie gilt für Kalendertage zu 24 Stunden.
    // Der 29.03. hat lokal nur 23 Stunden (Uhren springen um 2 Uhr vor) —
    // die Untergrenze verschiebt sich für einen Start knapp vor der
    // Umstellung deshalb korrekt auf 23 Stunden, nicht weniger.
    const hoursUntil = (deadline.getTime() - start.getTime()) / 3_600_000;
    expect(hoursUntil).toBeGreaterThanOrEqual(23);
    expect(hoursUntil).toBeLessThanOrEqual(48);
  });

  it("Herbst 2026 (25.10., Uhren springen von 3 auf 2 Uhr zurück): Mitternacht bleibt eindeutig, keine doppelte Frist", () => {
    // Auswertung am 24.10. um 14 Uhr (noch Sommerzeit, UTC+2).
    const evaluatedBefore = berlin(2026, 10, 24, 14, 0, 2);
    const deadlineBefore = nextHalfYearDeadline(evaluatedBefore);
    expect(deadlineBefore.getTime()).toEqual(berlin(2026, 10, 25, 0, 0, 2).getTime());

    // Auswertung am 25.10. um 14 Uhr (bereits Winterzeit, UTC+1, da die
    // Umstellung um 3 Uhr morgens stattfand).
    const evaluatedAfter = berlin(2026, 10, 25, 14, 0, 1);
    const deadlineAfter = nextHalfYearDeadline(evaluatedAfter);
    expect(deadlineAfter.getTime()).toEqual(berlin(2026, 10, 26, 0, 0, 1).getTime());

    // Der Umstellungstag hat in Lokalzeit 25 Stunden -- zwischen den beiden
    // Mitternächten 25.10. 00:00 und 26.10. 00:00 liegen deshalb 25
    // UTC-Stunden, nicht 24.
    const midnight25 = berlin(2026, 10, 25, 0, 0, 2);
    const midnight26 = berlin(2026, 10, 26, 0, 0, 1);
    expect((midnight26.getTime() - midnight25.getTime()) / 3_600_000).toEqual(25);

    // Ein Partiestart unmittelbar vor der Umstellung darf ebenfalls keine
    // verschobene oder doppelte Frist erzeugen: 24.10. um 23 Uhr -> Frist
    // 26.10. 00:00.
    const start = berlin(2026, 10, 24, 23, 0, 2);
    const deadline = firstHalfYearDeadline(start);
    expect(deadline.getTime()).toEqual(berlin(2026, 10, 26, 0, 0, 1).getTime());
    const hoursUntil = (deadline.getTime() - start.getTime()) / 3_600_000;
    expect(hoursUntil).toBeGreaterThan(24);
    expect(hoursUntil).toBeLessThanOrEqual(48);
  });

  it("weniger als sechs Stunden vor Mitternacht am Umstellungstag springt korrekt auf die übernächste Mitternacht", () => {
    // 29.03., 22 Uhr Sommerzeit -> nur 2h bis Mitternacht -> Frist ist die
    // übernächste Mitternacht (30./31.03.), nicht 29./30.03.
    const evaluatedAt = berlin(2026, 3, 29, 22, 0, 2);
    const deadline = nextHalfYearDeadline(evaluatedAt);
    expect(deadline.getTime()).toEqual(berlin(2026, 3, 31, 0, 0, 2).getTime());
  });
});
