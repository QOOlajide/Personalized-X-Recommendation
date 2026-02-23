import { describe, it, expect } from "vitest";
import {
  PERSONA_ARCHETYPES,
  PersonaConfigSchema,
  GeneratedPersonaSchema,
  PersonaBatchSchema,
} from "../persona";

// =============================================================================
// PersonaConfigSchema
// =============================================================================

describe("PersonaConfigSchema", () => {
  const validConfig = {
    archetype: "developer",
    interests: ["TypeScript", "system design"],
    writingStyle: "concise, uses code snippets",
    postingFrequency: "high",
    engagementStyle: "replies with detailed technical answers",
  };

  it("accepts a valid config", () => {
    const result = PersonaConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid archetype", () => {
    const result = PersonaConfigSchema.safeParse({
      ...validConfig,
      archetype: "astronaut", // not in PERSONA_ARCHETYPES
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid archetypes", () => {
    for (const archetype of PERSONA_ARCHETYPES) {
      const result = PersonaConfigSchema.safeParse({
        ...validConfig,
        archetype,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects fewer than 2 interests", () => {
    const result = PersonaConfigSchema.safeParse({
      ...validConfig,
      interests: ["only-one"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 6 interests", () => {
    const result = PersonaConfigSchema.safeParse({
      ...validConfig,
      interests: ["a", "b", "c", "d", "e", "f", "g"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 2 interests (lower bound)", () => {
    const result = PersonaConfigSchema.safeParse({
      ...validConfig,
      interests: ["TypeScript", "Rust"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts exactly 6 interests (upper bound)", () => {
    const result = PersonaConfigSchema.safeParse({
      ...validConfig,
      interests: ["a", "b", "c", "d", "e", "f"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid postingFrequency", () => {
    const result = PersonaConfigSchema.safeParse({
      ...validConfig,
      postingFrequency: "extreme", // not in enum
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing writingStyle", () => {
    const { writingStyle, ...noStyle } = validConfig;
    const result = PersonaConfigSchema.safeParse(noStyle);
    expect(result.success).toBe(false);
  });

  it("rejects missing engagementStyle", () => {
    const { engagementStyle, ...noEngagement } = validConfig;
    const result = PersonaConfigSchema.safeParse(noEngagement);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// GeneratedPersonaSchema
// =============================================================================

describe("GeneratedPersonaSchema", () => {
  const validPersona = {
    name: "Ali Hassan",
    handle: "ali_codes",
    bio: "Building the future, one commit at a time.",
    location: "Dubai, UAE",
    config: {
      archetype: "developer",
      interests: ["TypeScript", "system design", "open source"],
      writingStyle: "concise, uses code snippets, occasional humor",
      postingFrequency: "high",
      engagementStyle: "replies with detailed technical answers",
    },
  };

  it("accepts a valid persona", () => {
    const result = GeneratedPersonaSchema.safeParse(validPersona);
    expect(result.success).toBe(true);
  });

  it("accepts a persona with optional website", () => {
    const result = GeneratedPersonaSchema.safeParse({
      ...validPersona,
      website: "https://ali.dev",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid website URL", () => {
    const result = GeneratedPersonaSchema.safeParse({
      ...validPersona,
      website: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = GeneratedPersonaSchema.safeParse({
      ...validPersona,
      name: "A",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 50 chars", () => {
    const result = GeneratedPersonaSchema.safeParse({
      ...validPersona,
      name: "A".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects handle shorter than 3 chars", () => {
    const result = GeneratedPersonaSchema.safeParse({
      ...validPersona,
      handle: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects handle with special characters", () => {
    const result = GeneratedPersonaSchema.safeParse({
      ...validPersona,
      handle: "ali@codes!",
    });
    expect(result.success).toBe(false);
  });

  it("accepts handle with underscores and numbers", () => {
    const result = GeneratedPersonaSchema.safeParse({
      ...validPersona,
      handle: "ali_codes_42",
    });
    expect(result.success).toBe(true);
  });

  it("rejects bio longer than 160 chars", () => {
    const result = GeneratedPersonaSchema.safeParse({
      ...validPersona,
      bio: "x".repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing config object", () => {
    const { config, ...noConfig } = validPersona;
    const result = GeneratedPersonaSchema.safeParse(noConfig);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// PersonaBatchSchema
// =============================================================================

describe("PersonaBatchSchema", () => {
  const validPersona = {
    name: "Ali Hassan",
    handle: "ali_codes",
    bio: "Building the future.",
    location: "Dubai, UAE",
    config: {
      archetype: "developer",
      interests: ["TypeScript", "system design"],
      writingStyle: "concise",
      postingFrequency: "high",
      engagementStyle: "replies often",
    },
  };

  it("accepts a batch with one persona", () => {
    const result = PersonaBatchSchema.safeParse({
      personas: [validPersona],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a batch with multiple personas", () => {
    const result = PersonaBatchSchema.safeParse({
      personas: [
        validPersona,
        { ...validPersona, handle: "sara_writes", name: "Sara" },
        { ...validPersona, handle: "omar_trades", name: "Omar" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.personas).toHaveLength(3);
    }
  });

  it("rejects an empty personas array", () => {
    const result = PersonaBatchSchema.safeParse({ personas: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing personas key", () => {
    const result = PersonaBatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects if any persona in batch is invalid", () => {
    const result = PersonaBatchSchema.safeParse({
      personas: [
        validPersona,
        { name: "Incomplete" }, // missing required fields
      ],
    });
    expect(result.success).toBe(false);
  });
});
