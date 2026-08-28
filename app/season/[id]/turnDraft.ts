/* Der Entwurf eines Halbjahres: alles, was ein Spieler vormerkt, bevor er
   "Halbjahr abschließen" drückt.

   Warum es das gibt: Diese Vormerkungen lagen ausschließlich in React-State.
   Ein Weg zum Dashboard und zurück hat die Spielkomponente abgebaut — und
   damit die gesamte Arbeit des Halbjahres verworfen, ohne Warnung. Dasselbe
   galt für einen Reload oder wenn das Telefon die Seite aus dem Speicher
   geworfen hat.

   Warum localStorage und nicht der Server: turn_submissions ist die
   Zählgrundlage dafür, ob alle abgegeben haben (season_submission_status,
   claim_season_for_evaluation). Eine Entwurfszeile dort würde als Abgabe
   zählen und das Halbjahr vorzeitig auswerten lassen. Ein eigener
   Serverspeicher wäre möglich, aber ein Entwurf ist geräte-lokale
   Notizarbeit — er muss den Weg zum Dashboard überleben, nicht den
   Gerätewechsel.

   Die reinen Funktionen stehen hier und nicht in der Komponente, damit sich
   Wiederherstellung und Referenzprüfung ohne React testen lassen. */
import type {
  ExitStartIntent, HireIntent, InitiativeIntent, OfferDecisionIntent, SearchIntent,
} from "@/lib/engine/turnTypes";

export interface TurnDraft {
  bids: Record<string, { mult: number; lev: number }>;
  ddStaged: Record<string, true>;
  searches: SearchIntent[];
  initiatives: InitiativeIntent[];
  ltipStaged: string[];
  studyStaged: string[];
  exitStarts: ExitStartIntent[];
  hireDecisions: HireIntent[];
  offerDecisions: OfferDecisionIntent[];
  /* Die beiden Cursor gehören dazu: ohne sie stünde eine bereits entschiedene
     Shortlist bzw. ein entschiedenes Angebot beim Zurückkehren wieder als
     offene Frage im Vordergrund. */
  shortlistCursor: number;
  exitQueueCursor: number;
}

export const EMPTY_DRAFT: TurnDraft = {
  bids: {}, ddStaged: {}, searches: [], initiatives: [], ltipStaged: [], studyStaged: [],
  exitStarts: [], hireDecisions: [], offerDecisions: [], shortlistCursor: 0, exitQueueCursor: 0,
};

export const isDraftEmpty = (d: TurnDraft) =>
  Object.keys(d.bids).length === 0 && Object.keys(d.ddStaged).length === 0
  && d.searches.length === 0 && d.initiatives.length === 0 && d.ltipStaged.length === 0
  && d.studyStaged.length === 0 && d.exitStarts.length === 0 && d.hireDecisions.length === 0
  && d.offerDecisions.length === 0 && d.shortlistCursor === 0 && d.exitQueueCursor === 0;

/* Der Schlüssel enthält das Halbjahr, damit ein Entwurf niemals in das nächste
   überläuft — auch dann nicht, wenn die Komponente aus irgendeinem Grund
   nicht neu gemountet würde. */
export const draftKeyFor = (seasonId: string, halfYear: number) =>
  `pel.draft.v1.${seasonId}.${halfYear}`;
export const draftKeyPrefixFor = (seasonId: string) => `pel.draft.v1.${seasonId}.`;

/* Referenzen, gegen die ein gespeicherter Entwurf geprüft wird. */
export interface DraftRefs {
  dealIds: Set<string>;
  holdingUids: Set<string>;
  /** je offener Shortlist ein Schlüssel "holdingUid:seat" */
  shortlistKeys: Set<string>;
  /** holdingUids mit offenen Verkaufsangeboten */
  offerUids: Set<string>;
  shortlistCount: number;
  exitQueueCount: number;
}

/* Stellt einen gespeicherten Entwurf wieder her und wirft dabei jede Referenz
   weg, die es nicht mehr gibt: Ein Deal kann aus dem Dealflow verschwunden,
   eine Beteiligung verkauft, eine Shortlist weggefallen sein. Der Server
   ignoriert unbekannte Referenzen ohnehin stillschweigend (siehe
   applyImmediateDecisions) — hier geht es darum, dass die Oberfläche keine
   Geistereinträge zeigt.

   Gibt null zurück, wenn nichts Brauchbares gespeichert war; der Aufrufer
   behält dann seinen bisherigen Zustand. */
export function restoreDraft(raw: string | null, refs: DraftRefs): TurnDraft | null {
  if (!raw) return null;
  let d: unknown;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;   // beschädigter Eintrag
  }
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  const o = d as Record<string, unknown>;

  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const byUid = <T extends { holdingUid?: string }>(v: unknown): T[] =>
    arr<T>(v).filter((i) => !!i && refs.holdingUids.has(i.holdingUid as string));
  const byDealId = (v: unknown) => Object.fromEntries(
    Object.entries((v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>)
      .filter(([id]) => refs.dealIds.has(id)),
  );
  // Ein Cursor darf nie über die tatsächliche Anzahl offener Posten hinaus
  // stehen — sonst bliebe eine offene Entscheidung dauerhaft unsichtbar.
  const cursor = (v: unknown, max: number) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
  };

  return {
    bids: byDealId(o.bids) as TurnDraft["bids"],
    ddStaged: byDealId(o.ddStaged) as TurnDraft["ddStaged"],
    searches: byUid<SearchIntent>(o.searches),
    initiatives: byUid<InitiativeIntent>(o.initiatives),
    exitStarts: byUid<ExitStartIntent>(o.exitStarts),
    ltipStaged: arr<string>(o.ltipStaged).filter((u) => refs.holdingUids.has(u)),
    studyStaged: arr<string>(o.studyStaged).filter((u) => refs.holdingUids.has(u)),
    hireDecisions: arr<HireIntent>(o.hireDecisions)
      .filter((h) => !!h && refs.shortlistKeys.has(`${h.holdingUid}:${h.seat}`)),
    offerDecisions: arr<OfferDecisionIntent>(o.offerDecisions)
      .filter((x) => !!x && refs.offerUids.has(x.holdingUid)),
    shortlistCursor: cursor(o.shortlistCursor, refs.shortlistCount),
    exitQueueCursor: cursor(o.exitQueueCursor, refs.exitQueueCount),
  };
}
