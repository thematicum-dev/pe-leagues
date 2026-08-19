/* Wandelt Zeilen aus public.target_templates (siehe supabase/migrations/
   20260819110300_target_templates.sql) in die Form um, die newDeal()/
   newLandmark() aus lib/engine/engine.ts erwarten (dieselbe Struktur wie ein
   Eintrag im fest codierten BOOK-Katalog). Reiner, synchroner Code ohne
   Datenbankzugriff -- das eigentliche Laden übernimmt der jeweilige
   Aufrufer (Edge Function mit dem service_role-Key), damit dieses Modul in
   jeder Laufzeit (Deno wie Node) benutzbar bleibt. */
import type { Book, BookEntry } from "./engine.ts";

export interface TargetTemplateRow {
  sector: string;
  name_parts: string[];
  description: string;
  capex_pct: number;
  nwc_pct: number;
  margin_min: number;
  margin_max: number;
  growth_min: number;
  growth_max: number;
  revenue_min: number;
  revenue_max: number;
  leverage_min: number;
  leverage_max: number;
  quality_min: number;
  quality_max: number;
  flags: string[];
}

export function rowsToBook(rows: TargetTemplateRow[]): Book {
  const book: Book = {};
  for (const row of rows) {
    const entry: BookEntry = {
      s: row.name_parts,
      cx: row.capex_pct,
      nw: row.nwc_pct,
      m: [row.margin_min, row.margin_max],
      g: [row.growth_min, row.growth_max],
      rb: [row.revenue_min, row.revenue_max],
      lev: [row.leverage_min, row.leverage_max],
      q: [row.quality_min, row.quality_max],
      fl: row.flags,
      d: row.description,
    };
    (book[row.sector] ??= []).push(entry);
  }
  return book;
}
