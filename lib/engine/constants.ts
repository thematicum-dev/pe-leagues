// Spielkonstanten für den Ausgangszustand einer Partie. Bewusst dieselben
// Werte wie in components/PeLeagues.tsx (Übungsmodus), damit Einzelspieler-
// und Mehrspielerpartien mit derselben Grundlage starten. Die
// SQL-Funktionen archetype_attrs()/archetype_display_name()/
// default_human_attrs() in supabase/migrations/20260817090200_matchmaking_helpers.sql
// bilden exakt dieselben Werte ab, weil der Ausgangszustand einer
// Mehrspielerpartie aus Atomaritätsgründen direkt in der Datenbank erzeugt
// wird (siehe start_season()). Ändert sich einer der Werte hier, muss die
// SQL-Migration mitgezogen werden (als neue Migration, nicht rückwirkend).

export const CAPITAL = 500;

export const SECTORS = {
  Industrials: { g: 3.0, m: 8.5 },
  Healthcare: { g: 5.0, m: 11.0 },
  Software: { g: 8.0, m: 13.0 },
  Services: { g: 3.5, m: 9.0 },
  Consumer: { g: 2.0, m: 8.0 },
} as const;

export type SectorName = keyof typeof SECTORS;
export const SECTOR_NAMES = Object.keys(SECTORS) as SectorName[];

export type ArchetypeKey = "sourcing" | "ops" | "fin" | "all";

export interface Archetype {
  key: ArchetypeKey;
  name: string;
  attrs: Attrs;
  aggr: number;
  lev: number;
  style: string;
}

export interface Attrs {
  sourcing: number;
  analysis: number;
  negotiation: number;
  operations: number;
  financing: number;
}

export const ARCHES: Archetype[] = [
  {
    key: "sourcing",
    name: "Nordkap Capital",
    attrs: { sourcing: 5, analysis: 2, negotiation: 2, operations: 2, financing: 1 },
    aggr: 0.06,
    lev: 0.75,
    style: "Origination-getrieben",
  },
  {
    key: "ops",
    name: "Hansabruck Partners",
    attrs: { sourcing: 2, analysis: 3, negotiation: 1, operations: 5, financing: 1 },
    aggr: 0.02,
    lev: 0.6,
    style: "Operativer Wertschöpfer",
  },
  {
    key: "fin",
    name: "Aurum Partners",
    attrs: { sourcing: 1, analysis: 2, negotiation: 3, operations: 1, financing: 5 },
    aggr: 0.1,
    lev: 0.95,
    style: "Leverage-getrieben",
  },
  {
    key: "all",
    name: "Vierturm Beteiligungen",
    attrs: { sourcing: 3, analysis: 3, negotiation: 2, operations: 2, financing: 2 },
    aggr: 0.04,
    lev: 0.7,
    style: "Generalist",
  },
];

export const ARCHETYPE_KEYS = ARCHES.map((a) => a.key);

export const DEFAULT_HUMAN_ATTRS: Attrs = {
  sourcing: 2,
  analysis: 3,
  negotiation: 2,
  operations: 3,
  financing: 2,
};

export function archetypeByKey(key: ArchetypeKey): Archetype {
  const found = ARCHES.find((a) => a.key === key);
  if (!found) throw new Error(`Unbekannter Archetyp: ${key}`);
  return found;
}
