import type { ArchetypeKey, Attrs, SectorName } from "./constants";

export interface FundState {
  slot: number;
  profileId: string | null;
  isAi: boolean;
  archetype: ArchetypeKey | null;
  name: string;
  attrs: Attrs;
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

export type MarketState = Record<SectorName, number>;

export interface FeedEntry {
  halfYear: number;
  emoji: string;
  tone: "neu" | "pos" | "neg";
  text: string;
}

export interface SeasonState {
  market: MarketState;
  funds: FundState[];
  feed: FeedEntry[];
}

export interface Participant {
  slot: number;
  profileId: string | null;
  isAi: boolean;
  archetype: ArchetypeKey | null;
  displayName: string | null;
}
