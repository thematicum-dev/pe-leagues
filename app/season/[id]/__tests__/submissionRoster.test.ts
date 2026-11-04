import { describe, expect, it } from "vitest";
import { rosterFromRows } from "../submissionRoster";

describe("Abgabestand der Mitspieler", () => {
  it("liest die Antwort von season_submission_roster und ordnet nach Fondsplatz", () => {
    expect(rosterFromRows([
      { slot: 3, display_name: "Bert", is_me: false, submitted: false },
      { slot: 1, display_name: "Anna", is_me: true, submitted: true },
    ])).toEqual([
      { slot: 1, name: "Anna", isMe: true, submitted: true },
      { slot: 3, name: "Bert", isMe: false, submitted: false },
    ]);
  });

  it("ersetzt leere Namen und verwirft kaputte Zeilen", () => {
    expect(rosterFromRows([{ slot: 2, display_name: " ", is_me: false, submitted: true }, null, { slot: "x" }]))
      .toEqual([{ slot: 2, name: "Spieler", isMe: false, submitted: true }]);
  });

  it("liefert ohne Antwort eine leere Liste, damit die Warteleiste bei der Zahl bleibt", () => {
    expect(rosterFromRows(null)).toEqual([]);
    expect(rosterFromRows({ error: "function not found" })).toEqual([]);
  });
});
