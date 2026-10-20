/* Typen für die serverseitige Rundenauswertung. Ergänzen lib/engine/types.ts
   (das den Ausgangszustand einer Partie beschreibt) um den Laufzeitzustand
   während einer laufenden Partie (Dealflow, offene Verkaufsangebote, offene
   Shortlists) sowie die Entscheidungen, die ein Spieler pro Halbjahr abgibt.

   Wichtig für die Sicherheit: TurnDecisions enthält ausschließlich Absichten
   (welcher Deal, welches Multiple, welches Leverage, welche Maßnahme, welche
   Kandidatenwahl) — keine abgeleiteten Werte wie Preise, Kassenstände oder
   Ergebnisse. Jedes Feld wird serverseitig gegen den tatsächlichen
   Spielzustand geprüft (siehe turnValidate.ts), niemals ungeprüft
   übernommen. */

export type Seat = "ceo" | "cfo" | "r3";
export type InitDim = "plat" | "acc";
export type ExitAction = "process" | "bilateral" | "cv" | "ipo";
export type OfferChoice = "accept" | "reneg" | "abort";
/* "veteran", "aplayer", "development" sind die Plätze 0 bis 2 der Shortlist
   (so hieß die alte Liste mit drei festen Schablonen), "c0" bis "c4" die
   Plätze des Decks mit fünf Kandidatenkarten. */
export type HireChoice = "veteran" | "aplayer" | "development" | "c0" | "c1" | "c2" | "c3" | "c4" | "reject";

export interface Bid {
  dealId: string;
  multiple: number;
  leverage: number;
}

export interface InitiativeIntent {
  holdingUid: string;
  dim: InitDim;
  id: string;
  /* Nur beim Add-on (dim "acc", id "ma"): der Teil des Kaufpreises, den der
     Fonds als Eigenkapital nachschießt, statt ihn auf die Plattform zu
     finanzieren. Wird serverseitig gegen das investierbare Kapital und gegen
     den Kaufpreis gekappt. */
  equity?: number;
  /* Ebenfalls nur beim Add-on: das Mandat. `addEb` ist das EBITDA, bis zu dem
     gesucht werden soll (Mio. €, serverseitig gegen ADDON_MAX_SHARE des
     Plattform-EBITDA gekappt), `maxMult` das Höchstgebot als Multiple. Über
     die Preisvorstellung des Verkäufers hinaus zahlt niemand, darunter steigt
     das Scheiterungsrisiko — siehe addonFailRisk. Fehlen beide, gilt das
     Referenzmandat (addonMandate). */
  addEb?: number;
  maxMult?: number;
}

/* Kapitalzuführung in eine bestehende Beteiligung: Equity Cure vor einem
   drohenden Enforcement oder schlichte Entschuldung. Der Betrag wird gegen das
   investierbare Kapital gekappt. */
export interface EquityInjectionIntent {
  holdingUid: string;
  amount: number;
}

export interface SearchIntent {
  holdingUid: string;
  seat: Seat;
}

export interface HireIntent {
  holdingUid: string;
  seat: Seat;
  choice: HireChoice;
}

export interface ExitStartIntent {
  holdingUid: string;
  action: ExitAction;
  keepPct?: number;
}

export interface OfferDecisionIntent {
  holdingUid: string;
  choice: OfferChoice;
  offerIndex?: number;
  keepPct?: number;
}

/* Die vollständige Abgabe eines Spielers für ein Halbjahr. Jedes Feld ist
   optional — ein Spieler muss nicht in jeder Kategorie etwas tun. Eine ganz
   leere Abgabe (bzw. keine Abgabe) ist gleichbedeutend mit "passen". */
export interface TurnDecisions {
  bids?: Bid[];
  dueDiligence?: string[];
  /* Benchmarkstudien: uid je Beteiligung, für die nachträglich die
     Branchenreferenz beauftragt wird (runStudy im Übungsmodus). Nur sinnvoll
     für Beteiligungen, die ohne Due Diligence gekauft wurden. */
  studies?: string[];
  initiatives?: InitiativeIntent[];
  equityInjections?: EquityInjectionIntent[];
  ltip?: string[];
  searches?: SearchIntent[];
  hires?: HireIntent[];
  exitStarts?: ExitStartIntent[];
  offerDecisions?: OfferDecisionIntent[];
}

export const EMPTY_DECISIONS: TurnDecisions = {};

/* Ein durch einen Verkaufsprozess erzeugtes Gebotspaket, das auf eine
   Spielerentscheidung wartet (decideOffer in der ursprünglichen UI). */
export interface ExitQueueItem {
  holdingUid: string;
  name: string;
  offers: { buyer: string; kind: string; price: number; risk: number; note: string }[];
}

/* Eine Kandidatenkarte. Die Felder ab `arch` trägt nur das Deck seit dem
   19.10.2026: Archetyp, Person, Herkunft, Porträtnummer, Eigenschaft, das
   gezeigte und das wahre Kompetenzprofil (siehe makeCandidates), seit dem
   20.10.2026 auch die Haltung hell/dunkel (siehe chemOf). */
export interface ShortlistCandidate {
  label: string; shown: number; span: number; skill: number; dev: boolean; poach: number; note: string;
  arch?: string; name?: string; g?: "f" | "m"; age?: number; origin?: string; pic?: number; trait?: string;
  prof?: number[]; shownProf?: number[]; side?: "hell" | "dunkel";
}

/* Eine offene Kandidaten-Shortlist für eine zu besetzende Position (hire()/
   rejectAll() in der ursprünglichen UI). */
export interface ShortlistItem {
  holdingUid: string;
  name: string;
  seat: Seat;
  candidates: ShortlistCandidate[];
}

/* Laufzeitzustand einer Partie zwischen zwei Auswertungen: alles, was die
   Praxis-Komponente bisher in React-State hielt (deals, landmark,
   Warteschlangen) und deshalb jetzt explizit in season_state.state
   mitgeschrieben werden muss, damit der Server zustandslos zwischen zwei
   Aufrufen der Auswertungsfunktion bleibt. */
export interface RuntimeState {
  market: Record<string, number>;
  funds: RuntimeFund[];
  feed: RuntimeFeedEntry[];
  deals: unknown[];
  landmark: unknown | null;
  /* Pro Fondsplatz (slot als String-Key, da JSON-Objektschlüssel immer
     Strings sind) die noch unentschiedenen Verkaufsangebote bzw.
     Besetzungs-Shortlists. */
  exitQueue: Record<string, ExitQueueItem[]>;
  shortlist: Record<string, ShortlistItem[]>;
}

export interface RuntimeFund {
  slot: number;
  profileId: string | null;
  isAi: boolean;
  archetype: string | null;
  name: string;
  attrs: { sourcing: number; analysis: number; negotiation: number; operations: number; financing: number };
  cash: number;
  proceeds: number;
  investedTotal: number;
  fees: number;
  holdings: unknown[];
  realized: unknown[];
  undrawn: number;
  drawn: number;
  recyc: number;
  recycled: number;
  distTotal: number;
  accrued: number;
  calls: unknown[];
  dists: unknown[];
}

/* Ein Eintrag des Nachrichtenfeeds. Der Feed liegt gemeinsam im Spielstand;
   wer welchen Eintrag sieht, entscheiden zwei Felder:

   - `slot` gesetzt: nur dieser Fondsplatz sieht ihn. Das ist die Vorgabe für
     alles Operative — Maßnahmen, Besetzungen, Covenant-Warnungen, der eigene
     Zuschlag. Was ein Wettbewerber in seinem Portfolio tut, steht nicht in
     deiner Zeitung.
   - `slot` nicht gesetzt: alle sehen ihn. Markt- und Sektormeldungen, und der
     Marktbericht über jede Transaktion.
   - `exceptSlot`: eine öffentliche Meldung, die genau ein Platz NICHT sieht —
     der Fonds, der sie ausgelöst hat. Er hat zu derselben Transaktion seine
     eigene, ausführlichere Meldung und braucht die Tickerzeile nicht doppelt. */
export interface RuntimeFeedEntry {
  halfYear: number;
  emoji: string;
  tone: "neu" | "pos" | "neg";
  text: string;
  slot?: number;
  exceptSlot?: number;
}
