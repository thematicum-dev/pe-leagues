import { describe, expect, it } from "vitest";
import { INVITE_MESSAGE_MAX, validateInvite } from "../validate";

describe("Einladung prüfen", () => {
  it("nimmt eine Adresse ohne Nachricht an und normalisiert sie", () => {
    expect(validateInvite("  Freund@Example.COM ", "")).toEqual({ ok: true, email: "freund@example.com", message: null });
  });

  it("behält die Nachricht, nur außen gekürzt", () => {
    const r = validateInvite("a@b.de", "  Hallo!\nSpielst du mit?  ");
    expect(r).toEqual({ ok: true, email: "a@b.de", message: "Hallo!\nSpielst du mit?" });
  });

  it("verlangt eine E-Mail-Adresse", () => {
    expect(validateInvite("", "Hi").ok).toBe(false);
    expect(validateInvite(null, null).ok).toBe(false);
  });

  it("lehnt offensichtlich ungültige Adressen ab", () => {
    for (const bad of ["freund", "freund@", "@example.com", "a b@c.de", "a@b"]) {
      expect(validateInvite(bad, "").ok, bad).toBe(false);
    }
  });

  it("lehnt die eigene Adresse ab", () => {
    const r = validateInvite("Ich@Example.com", "", "ich@example.com");
    expect(r).toEqual({ ok: false, error: "Das ist deine eigene Adresse." });
  });

  it("begrenzt die Nachricht", () => {
    expect(validateInvite("a@b.de", "x".repeat(INVITE_MESSAGE_MAX)).ok).toBe(true);
    expect(validateInvite("a@b.de", "x".repeat(INVITE_MESSAGE_MAX + 1)).ok).toBe(false);
  });
});
