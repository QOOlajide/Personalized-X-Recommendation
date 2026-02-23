/**
 * Unit tests for topic definitions and interest-to-topic resolution.
 *
 * Tests pure logic only — no DB, no LLM calls.
 */

import { describe, it, expect } from "vitest";
import { TOPICS, INTEREST_TO_TOPIC_MAP, resolveInterestsToTopics } from "../topics";

describe("TOPICS", () => {
  it("has at least 10 topics", () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(10);
  });

  it("has unique slugs", () => {
    const slugs = TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has unique names", () => {
    const names = TOPICS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every topic has a non-empty description", () => {
    for (const topic of TOPICS) {
      expect(topic.description.length).toBeGreaterThan(0);
    }
  });

  it("slugs are URL-safe (lowercase, hyphens, no spaces)", () => {
    for (const topic of TOPICS) {
      expect(topic.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("INTEREST_TO_TOPIC_MAP", () => {
  it("all mapped topic slugs exist in TOPICS", () => {
    const validSlugs = new Set(TOPICS.map((t) => t.slug));

    for (const [interest, slugs] of Object.entries(INTEREST_TO_TOPIC_MAP)) {
      for (const slug of slugs) {
        expect(validSlugs.has(slug)).toBe(true);
      }
    }
  });

  it("all keys are lowercase", () => {
    for (const key of Object.keys(INTEREST_TO_TOPIC_MAP)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});

describe("resolveInterestsToTopics", () => {
  it("resolves known interests to topic slugs", () => {
    const result = resolveInterestsToTopics(["AI", "startups"]);
    expect(result).toContain("ai-ml");
    expect(result).toContain("technology");
    expect(result).toContain("startups-business");
  });

  it("is case-insensitive", () => {
    const lower = resolveInterestsToTopics(["ai"]);
    const upper = resolveInterestsToTopics(["AI"]);
    const mixed = resolveInterestsToTopics(["Ai"]);
    // All should resolve to the same topics
    expect(lower.sort()).toEqual(upper.sort());
    expect(lower.sort()).toEqual(mixed.sort());
  });

  it("deduplicates topic slugs", () => {
    // "AI" and "machine learning" both map to "ai-ml" and "technology"
    const result = resolveInterestsToTopics(["AI", "machine learning"]);
    const unique = new Set(result);
    expect(result.length).toBe(unique.size);
  });

  it("returns empty array for unknown interests", () => {
    const result = resolveInterestsToTopics(["underwater basket weaving"]);
    expect(result).toEqual([]);
  });

  it("handles empty input", () => {
    const result = resolveInterestsToTopics([]);
    expect(result).toEqual([]);
  });

  it("handles mixed known and unknown interests", () => {
    const result = resolveInterestsToTopics(["AI", "xyzzy_nonsense", "football"]);
    expect(result).toContain("ai-ml");
    expect(result).toContain("sports");
    expect(result.length).toBeGreaterThan(0);
  });

  it("trims whitespace from interests", () => {
    const result = resolveInterestsToTopics(["  AI  ", " startups "]);
    expect(result).toContain("ai-ml");
    expect(result).toContain("startups-business");
  });
});
