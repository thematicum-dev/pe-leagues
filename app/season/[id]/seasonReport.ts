import type { SupabaseClient } from "@supabase/supabase-js";
import type { RuntimeState } from "@/lib/engine/turnTypes";
import { dpiOf, grossMoicOf, irrOf, scoreOf, tvccOf, tvpiOf } from "@/lib/engine/engine";
import { computeFinalRanking } from "@/lib/engine/runQuarter";

type Fund = RuntimeState["funds"][number];
type Market = RuntimeState["market"];
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

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

/** Ein Fonds der Kohorte im letzten Stand, mit den Kennzahlen der Peer Group. */
export interface PeerFund {
  fund: Fund;
  score: number;
  tvcc: number;
  tvpi: number;
  irr: number;
  dpi: number;
}

/**
 * Alles, was die Abschlussauswertung einer Partie braucht: Rangliste, die
 * eigenen Kennzahlen, die beiden letzten Stände für die Value Bridge und der
 * Verlauf über alle Halbjahre für die Grafiken der Peer Group.
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
  /** Wertung je Halbjahr (Index 0 = Halbjahr 0), je Zeile die Fonds nach Platz-Nr. sortiert. */
  scoreHist: number[][];
  /** Position des eigenen Fonds in jeder Zeile von scoreHist. */
  meIdx: number;
  /** Alle Fonds im letzten Stand, nach Wertung sortiert. */
  peers: PeerFund[];
  /** Je eigenem Exit die Beteiligung, wie sie zuletzt im Portfolio stand (für Verlauf und Value Bridge). */
  exitHoldings: Any[];
  /** Käufer je eigenem Exit, aus dem Meldungsverlauf. */
  buyers: Record<string, string>;
}

/* Wer bei einem Exit gekauft hat, steht nur im Meldungsverlauf — dieselbe
   Suche wie exitBuyerOf in MultiplayerGame, je realisierter Beteiligung. */
function buyersOf(feed: Any[], slot: number, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const head = `Exit ${name} an `;
    for (let i = feed.length - 1; i >= 0; i--) {
      const f = feed[i];
      if (f && f.slot === slot && typeof f.text === "string" && f.text.startsWith(head)) {
        out[name] = f.text.slice(head.length).split(":")[0];
        break;
      }
    }
  }
  return out;
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
 * Für den Verlauf werden aus season_state nur Markt und Fonds gelesen, nicht
 * der ganze Stand: Meldungen und Dealflow wachsen mit jedem Halbjahr und
 * würden zwanzigmal übertragen. Die Meldungen braucht es nur einmal, aus dem
 * letzten Stand (Käufer der Exits).
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
  const { data: rows } = await supabase
    .from("season_state")
    .select("half_year, market:state->market, funds:state->funds")
    .eq("season_id", seasonId)
    .order("half_year", { ascending: true });

  const hist = ((rows ?? []) as Any[])
    .filter((r) => r.market && Array.isArray(r.funds))
    .map((r) => ({ halfYear: r.half_year as number, market: r.market as Market, funds: r.funds as Fund[] }));
  const last = hist[hist.length - 1];
  if (!last) return null;
  const halfYear = last.halfYear;
  // Ein abgebrochener Start (nur Ausgangszustand) hat nichts auszuwerten.
  if (kind === "aborted" && halfYear < 1) return null;

  let ranking: RankingRow[] = Array.isArray(storedRanking) ? (storedRanking as RankingRow[]) : [];
  if (ranking.length === 0) {
    ranking = computeFinalRanking({ market: last.market, funds: last.funds } as RuntimeState, halfYear);
  }
  if (ranking.length === 0) return null;

  const myFund = humanSlot != null ? last.funds.find((f) => f.slot === humanSlot) ?? null : null;
  const market = last.market;
  const before = hist[hist.length - 2];
  const beforeFund = before && humanSlot != null ? before.funds.find((f) => f.slot === humanSlot) : undefined;
  const prev = before && beforeFund ? { fund: beforeFund, market: before.market, quarter: before.halfYear } : null;

  const idx = humanSlot != null ? ranking.findIndex((r) => r.slot === humanSlot) : -1;
  const row = idx >= 0 ? ranking[idx] : null;
  const me = row
    ? {
        score: row.score,
        tvcc: row.tvcc ?? null,
        irr: row.irr,
        tvpi: row.tvpi,
        dpi: myFund && myFund.drawn > 0 ? dpiOf(myFund, market, halfYear) : null,
        gross: myFund && myFund.drawn > 0 ? grossMoicOf(myFund, market) : null,
        drawn: myFund?.drawn ?? 0,
        distributed: myFund?.distTotal ?? 0,
      }
    : null;

  /* Wertungsverlauf wie im Peer-Group-Tab: je Halbjahr alle Fonds, nach
     Platz-Nr. sortiert, damit eine Spalte immer derselbe Fonds ist. */
  const scoreHist = hist.map((h) =>
    [...h.funds].sort((a, b) => a.slot - b.slot).map((f) => scoreOf(f, h.market, h.halfYear)),
  );
  const meIdx = [...last.funds].sort((a, b) => a.slot - b.slot).findIndex((f) => f.slot === humanSlot);

  // Reihenfolge der Peer Group wie die Rangliste darüber
  const order = new Map(ranking.map((r, i) => [r.slot, i]));
  const peers: PeerFund[] = last.funds
    .map((f) => ({
      fund: f,
      score: scoreOf(f, market, halfYear),
      tvcc: tvccOf(f, market, halfYear),
      tvpi: tvpiOf(f, market, halfYear),
      irr: irrOf(f, market, halfYear),
      dpi: f.drawn > 0 ? dpiOf(f, market, halfYear) : 0,
    }))
    .sort((a, b) => (order.get(a.fund.slot) ?? 99) - (order.get(b.fund.slot) ?? 99));

  /* Für die Value Bridge eines Exits zeigt das Exit-Fenster auch den Verlauf
     der Beteiligung — und der steht nur an der Beteiligung selbst, solange sie
     im Portfolio war. Deshalb je Name der letzte Stand, in dem sie vorkam. */
  const exitHoldings: Any[] = [];
  if (humanSlot != null) {
    const seen = new Map<string, Any>();
    for (const h of hist) {
      const f = h.funds.find((z) => z.slot === humanSlot) as Any;
      for (const c of f?.holdings ?? []) seen.set(c.name, c);
    }
    exitHoldings.push(...seen.values());
  }

  let buyers: Record<string, string> = {};
  if (humanSlot != null && (myFund as Any)?.realized?.length) {
    const { data: feedRow } = await supabase
      .from("season_state")
      .select("feed:state->feed")
      .eq("season_id", seasonId)
      .eq("half_year", halfYear)
      .maybeSingle();
    buyers = buyersOf(((feedRow as Any)?.feed ?? []) as Any[], humanSlot, (myFund as Any).realized.map((r: Any) => r.name));
  }

  return {
    kind, halfYear, ranking, myRank: idx >= 0 ? idx + 1 : null, me, myFund, market, prev,
    scoreHist, meIdx, peers, exitHoldings, buyers,
  };
}
