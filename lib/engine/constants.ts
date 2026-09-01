// Typisierte Sicht auf die Spielkonstanten des Ausgangszustands. Die Werte
// selbst stehen ausschließlich in lib/engine/engine.ts — diese Datei leitet
// sie nur ab und gibt ihnen Typen. Bis zum 01.09.2026 standen CAPITAL,
// SECTORS, ARCHES und DEFAULT_HUMAN_ATTRS hier ein zweites Mal ausgeschrieben; sie waren zwar
// deckungsgleich, aber nichts hielt sie deckungsgleich. Eine Zahl, ein Ort.
//
// Bleibt eine echte Doppelung: Die SQL-Funktionen archetype_attrs()/
// archetype_display_name()/default_human_attrs() in
// supabase/migrations/20260817090200_matchmaking_helpers.sql bilden dieselben
// Werte in Postgres ab, weil der Ausgangszustand einer Mehrspielerpartie aus
// Atomaritätsgründen direkt in der Datenbank erzeugt wird (siehe
// start_season()). Ändert sich einer der Werte in engine.ts, muss die
// SQL-Migration mitgezogen werden (als neue Migration, nicht rückwirkend).

import {
  ARCHES as ENGINE_ARCHES,
  CAPITAL as ENGINE_CAPITAL,
  DEFAULT_HUMAN_ATTRS as ENGINE_HUMAN_ATTRS,
  SECTORS as ENGINE_SECTORS,
} from "./engine";

export const CAPITAL: number = ENGINE_CAPITAL;

export const SECTORS = ENGINE_SECTORS as Record<
  "Industrials" | "Healthcare" | "Software" | "Services" | "Consumer",
  { g: number; m: number }
>;

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

export const ARCHES: Archetype[] = ENGINE_ARCHES as unknown as Archetype[];

export const ARCHETYPE_KEYS = ARCHES.map((a) => a.key);

export const DEFAULT_HUMAN_ATTRS: Attrs = ENGINE_HUMAN_ATTRS;

export function archetypeByKey(key: ArchetypeKey): Archetype {
  const found = ARCHES.find((a) => a.key === key);
  if (!found) throw new Error(`Unbekannter Archetyp: ${key}`);
  return found;
}
