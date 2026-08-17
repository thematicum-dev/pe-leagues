import { archetypeByKey, CAPITAL, DEFAULT_HUMAN_ATTRS, SECTORS, SECTOR_NAMES } from "./constants";
import type { FundState, MarketState, Participant, SeasonState } from "./types";

// Baut den Ausgangszustand (Halbjahr 0) einer Partie. Wer welchen Platz und
// welchen Archetyp bekommt, steht zu diesem Zeitpunkt bereits fest — die
// zufällige Vergabe selbst passiert aus Atomaritätsgründen in der
// Datenbank (start_season() in
// supabase/migrations/20260817090300_start_season.sql), nicht hier. Diese
// Funktion ist die referenzielle Beschreibung des Ergebnisses und dient als
// gemeinsame Quelle für Typen/Werte, z. B. für spätere Client-seitige
// Anzeige- oder Testzwecke.
//
// Die Attributverteilung eines menschlichen Fonds ist hier immer die
// Standardverteilung (DEFAULT_HUMAN_ATTRS) — genau wie im
// Einzelspieler-Übungsmodus vor dem Start wählt jeder menschliche Spieler
// seine eigene Verteilung erst vor dem ersten Halbjahr selbst; das ist
// nicht Teil dieser Funktion.
export function createInitialState(participants: Participant[]): SeasonState {
  if (participants.length !== 5) {
    throw new Error("Eine Partie braucht genau 5 Fondsplätze.");
  }

  const market: MarketState = SECTOR_NAMES.reduce((m, s) => {
    m[s] = SECTORS[s].m;
    return m;
  }, {} as MarketState);

  const funds: FundState[] = [...participants]
    .sort((a, b) => a.slot - b.slot)
    .map((p) => {
      const archetype = p.isAi && p.archetype ? archetypeByKey(p.archetype) : null;
      return {
        slot: p.slot,
        profileId: p.profileId,
        isAi: p.isAi,
        archetype: p.archetype,
        name: p.isAi ? (archetype?.name ?? "KI-Fonds") : (p.displayName ?? "Fonds"),
        attrs: archetype ? archetype.attrs : { ...DEFAULT_HUMAN_ATTRS },
        cash: CAPITAL,
        proceeds: 0,
        investedTotal: 0,
        fees: 0,
        holdings: [],
        realized: [],
        undrawn: CAPITAL,
        drawn: 0,
        recyc: 0,
        recycled: 0,
        distTotal: 0,
        accrued: 0,
        calls: [],
        dists: [],
      };
    });

  return {
    market,
    funds,
    feed: [
      {
        halfYear: 0,
        emoji: "🏁",
        tone: "neu",
        text: `Partie eröffnet. Fünf Fonds, je ${CAPITAL} Mio. €, zehn Jahre.`,
      },
    ],
  };
}
