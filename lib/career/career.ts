/* Track Record eines Spielers: Kennzahlen, Karrierestufe und Auszeichnungen,
   gerechnet aus seinen beendeten Partien (my_career() in
   supabase/migrations/20261110090400_career.sql).

   Reine Funktionen ohne Datenbank und ohne React — die Profilseite, das
   Dashboard und die Tests benutzen dieselbe Rechnung.

   Warum es das gibt: Eine Partie dauert zwanzig Halbjahre, und danach war
   bisher Schluss. Die Rangliste zeigt einen Durchschnitt, aber nichts, was
   sich über mehrere Partien aufbaut. Karrierepunkte wachsen mit jeder
   beendeten Partie (wer spielt, kommt voran) und stärker mit jeder guten
   (wer gut spielt, kommt schneller voran). Die Stufen tragen die Titel, die
   die Branche selbst benutzt. */

export interface CareerRow {
  season_id: string;
  universe_name: string;
  finished_at: string;
  place: number;
  funds: number;
  humans: number;
  score: number;
  tvcc: number | null;
  irr: number;
  tvpi: number;
  fund_name: string;
}

/* Punkte einer Partie: die Wertung in Hundertsteln (1,00 = Benchmark = 100
   Punkte, nie negativ) plus ein Zuschlag für die Platzierung. */
export const PLACE_BONUS: Record<number, number> = { 1: 50, 2: 25, 3: 10 };
export function pointsOf(row: Pick<CareerRow, "score" | "place">): number {
  const base = Math.max(0, Math.round(Number(row.score) * 100));
  return base + (PLACE_BONUS[row.place] ?? 0);
}

export interface CareerSummary {
  played: number;
  wins: number;
  podiums: number;
  points: number;
  bestScore: number | null;
  avgScore: number | null;
  bestTvcc: number | null;
  bestIrr: number | null;
  /* Anteil der Partien auf oder über Benchmark (Wertung >= 1,00) */
  benchmarkRate: number | null;
}

export function summarize(rows: CareerRow[]): CareerSummary {
  const n = rows.length;
  const scores = rows.map((r) => Number(r.score));
  const tvccs = rows.map((r) => (r.tvcc == null ? null : Number(r.tvcc))).filter((v): v is number => v != null);
  return {
    played: n,
    wins: rows.filter((r) => r.place === 1).length,
    podiums: rows.filter((r) => r.place <= 3).length,
    points: rows.reduce((s, r) => s + pointsOf(r), 0),
    bestScore: n ? Math.max(...scores) : null,
    avgScore: n ? scores.reduce((s, v) => s + v, 0) / n : null,
    bestTvcc: tvccs.length ? Math.max(...tvccs) : null,
    bestIrr: n ? Math.max(...rows.map((r) => Number(r.irr))) : null,
    benchmarkRate: n ? scores.filter((v) => v >= 1).length / n : null,
  };
}

/* ---------- Karrierestufen ---------- */

export interface Tier { key: string; name: string; from: number }
export const TIERS: Tier[] = [
  { key: "analyst", name: "Analyst", from: 0 },
  { key: "associate", name: "Associate", from: 150 },
  { key: "vp", name: "Vice President", from: 400 },
  { key: "principal", name: "Principal", from: 800 },
  { key: "partner", name: "Partner", from: 1500 },
  { key: "mp", name: "Managing Partner", from: 3000 },
];

export interface TierState {
  tier: Tier;
  next: Tier | null;
  /* Fortschritt zur nächsten Stufe, 0..1 (1 auf der höchsten) */
  progress: number;
  toNext: number;
}

export function tierOf(points: number): TierState {
  const p = Math.max(0, points || 0);
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (p >= TIERS[k].from) i = k;
  const tier = TIERS[i];
  const next = TIERS[i + 1] ?? null;
  if (!next) return { tier, next: null, progress: 1, toNext: 0 };
  return { tier, next, progress: (p - tier.from) / (next.from - tier.from), toNext: next.from - p };
}

/* ---------- Auszeichnungen ---------- */

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /* erreicht / Ziel; `done` folgt daraus */
  progress: (rows: CareerRow[], s: CareerSummary) => [number, number];
}

/* Längste Serie aufeinanderfolgender Partien (zeitlich), die `ok` erfüllen */
export function longestRun(rows: CareerRow[], ok: (r: CareerRow) => boolean): number {
  const sorted = [...rows].sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  let best = 0, cur = 0;
  for (const r of sorted) { cur = ok(r) ? cur + 1 : 0; if (cur > best) best = cur; }
  return best;
}

const any = (rows: CareerRow[], ok: (r: CareerRow) => boolean): [number, number] => [rows.some(ok) ? 1 : 0, 1];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_close", name: "First Close", icon: "🤝", desc: "Die erste Partie über alle 20 Halbjahre zu Ende gespielt.",
    progress: (_r, s) => [Math.min(s.played, 1), 1] },
  { id: "benchmark", name: "Benchmark geschlagen", icon: "📈", desc: "Eine Partie mit Wertung 1,00 oder besser beendet.",
    progress: (r) => any(r, (x) => Number(x.score) >= 1) },
  { id: "top_quartile", name: "Top Quartile", icon: "🥇", desc: "Eine Partie als bester der fünf Fonds beendet.",
    progress: (r) => any(r, (x) => x.place === 1) },
  { id: "outperformer", name: "Outperformer", icon: "🚀", desc: "Wertung 1,50 oder besser — weit über Benchmark.",
    progress: (r) => any(r, (x) => Number(x.score) >= 1.5) },
  { id: "two_x", name: "2× Net", icon: "💰", desc: "Das Commitment netto verdoppelt: TVCC 2,0× oder mehr.",
    progress: (r) => any(r, (x) => x.tvcc != null && Number(x.tvcc) >= 2) },
  { id: "irr25", name: "IRR-Jäger", icon: "⚡", desc: "Netto-IRR von 25 % oder mehr.",
    progress: (r) => any(r, (x) => Number(x.irr) >= 0.25) },
  { id: "alpha", name: "Platzhirsch", icon: "🦌", desc: "Sieg in einer Partie mit mindestens drei menschlichen Spielern.",
    progress: (r) => any(r, (x) => x.place === 1 && x.humans >= 3) },
  { id: "consistent", name: "Konstanz", icon: "🎯", desc: "Drei Partien in Folge auf oder über Benchmark.",
    progress: (r) => [Math.min(3, longestRun(r, (x) => Number(x.score) >= 1)), 3] },
  { id: "hattrick", name: "Hattrick", icon: "🏆", desc: "Drei Partien gewonnen.",
    progress: (_r, s) => [Math.min(3, s.wins), 3] },
  { id: "fund_v", name: "Fund V", icon: "🏛️", desc: "Fünf Partien beendet — der fünfte Fonds ist aufgelegt.",
    progress: (_r, s) => [Math.min(5, s.played), 5] },
  { id: "fund_x", name: "Fund X", icon: "👑", desc: "Zehn Partien beendet. Eine Franchise.",
    progress: (_r, s) => [Math.min(10, s.played), 10] },
];

export interface AchievementState { id: string; name: string; desc: string; icon: string; have: number; need: number; done: boolean }

export function achievementsOf(rows: CareerRow[]): AchievementState[] {
  const s = summarize(rows);
  return ACHIEVEMENTS.map((a) => {
    const [have, need] = a.progress(rows, s);
    return { id: a.id, name: a.name, desc: a.desc, icon: a.icon, have, need, done: have >= need };
  });
}
