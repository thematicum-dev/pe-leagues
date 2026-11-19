import { describe, expect, it } from "vitest";
import { normalizePath } from "../track";

describe("normalizePath", () => {
  it("ersetzt Partie-IDs, damit alle Partien eine Seite sind", () => {
    expect(normalizePath("/season/3f2c1a9e-0b7d-4c1e-9a55-0123456789ab")).toBe("/season/:id");
    expect(normalizePath("/dashboard")).toBe("/dashboard");
  });
  it("kürzt überlange Pfade", () => {
    expect(normalizePath("/" + "x".repeat(500))).toHaveLength(200);
  });
});
