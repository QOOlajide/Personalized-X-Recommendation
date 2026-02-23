import { describe, it, expect, vi } from "vitest";
import type { GeneratedPersona } from "../../lib/ai/schemas/persona";

// ---------------------------------------------------------------------------
// Mock the database module so Vitest never tries to load Prisma.
// seed-personas.ts imports db at the top level — without this mock,
// Vitest would attempt to resolve @/generated/prisma, which fails
// in the test environment because the Prisma client path alias
// doesn't fully resolve outside of Next.js.
// ---------------------------------------------------------------------------
vi.mock("../../lib/db", () => ({
  db: {}, // Empty stub — we're only testing the pure mapping function
}));

import { toUserCreateInput } from "../seed-personas";

// =============================================================================
// toUserCreateInput — pure mapping function
// =============================================================================

describe("toUserCreateInput", () => {
  const validPersona: GeneratedPersona = {
    name: "Ali Hassan",
    handle: "ali_codes",
    bio: "Building the future, one commit at a time.",
    location: "Dubai, UAE",
    website: "https://ali.dev",
    config: {
      archetype: "developer",
      interests: ["TypeScript", "system design", "open source"],
      writingStyle: "concise, uses code snippets, occasional humor",
      postingFrequency: "high",
      engagementStyle: "replies with detailed technical answers",
    },
  };

  it("maps name correctly", () => {
    const result = toUserCreateInput(validPersona);
    expect(result.name).toBe("Ali Hassan");
  });

  it("maps handle correctly", () => {
    const result = toUserCreateInput(validPersona);
    expect(result.handle).toBe("ali_codes");
  });

  it("generates email from handle", () => {
    const result = toUserCreateInput(validPersona);
    expect(result.email).toBe("ali_codes@persona.local");
  });

  it("maps bio correctly", () => {
    const result = toUserCreateInput(validPersona);
    expect(result.bio).toBe("Building the future, one commit at a time.");
  });

  it("maps location correctly", () => {
    const result = toUserCreateInput(validPersona);
    expect(result.location).toBe("Dubai, UAE");
  });

  it("maps website when provided", () => {
    const result = toUserCreateInput(validPersona);
    expect(result.website).toBe("https://ali.dev");
  });

  it("maps website to null when undefined", () => {
    const { website, ...noWebsite } = validPersona;
    const result = toUserCreateInput(noWebsite as GeneratedPersona);
    expect(result.website).toBeNull();
  });

  it("always sets isPersona to true", () => {
    const result = toUserCreateInput(validPersona);
    expect(result.isPersona).toBe(true);
  });

  it("passes config as personaConfig", () => {
    const result = toUserCreateInput(validPersona);
    expect(result.personaConfig).toEqual(validPersona.config);
    expect(result.personaConfig.archetype).toBe("developer");
  });

  it("generates unique emails for different handles", () => {
    const persona1 = { ...validPersona, handle: "user_a" };
    const persona2 = { ...validPersona, handle: "user_b" };

    const result1 = toUserCreateInput(persona1);
    const result2 = toUserCreateInput(persona2);

    expect(result1.email).not.toBe(result2.email);
    expect(result1.email).toBe("user_a@persona.local");
    expect(result2.email).toBe("user_b@persona.local");
  });
});
