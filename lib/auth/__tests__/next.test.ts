import { describe, expect, it } from "vitest";
import { safeNext } from "../next";

describe("safeNext", () => {
  it("lässt eigene, relative Ziele durch", () => {
    expect(safeNext("/leaderboard")).toBe("/leaderboard");
    expect(safeNext("/season/abc-123")).toBe("/season/abc-123");
  });

  it("fällt ohne Ziel auf das Dashboard zurück", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
  });

  it("leitet nie in den Übungsmodus", () => {
    expect(safeNext("/practice")).toBe("/dashboard");
    expect(safeNext("/practice/")).toBe("/dashboard");
  });

  it("weist fremde Ziele ab", () => {
    expect(safeNext("https://example.com")).toBe("/dashboard");
    // Protokollrelativ: für den Browser ein fremder Host, trotz Schrägstrich.
    expect(safeNext("//example.com")).toBe("/dashboard");
    expect(safeNext("dashboard")).toBe("/dashboard");
  });
});
