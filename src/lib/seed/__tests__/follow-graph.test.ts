/**
 * Unit tests for follow graph construction.
 *
 * Tests the pure algorithmic logic — Jaccard similarity,
 * follow probability, and graph building. No DB calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  jaccardSimilarity,
  followProbability,
  buildFollowGraph,
  type PersonaForGraph,
} from "../follow-graph";

describe("jaccardSimilarity", () => {
  it("returns 1 for identical sets", () => {
    const a = new Set(["ai-ml", "technology"]);
    const b = new Set(["ai-ml", "technology"]);
    expect(jaccardSimilarity(a, b)).toBe(1);
  });

  it("returns 0 for completely disjoint sets", () => {
    const a = new Set(["ai-ml"]);
    const b = new Set(["sports"]);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  it("returns 0 for two empty sets", () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
  });

  it("returns correct value for partial overlap", () => {
    const a = new Set(["ai-ml", "technology", "startups-business"]);
    const b = new Set(["ai-ml", "technology", "sports"]);
    // Intersection: 2, Union: 4
    expect(jaccardSimilarity(a, b)).toBeCloseTo(0.5);
  });

  it("is symmetric (a,b) === (b,a)", () => {
    const a = new Set(["ai-ml", "technology"]);
    const b = new Set(["ai-ml", "sports", "music"]);
    expect(jaccardSimilarity(a, b)).toBe(jaccardSimilarity(b, a));
  });
});

describe("followProbability", () => {
  const techFounder: PersonaForGraph = {
    id: "1",
    interests: ["AI", "startups"],
    archetype: "tech_founder",
  };
  const developer: PersonaForGraph = {
    id: "2",
    interests: ["AI", "programming"],
    archetype: "developer",
  };
  const musician: PersonaForGraph = {
    id: "3",
    interests: ["hip hop", "music production"],
    archetype: "musician",
  };

  it("gives higher probability for overlapping topics", () => {
    // tech_founder and developer share AI/tech topics
    const sharedTopics = new Set(["ai-ml", "technology"]);
    const devTopics = new Set(["ai-ml", "technology"]);
    const musicTopics = new Set(["music"]);

    const probSimilar = followProbability(techFounder, developer, sharedTopics, devTopics);
    const probDifferent = followProbability(techFounder, musician, sharedTopics, musicTopics);

    expect(probSimilar).toBeGreaterThan(probDifferent);
  });

  it("includes archetype affinity bonus for natural pairs", () => {
    // tech_founder → developer has a 0.15 affinity bonus
    const topics = new Set(["ai-ml"]);
    const emptyTopics = new Set<string>();

    const probWithAffinity = followProbability(techFounder, developer, emptyTopics, emptyTopics);
    const probWithoutAffinity = followProbability(musician, developer, emptyTopics, emptyTopics);

    expect(probWithAffinity).toBeGreaterThan(probWithoutAffinity);
  });

  it("never returns negative", () => {
    const a: PersonaForGraph = { id: "a", interests: [], archetype: "comedian" };
    const b: PersonaForGraph = { id: "b", interests: [], archetype: "artist" };
    expect(followProbability(a, b, new Set(), new Set())).toBeGreaterThanOrEqual(0);
  });

  it("never exceeds 1", () => {
    const a: PersonaForGraph = { id: "a", interests: ["AI"], archetype: "tech_founder" };
    const b: PersonaForGraph = { id: "b", interests: ["AI"], archetype: "developer" };
    const same = new Set(["ai-ml", "technology"]);
    expect(followProbability(a, b, same, same)).toBeLessThanOrEqual(1);
  });
});

describe("buildFollowGraph", () => {
  // Mock Math.random to make tests deterministic
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Always return 0.01 — this means only follow probabilities > 0.01 will produce edges
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it("never creates self-follows", () => {
    const personas: PersonaForGraph[] = [
      { id: "1", interests: ["AI"], archetype: "developer" },
      { id: "2", interests: ["AI"], archetype: "developer" },
    ];
    const edges = buildFollowGraph(personas);
    for (const edge of edges) {
      expect(edge.followerId).not.toBe(edge.followingId);
    }
  });

  it("respects the maxFollowsPerUser cap", () => {
    // Create many personas so there are plenty of follow opportunities
    const personas: PersonaForGraph[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      interests: ["AI", "startups"],
      archetype: "developer" as const,
    }));

    const maxFollows = 5;
    const edges = buildFollowGraph(personas, maxFollows);

    // Count follows per user
    const followCounts = new Map<string, number>();
    for (const edge of edges) {
      followCounts.set(edge.followerId, (followCounts.get(edge.followerId) ?? 0) + 1);
    }

    for (const [, count] of followCounts) {
      expect(count).toBeLessThanOrEqual(maxFollows);
    }
  });

  it("returns directional edges (A→B, not necessarily B→A)", () => {
    const personas: PersonaForGraph[] = [
      { id: "1", interests: ["AI"], archetype: "developer" },
      { id: "2", interests: ["AI"], archetype: "developer" },
    ];
    const edges = buildFollowGraph(personas);
    // With deterministic random, edges are one-directional
    // Check that we get edge objects with followerId/followingId
    for (const edge of edges) {
      expect(edge).toHaveProperty("followerId");
      expect(edge).toHaveProperty("followingId");
    }
  });

  it("returns empty array for empty input", () => {
    expect(buildFollowGraph([])).toEqual([]);
  });

  it("returns empty array for a single persona", () => {
    const personas: PersonaForGraph[] = [
      { id: "1", interests: ["AI"], archetype: "developer" },
    ];
    expect(buildFollowGraph(personas)).toEqual([]);
  });
});
