import type { SupabaseClient } from "@supabase/supabase-js";
import type { RuntimeState } from "@/lib/engine/turnTypes";
import { dpiOf, grossMoicOf } from "@/lib/engine/engine";
import { computeFinalRanking } from "@/lib/engine/runQuarter";

type Fund = RuntimeState["funds"][number];
type Market = RuntimeState["market"];

/** Eine Zeile der Endrangliste, wie sie in seasons.final_ranking steht. */
export interface RankingRow {
  slot: number;
  name: string;
  score: number;
  /* tvcc fehlt in Endranglisten vor dem 18.10.2026 — damals zählte der TVPI */
  tvcc?: number;
  tvpi: number;
  irr: number;
}

/**
 * Alles, was die Abschlussauswertung einer Partie braucht: Rangliste, die
 * eigenen Kennzahlen und die beiden letzten Stände für die Value Bridge.
 */
export interface SeasonReport {
  /** "final": regulär beendet; "aborted": Stand beim Abbruch, ungewertet. */
  kind: "final" | "aborted";
  halfYear: number;
  ranking: RankingRow[];
  myRank: number | null;
  me: {
    score: number;
    tvcc: number | null;
    irr: number;
    tvpi: number;
    dpi: number | null;
    gross: number | null;
    drawn: number;
    distributed: number;
  } | null;
  myFund: Fund | null;
  market: Market | null;
  prev: { fund: Fund; market: Market; quarter: number } | null;
}

/**
 * Liest die Abschlussauswertung einer beendeten oder abgebrochenen Partie.
 *
 * Bei einer beendeten Partie ist seasons.final_ranking maßgeblich. Fehlt sie
 * dort (die Auswertung ist dann unvollständig geschrieben), wird sie mit
 * derselben Funktion aus dem Schlussstand nachgerechnet, mit der die
 * Auswertungsroutine sie auch schreibt — vorher blieb die Seite in diesem
 * Fall leer. Bei einer abgebrochenen Partie gibt es keine Endrangliste; die
 * Auswertung zeigt dann den Stand nach dem letzten ausgewerteten Halbjahr,
 * zu denselben Formeln, aber ausdrücklich ohne Wertung.
 *
 * season_state ist für Mitspieler lesbar (Policy season_state_select).
 */
export async function loadSeasonReport(
  supabase: SupabaseClient,
  seasonId: string,
  kind: "final" | "aborted",
  storedRanking: unknown,
  humanSlot: number | null,
): Promise<SeasonReport | null> {
  // Zwei Stände: der letzte und der davor, damit die Value Bridge auch die
  // Spalte für das letzte Halbjahr bilden kann.
  const { data: rows } = await supabase
    .from("season_state")
    .select("state, half_year")
    .eq("season_id", seasonId)
    .order("half_year", { ascending: false })
    .limit(2);

  const last = rows?.[0]?.state as RuntimeState | undefined;
  const halfYear = (rows?.[0]?.half_year as number | undefined) ?? 0;
  // Ein abgebrochener Start (nur Ausgangszustand) hat nichts auszuwerten.
  if (kind === "aborted" && halfYear < 1) return null;

  let ranking: RankingRow[] = Array.isArray(storedRanking) ? (storedRanking as RankingRow[]) : [];
  if (ranking.length === 0 && last?.funds?.length) {
    ranking = computeFinalRanking(last, halfYear);
  }
  if (ranking.length === 0) return null;

  const myFund = humanSlot != null ? last?.funds?.find((f) => f.slot === humanSlot) ?? null : null;
  const market = last?.market ?? null;
  const before = rows?.[1]?.state as RuntimeState | undefined;
  const beforeFund = humanSlot != null ? before?.funds?.find((f) => f.slot === humanSlot) : undefined;
  const prev = before && beforeFund
    ? { fund: beforeFund, market: before.market, quarter: (rows?.[1]?.half_year as number) ?? 0 }
    : null;

  const idx = humanSlot != null ? ranking.findIndex((r) => r.slot === humanSlot) : -1;
  const row = idx >= 0 ? ranking[idx] : null;
  const me = row
    ? {
        score: row.score,
        tvcc: row.tvcc ?? null,
        irr: row.irr,
        tvpi: row.tvpi,
        dpi: myFund && market && myFund.drawn > 0 ? dpiOf(myFund, market, halfYear) : null,
        gross: myFund && market && myFund.drawn > 0 ? grossMoicOf(myFund, market) : null,
        drawn: myFund?.drawn ?? 0,
        distributed: myFund?.distTotal ?? 0,
      }
    : null;

  return { kind, halfYear, ranking, myRank: idx >= 0 ? idx + 1 : null, me, myFund, market, prev };
}
