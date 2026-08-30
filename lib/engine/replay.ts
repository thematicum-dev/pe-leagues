/* Exakte Wiederholung bereits ausgewerteter Halbjahre.

   Wozu: Die Berichtsansicht (lib/engine/financials.ts) liest die Beträge ab,
   die stepCompany() mitgeschrieben hat. Partien, die vor Einführung dieser
   Mitschrift begonnen haben, tragen sie für ihre bisherigen Halbjahre nicht —
   und geschätzte Zahlen sind in einem Abschluss keine Zahlen. Sie lassen sich
   aber vollständig zurückgewinnen, denn die Auswertung ist deterministisch:
   derselbe Zustand, dieselben Abgaben und dieselbe Position im Zufallsstrom
   ergeben immer dasselbe Halbjahr (siehe __tests__/serverPathParity.test.ts).

   Zustand und Abgaben liegen vollständig in der Datenbank: season_state hält
   den Spielstand nach jedem Halbjahr, turn_submissions jede Abgabe. Was fehlt,
   ist die Position im Zufallsstrom zu Beginn eines Halbjahres — seasons.seed
   wird bei jeder Auswertung überschrieben und kennt nur den heutigen Stand.

   Genau die lässt sich rekonstruieren. Der Generator ist ein linearer
   Kongruenzgenerator; sein Schritt s → (s·A + C) mod 2^32 ist umkehrbar, weil
   A ungerade und damit modulo 2^32 invertierbar ist. Vom bekannten Endstand
   aus lässt sich der Strom also beliebig weit zurückdrehen. Unbekannt bleibt
   nur, wie viele Ziehungen ein Halbjahr verbraucht hat — eine einzige ganze
   Zahl, die sich probieren lässt: Eine Startposition kommt nur in Frage, wenn
   die Wiederholung den gespeicherten Spielstand Feld für Feld wieder ergibt,
   samt Dealflow, Meldungen und Kassenständen. Ein Zufallstreffer ist
   ausgeschlossen — mit einer falschen Startposition weicht spätestens der
   erste gezogene Deal ab.

   Der Suchraum ist klein: Die Zahl der Ziehungen eines Halbjahres hängt kaum
   von der Startposition ab (der Löwenanteil ist strukturell — fünf neue Deals,
   ein Schritt je Beteiligung, die Züge der KI-Fonds). Deshalb wird zuerst
   gemessen, wie viele Ziehungen eine Wiederholung von irgendeiner Position aus
   braucht, und dann von diesem Schätzwert aus nach außen gesucht. Eine volle
   Partie mit fünf Spielern über fünfzehn Halbjahre kostet so rund 200
   Wiederholungen, keine Zehntausende.

   Eindeutig ist die gefundene Zahl allerdings nicht immer: Beginnt ein
   Halbjahr mit Ziehungen, die am Ausgang nichts ändern, liefert auch eine
   etwas frühere Startposition denselben Spielstand. Für das Halbjahr selbst
   ist das folgenlos, für die Kette nicht — die Startposition des einen ist der
   Endstand des vorherigen. backfillSeason() prüft deshalb bis Halbjahr 1
   durch und nimmt einen Kandidaten zurück, wenn sich damit das Halbjahr davor
   nicht mehr herstellen lässt.                                               */
import { createRng, LCG_A, LCG_C, LCG_M } from "./rng.ts";
import { runQuarter } from "./runQuarter.ts";
import { LEGACY_COMPAT } from "./engine.ts";
import type { RuntimeState, TurnDecisions } from "./turnTypes.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* (a · b) mod 2^32, exakt. Das Produkt zweier 32-Bit-Zahlen liegt jenseits der
   Ganzzahlgenauigkeit von double, deshalb wird der Faktor in zwei 16-Bit-
   Hälften zerlegt; jedes Teilprodukt bleibt dann unter 2^48 und damit exakt.
   Ein um eins verrutschtes Ergebnis würde die Rückrechnung still verfälschen
   statt sie scheitern zu lassen — hier ist Genauigkeit alles.               */
function mulmod32(a: number, b: number): number {
  const hi = Math.floor(a / 65536), lo = a % 65536;
  return (((hi * b) % 65536) * 65536 + lo * b) % LCG_M;
}

/* Multiplikatives Inverses von A modulo 2^32, über Hensel-Lifting: Für
   ungerades a gilt a·a ≡ 1 (mod 8), und jeder Schritt x ← x·(2 − a·x)
   verdoppelt die Zahl korrekter Bits. Fünf Schritte bringen 3 auf 48 Bit,
   mehr als die 32, die hier gebraucht werden.                              */
function inverseMod32(a: number): number {
  let inv = a % LCG_M;
  for (let i = 0; i < 5; i++) inv = mulmod32(inv, (2 - mulmod32(a, inv) + LCG_M) % LCG_M);
  return inv;
}
const A_INV = inverseMod32(LCG_A);

/* Einen Schritt des Generators rückwärts: s_vorher = (s − C) · A⁻¹ mod 2^32. */
export function rngStepBack(seed: number, steps = 1): number {
  let s = ((Math.trunc(seed) % LCG_M) + LCG_M) % LCG_M;
  for (let i = 0; i < steps; i++) s = mulmod32((s - LCG_C + LCG_M) % LCG_M, A_INV);
  return s;
}

/* Die Mitschrift selbst gehört nicht zum Vergleich: Sie ist genau das, was der
   gespeicherte Zustand noch nicht hat und die Wiederholung hinzufügt. nwcBal
   gehört dazu — im Altverhalten ist der Bestand eine reine Fortschreibung und
   fließt in keine Formel zurück, ein alter Spielstand kennt ihn deshalb nicht. */
const RECORDING_KEYS = new Set(["fin", "per", "off", "nwcBal"]);

/* Tiefer Vergleich zweier Spielstände. Zahlen exakt, Schlüsselreihenfolge egal,
   fehlende und undefinierte Felder gleichwertig — ein Zustand aus der Datenbank
   hat den Weg durch JSON hinter sich, ein frisch gerechneter nicht. Der
   Vergleich läuft ohne Zwischenkopie: Er wird bei der Suche nach der
   Startposition zigtausendfach aufgerufen.                                   */
function sameValue(a: Any, b: Any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  const ta = typeof a;
  if (ta !== typeof b) return false;
  if (ta !== "object") return false;   // Zahlen, Zeichenketten, Wahrheitswerte: oben erledigt
  const aIsArr = Array.isArray(a);
  if (aIsArr !== Array.isArray(b)) return false;
  if (aIsArr) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!sameValue(a[i], b[i])) return false;
    return true;
  }
  for (const k in a) {
    if (RECORDING_KEYS.has(k) || a[k] === undefined) continue;
    if (!sameValue(a[k], b[k])) return false;
  }
  for (const k in b) {
    if (RECORDING_KEYS.has(k) || b[k] === undefined) continue;
    if (a[k] === undefined && b[k] !== undefined && b[k] !== null) return false;
  }
  return true;
}

export function statesMatch(a: RuntimeState, b: RuntimeState): boolean {
  return sameValue(a, b);
}

/* Ein Halbjahr von einer gegebenen Startposition aus wiederholen. Liefert den
   Zustand danach, die Endposition und die Zahl der verbrauchten Ziehungen.

   Gerechnet wird nach dem Regelstand, unter dem das Halbjahr gespielt wurde
   (LEGACY_COMPAT) — nicht nach dem heutigen. Ein Halbjahr, das vor einer
   Regelkorrektur ausgewertet wurde, ergäbe sonst einen anderen Spielstand als
   den gespeicherten, und die Wiederherstellung müsste scheitern, obwohl mit
   den Daten alles in Ordnung ist. Wiederhergestellt wird immer nur
   Vergangenheit; alles ab dem laufenden Halbjahr rechnet nach heutigem Stand. */
export function replayHalfYear(
  state: RuntimeState, halfYear: number,
  decisionsBySlot: Record<number, TurnDecisions>, startSeed: number,
) {
  const rng = createRng(startSeed);
  const out = runQuarter({ state, halfYear, decisionsBySlot, rng, compat: LEGACY_COMPAT });
  return { state: out.state, feed: out.feed, endSeed: rng.seed, draws: rng.draws };
}

/* Obergrenze der Suche. Ein Halbjahr verbraucht gemessen 380 bis 510
   Ziehungen; die Grenze liegt um ein Vielfaches darüber, damit auch ein
   Halbjahr mit fünf menschlichen Fonds, vollen Portfolios, vielen Maßnahmen
   und mehreren Verkaufsprozessen bequem hineinpasst — und trotzdem eine
   aussichtslose Suche in Sekunden endet statt in Minuten.                   */
export const MAX_DRAWS_PER_HALF_YEAR = 6000;

/* Startposition eines ausgewerteten Halbjahres finden: die Zahl der Ziehungen,
   um die der Strom vom Ende dieses Halbjahres zurückgedreht werden muss.
   Geprüft wird nicht die Zahl selbst, sondern ihr Ergebnis — nur eine
   Startposition, die den gespeicherten Spielstand Feld für Feld wieder
   herstellt, kommt in Frage.

   "Nur eine" heißt allerdings nicht "genau eine". Beginnt ein Halbjahr mit
   Ziehungen, die am Ausgang nichts ändern — etwa ein Wurf für ein Ereignis,
   das ohnehin nicht eintritt —, dann liefert auch eine um diese Ziehungen
   frühere Startposition denselben Spielstand. Für das Halbjahr selbst ist das
   folgenlos, für die Kette nicht: Die Startposition eines Halbjahres ist der
   Endstand des vorherigen. Deshalb kann der Aufrufer bereits verworfene
   Kandidaten ausschließen und weitersuchen lassen (siehe backfillSeason).  */
export function findStartSeed(
  prevState: RuntimeState, halfYear: number,
  decisionsBySlot: Record<number, TurnDecisions>,
  expected: RuntimeState, endSeed: number,
  opts: { maxDraws?: number; budget?: number; exclude?: Set<number> } = {},
): { seed: number; draws: number; attempts: number } | null {
  const maxDraws = opts.maxDraws ?? MAX_DRAWS_PER_HALF_YEAR;
  const budget = opts.budget ?? 2 * maxDraws + 16;
  let attempts = 0;
  const tried = new Set<number>();

  let hit: { seed: number; draws: number; attempts: number } | null = null;

  /* Ein Versuch. Rückgabe: die Zahl der Ziehungen, die diese Startposition
     verbraucht hat — bei einem Treffer steht das Ergebnis zusätzlich in hit. */
  const exclude = opts.exclude;
  const attempt = (steps: number): number | null => {
    if (steps < 1 || steps > maxDraws || tried.has(steps)) return null;
    tried.add(steps);
    attempts++;
    const seed = rngStepBack(endSeed, steps);
    const r = replayHalfYear(prevState, halfYear, decisionsBySlot, seed);
    /* Die Endposition muss nicht eigens geprüft werden: Wer bei
       rngStepBack(endSeed, steps) beginnt und genau steps Ziehungen macht,
       landet zwangsläufig wieder bei endSeed. Entscheidend ist allein, dass
       der Spielstand wieder herauskommt.                                    */
    if (!(exclude && exclude.has(seed)) && r.draws === steps && statesMatch(r.state, expected)) {
      hit = { seed, draws: steps, attempts };
    }
    return r.draws;
  };

  /* Erst messen, dann suchen: Eine Wiederholung von irgendeiner Position aus
     verbraucht fast genauso viele Ziehungen wie die echte. Der Fixpunkt dieser
     Messung ist meist schon die Lösung.                                      */
  let guess = replayHalfYear(prevState, halfYear, decisionsBySlot, rngStepBack(endSeed, 1)).draws;
  for (let i = 0; i < 8 && attempts < budget; i++) {
    const draws = attempt(guess);
    if (hit) return hit;
    if (draws == null || draws === guess) break;
    guess = draws;
  }

  /* Sonst ringförmig um den Schätzwert herum, bis der Suchraum erschöpft ist.
     Der Ring beginnt bei Abstand null: Die letzte Messung der Schleife oben
     liefert einen neuen Schätzwert, der selbst noch nicht geprüft wurde. */
  for (let d = 0; d <= maxDraws && attempts < budget; d++) {
    attempt(guess + d);
    if (hit) return hit;
    if (d > 0) attempt(guess - d);
    if (hit) return hit;
  }
  return null;
}

export interface BackfillInput {
  /* Spielstände nach Halbjahr 0..n, aufsteigend und lückenlos. */
  states: { halfYear: number; state: RuntimeState }[];
  /* Abgaben je Halbjahr und Fondsplatz, wie sie die Auswertung gesehen hat. */
  decisionsByHalfYear: Record<number, Record<number, TurnDecisions>>;
  /* Position im Zufallsstrom nach der letzten Auswertung (seasons.seed). */
  endSeed: number;
  maxDraws?: number;
  /* Obergrenze für die Zahl der Wiederholungen über die ganze Partie. */
  budget?: number;
}

export interface BackfillResult {
  ok: boolean;
  /* Wiederholte Spielstände für Halbjahr 1..n, jetzt mit Periodenmitschrift. */
  states: { halfYear: number; state: RuntimeState }[];
  /* Startposition je Halbjahr — damit lässt sich jedes einzeln nachrechnen. */
  startSeeds: Record<number, number>;
  attempts: number;
  reason?: string;
}

/* Eine Partie nachträglich mit der Periodenmitschrift versehen.

   Zwei Durchgänge. Rückwärts wird Halbjahr für Halbjahr die Startposition im
   Zufallsstrom gesucht, beginnend beim bekannten Endstand; jede gefundene
   Startposition ist zugleich der Endstand des Halbjahres davor. Vorwärts wird
   die Partie dann von Halbjahr 1 an durchgespielt, sodass die Mitschrift in
   jeder hist-Zeile landet und nicht nur in der letzten.

   Schlägt auch nur ein Halbjahr fehl, bricht der Lauf ab und liefert nichts:
   Ein halb zurückgerechneter Verlauf wäre schlimmer als gar keiner.         */
export function backfillSeason(input: BackfillInput): BackfillResult {
  const rows = [...input.states].sort((a, b) => a.halfYear - b.halfYear);
  const startSeeds: Record<number, number> = {};
  /* Gesamtbudget an Wiederholungen. Eine volle Partie mit fünf menschlichen
     Fonds über fünfzehn Halbjahre braucht gemessen rund 200 — die Grenze liegt
     also hundertfach darüber und bricht trotzdem in Sekunden ab, wenn sich
     eine Partie nicht herstellen lässt.                                     */
  const budget = input.budget ?? 25000;
  let attempts = 0;

  if (!rows.length || rows[0].halfYear !== 0) {
    return { ok: false, states: [], startSeeds, attempts, reason: "initial_state_missing" };
  }
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].halfYear !== i) {
      return { ok: false, states: [], startSeeds, attempts, reason: "half_years_not_contiguous" };
    }
  }
  const n = rows.length - 1;
  if (n < 1) return { ok: true, states: [], startSeeds, attempts };

  /* Rückwärts durch die Partie, mit Rücknahme. Passt ein Kandidat für
     Halbjahr k, aber lässt sich damit Halbjahr k−1 nicht mehr herstellen, war
     er die mehrdeutige Lösung (siehe findStartSeed) — dann wird er verworfen
     und die Suche an derselben Stelle fortgesetzt. Weil die Kette bis
     Halbjahr 1 durchgeprüft wird, bleibt am Ende nur die tatsächlich
     gespielte Reihenfolge übrig.                                            */
  const rejected = new Map<string, Set<number>>();
  let deepest = n;
  const solve = (k: number, endSeed: number): Record<number, number> | null => {
    if (k === 0) return {};
    if (k < deepest) deepest = k;
    const key = `${k}:${endSeed}`;
    let excluded = rejected.get(key);
    if (!excluded) { excluded = new Set(); rejected.set(key, excluded); }
    for (;;) {
      if (attempts >= budget) return null;
      const found = findStartSeed(
        rows[k - 1].state, k, input.decisionsByHalfYear[k] || {}, rows[k].state, endSeed,
        { maxDraws: input.maxDraws, exclude: excluded },
      );
      attempts += found ? found.attempts : (input.maxDraws ?? MAX_DRAWS_PER_HALF_YEAR);
      if (!found) return null;
      const rest = solve(k - 1, found.seed);
      if (rest) { rest[k] = found.seed; return rest; }
      excluded.add(found.seed);
    }
  };

  const chain = solve(n, input.endSeed);
  if (!chain) {
    return { ok: false, states: [], startSeeds, attempts, reason: `half_year_${deepest}_not_reproducible` };
  }
  Object.keys(chain).forEach((k) => { startSeeds[Number(k)] = chain[Number(k)]; });

  // Vorwärts: die Partie mit Mitschrift nachspielen
  const out: { halfYear: number; state: RuntimeState }[] = [];
  let state = rows[0].state;
  for (let k = 1; k <= n; k++) {
    const r = replayHalfYear(state, k, input.decisionsByHalfYear[k] || {}, startSeeds[k]);
    if (!statesMatch(r.state, rows[k].state)) {
      return { ok: false, states: [], startSeeds, attempts, reason: `half_year_${k}_diverged_on_replay` };
    }
    state = r.state;
    out.push({ halfYear: k, state });
  }
  return { ok: true, states: out, startSeeds, attempts };
}

/* Trägt eine Partie die Mitschrift schon? Geprüft wird der jüngste Spielstand:
   Sobald eine Beteiligung eine hist-Zeile ohne fin hat, fehlt sie.          */
export function needsBackfill(state: RuntimeState): boolean {
  return (state.funds as Any[]).some((f) => !f.isAi && (f.holdings as Any[]).some(
    (c) => (c.hist as Any[] || []).slice(1).some((row) => !row || !row.fin)));
}
