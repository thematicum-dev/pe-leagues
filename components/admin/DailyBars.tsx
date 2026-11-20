/* Tagesbalken wie in der Admin-Übersicht ("Letzte 14 Tage"), für beliebige
   Zeitreihen. Mehrere Reihen teilen sich die Skala nicht: Jede Reihe ist ein
   eigenes kleines Diagramm, damit eine seltene Größe neben einer häufigen
   nicht zu einer flachen Linie wird. */

const dayLabel = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

export interface DailyPoint { day: string; value: number }

export default function DailyBars({ data, label, unit }: { data: DailyPoint[]; label: string; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="dashsub">
        {label} · <span className="mono">Σ {total}{unit ? ` ${unit}` : ""} · max {max} am Tag</span>
      </div>
      <div className="spark" role="img" aria-label={`${label}, letzte ${data.length} Tage, insgesamt ${total}`}>
        {data.map((d) => (
          <i key={d.day} className={d.value === 0 ? "zero" : ""} style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
            title={`${dayLabel(d.day)}: ${d.value}`} />
        ))}
      </div>
      <div className="sparkaxis">
        <span>{data.length ? dayLabel(data[0].day) : ""}</span>
        <span>{data.length ? dayLabel(data[data.length - 1].day) : ""}</span>
      </div>
    </div>
  );
}

/* Kalendertag in Europe/Berlin als YYYY-MM-DD — dieselbe Zeitzone, in der
   Fristen und Partien gelten (lib/engine/deadline.ts). */
const berlinDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });
export const dayKey = (t: string | number | Date) => berlinDay.format(new Date(t));

/** Zählt Zeitpunkte je Tag über die letzten `days` Tage bis `now` (einschließlich). */
export function countPerDay(times: (string | null | undefined)[], days: number, now: number): DailyPoint[] {
  const counts = new Map<string, number>();
  for (const t of times) if (t) counts.set(dayKey(t), (counts.get(dayKey(t)) ?? 0) + 1);
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayKey(now - i * 86400000);
    out.push({ day, value: counts.get(day) ?? 0 });
  }
  return out;
}
