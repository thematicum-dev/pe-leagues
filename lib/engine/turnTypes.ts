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
export type HireChoice = "veteran" | "aplayer" | "development" | "reject";

export interface Bid {
  dealId: string;
  multiple: number;
  leverage: number;
}

export interface InitiativeIntent {
  holdingUid: string;
  dim: InitDim;
  id: string;
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
  initiatives?: InitiativeIntent[];
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

/* Eine offene Kandidaten-Shortlist für eine zu besetzende Position (hire()/
   rejectAll() in der ursprünglichen UI). */
export interface ShortlistItem {
  holdingUid: string;
  name: string;
  seat: Seat;
  candidates: { label: string; skill: number; dev: boolean; poach: number; note: string }[];
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

export interface RuntimeFeedEntry {
  halfYear: number;
  emoji: string;
  tone: "neu" | "pos" | "neg";
  text: string;
  slot?: number;
}
