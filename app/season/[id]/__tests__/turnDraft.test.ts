import { describe, expect, it } from "vitest";
import {
  EMPTY_DRAFT, draftKeyFor, draftKeyPrefixFor, isDraftEmpty, restoreDraft,
  type DraftRefs, type TurnDraft,
} from "../turnDraft";

/* Der Zustand einer laufenden Partie, gegen den ein gespeicherter Entwurf
   geprüft wird: zwei Deals im Dealflow, zwei Beteiligungen im Portfolio, eine
   offene Shortlist und ein offenes Verkaufsangebot. */
function refs(over: Partial<DraftRefs> = {}): DraftRefs {
  return {
    dealIds: new Set(["d1", "d2"]),
    holdingUids: new Set(["c1", "c2"]),
    shortlistKeys: new Set(["c1:cfo"]),
    offerUids: new Set(["c2"]),
    shortlistCount: 1,
    exitQueueCount: 1,
    ...over,
  };
}

const fullDraft: TurnDraft = {
  bids: { d1: { mult: 8.5, lev: 3 } },
  ddStaged: { d2: true },
  searches: [{ holdingUid: "c1", seat: "ceo" }],
  initiatives: [{ holdingUid: "c2", dim: "plat", id: "opex" }],
  ltipStaged: ["c1"],
  studyStaged: ["c2"],
  exitStarts: [{ holdingUid: "c1", action: "process" }],
  hireDecisions: [{ holdingUid: "c1", seat: "cfo", choice: "aplayer" }],
  offerDecisions: [{ holdingUid: "c2", choice: "accept", offerIndex: 0 }],
  shortlistCursor: 1,
  exitQueueCursor: 1,
};

describe("Entwurf eines Halbjahres", () => {
  it("überlebt eine Runde durch localStorage unverändert", () => {
    const back = restoreDraft(JSON.stringify(fullDraft), refs());
    expect(back).toEqual(fullDraft);
  });

  it("hält Entwürfe verschiedener Halbjahre und Partien auseinander", () => {
    expect(draftKeyFor("s1", 3)).not.toEqual(draftKeyFor("s1", 4));
    expect(draftKeyFor("s1", 3)).not.toEqual(draftKeyFor("s2", 3));
    // Der Aufräum-Präfix muss alle Halbjahre genau dieser Partie erfassen
    expect(draftKeyFor("s1", 3).startsWith(draftKeyPrefixFor("s1"))).toBe(true);
    expect(draftKeyFor("s2", 3).startsWith(draftKeyPrefixFor("s1"))).toBe(false);
  });

  it("verwirft Gebote und Due Diligence für Deals, die es nicht mehr gibt", () => {
    const stale = { ...fullDraft, bids: { d1: { mult: 8, lev: 3 }, weg: { mult: 9, lev: 2 } },
      ddStaged: { d2: true, weg2: true } };
    const back = restoreDraft(JSON.stringify(stale), refs())!;
    expect(Object.keys(back.bids)).toEqual(["d1"]);
    expect(Object.keys(back.ddStaged)).toEqual(["d2"]);
  });

  it("verwirft Vormerkungen für Beteiligungen, die nicht mehr im Portfolio sind", () => {
    const stale: TurnDraft = {
      ...fullDraft,
      searches: [...fullDraft.searches, { holdingUid: "weg", seat: "cfo" }],
      initiatives: [...fullDraft.initiatives, { holdingUid: "weg", dim: "acc", id: "pen" }],
      exitStarts: [...fullDraft.exitStarts, { holdingUid: "weg", action: "bilateral" }],
      ltipStaged: ["c1", "weg"],
      studyStaged: ["c2", "weg"],
    };
    const back = restoreDraft(JSON.stringify(stale), refs())!;
    expect(back.searches).toEqual(fullDraft.searches);
    expect(back.initiatives).toEqual(fullDraft.initiatives);
    expect(back.exitStarts).toEqual(fullDraft.exitStarts);
    expect(back.ltipStaged).toEqual(["c1"]);
    expect(back.studyStaged).toEqual(["c2"]);
  });

  it("verwirft eine Einstellungsentscheidung, wenn die Shortlist weggefallen ist", () => {
    const back = restoreDraft(JSON.stringify(fullDraft), refs({ shortlistKeys: new Set(), shortlistCount: 0 }))!;
    expect(back.hireDecisions).toEqual([]);
  });

  it("verwirft eine Entscheidung für einen anderen Sitz als den ausgeschriebenen", () => {
    const wrongSeat = { ...fullDraft, hireDecisions: [{ holdingUid: "c1", seat: "ceo", choice: "aplayer" }] };
    const back = restoreDraft(JSON.stringify(wrongSeat), refs())!;
    expect(back.hireDecisions).toEqual([]);
  });

  it("verwirft eine Angebotsentscheidung, wenn kein Angebot mehr offen ist", () => {
    const back = restoreDraft(JSON.stringify(fullDraft), refs({ offerUids: new Set(), exitQueueCount: 0 }))!;
    expect(back.offerDecisions).toEqual([]);
  });

  it("begrenzt die Cursor auf die Zahl der tatsächlich offenen Posten", () => {
    // Sonst bliebe eine offene Entscheidung dauerhaft unsichtbar.
    const ahead = { ...fullDraft, shortlistCursor: 9, exitQueueCursor: 9 };
    const back = restoreDraft(JSON.stringify(ahead), refs())!;
    expect(back.shortlistCursor).toBe(1);
    expect(back.exitQueueCursor).toBe(1);
  });

  it("hält beschädigten oder fremden Inhalt aus", () => {
    expect(restoreDraft(null, refs())).toBeNull();
    expect(restoreDraft("", refs())).toBeNull();
    expect(restoreDraft("{kein json", refs())).toBeNull();
    expect(restoreDraft("null", refs())).toBeNull();
    expect(restoreDraft('"nur ein string"', refs())).toBeNull();
    expect(restoreDraft("[1,2,3]", refs())).toBeNull();
    // Ein Objekt ohne die erwarteten Felder ergibt einen leeren Entwurf,
    // keinen Absturz.
    expect(restoreDraft('{"fremd":true}', refs())).toEqual(EMPTY_DRAFT);
    // Felder mit falschem Typ werden ignoriert statt übernommen
    const wrongTypes = '{"bids":"nope","searches":{"a":1},"shortlistCursor":"x","ltipStaged":null}';
    expect(restoreDraft(wrongTypes, refs())).toEqual(EMPTY_DRAFT);
  });

  it("erkennt einen leeren Entwurf, damit nichts Unnötiges gespeichert wird", () => {
    expect(isDraftEmpty(EMPTY_DRAFT)).toBe(true);
    expect(isDraftEmpty(fullDraft)).toBe(false);
    // Auch ein allein vorgerückter Cursor ist Arbeit und muss erhalten bleiben
    expect(isDraftEmpty({ ...EMPTY_DRAFT, shortlistCursor: 1 })).toBe(false);
    expect(isDraftEmpty({ ...EMPTY_DRAFT, bids: { d1: { mult: 8, lev: 3 } } })).toBe(false);
  });
});
