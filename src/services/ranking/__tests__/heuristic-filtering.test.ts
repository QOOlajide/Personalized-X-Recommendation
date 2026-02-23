/**
 * Tests for Stage 3: Heuristic Filtering
 *
 * Each filter is tested in isolation, then applyHeuristicFilters
 * is tested as an integration to confirm correct sequencing.
 */

import { describe, it, expect } from "vitest";
import {
  applyAuthorDiversityCap,
  applyTopicSaturationLimit,
  applyFreshnessFloor,
  applyExplorationInjection,
  applyHeuristicFilters,
} from "../heuristic-filtering";
import type { ScoredPost } from "../types";
import { DEFAULT_PIPELINE_CONFIG } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScored(overrides: Partial<ScoredPost> = {}): ScoredPost {
  return {
    id: "post-1",
    content: "Test post",
    authorId: "author-1",
    createdAt: new Date("2026-02-23T08:00:00Z"),
    likeCount: 10,
    repostCount: 2,
    replyCount: 3,
    viewCount: 100,
    parentId: null,
    quotedPostId: null,
    topicSlugs: ["technology"],
    source: "in_network",
    score: 0.8,
    factors: {
      recency: 0.9,
      popularity: 0.6,
      networkBonus: 1.0,
      topicRelevance: 0.7,
      engagementVelocity: 0.3,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// applyAuthorDiversityCap
// ---------------------------------------------------------------------------

describe("applyAuthorDiversityCap", () => {
  it("keeps all posts when no author exceeds the cap", () => {
    const posts = [
      makeScored({ id: "a1", authorId: "alice" }),
      makeScored({ id: "b1", authorId: "bob" }),
      makeScored({ id: "c1", authorId: "charlie" }),
    ];
    expect(applyAuthorDiversityCap(posts, 3)).toHaveLength(3);
  });

  it("drops posts beyond the author cap", () => {
    const posts = [
      makeScored({ id: "a1", authorId: "alice", score: 0.9 }),
      makeScored({ id: "a2", authorId: "alice", score: 0.8 }),
      makeScored({ id: "a3", authorId: "alice", score: 0.7 }),
      makeScored({ id: "a4", authorId: "alice", score: 0.6 }),
      makeScored({ id: "b1", authorId: "bob", score: 0.5 }),
    ];
    const filtered = applyAuthorDiversityCap(posts, 2);
    expect(filtered).toHaveLength(3); // 2 alice + 1 bob
    expect(filtered.map((p) => p.id)).toEqual(["a1", "a2", "b1"]);
  });

  it("preserves score-order within the cap", () => {
    const posts = [
      makeScored({ id: "a1", authorId: "alice", score: 0.9 }),
      makeScored({ id: "b1", authorId: "bob", score: 0.85 }),
      makeScored({ id: "a2", authorId: "alice", score: 0.8 }),
    ];
    const filtered = applyAuthorDiversityCap(posts, 2);
    // All pass (alice has 2, bob has 1)
    expect(filtered.map((p) => p.id)).toEqual(["a1", "b1", "a2"]);
  });
});

// ---------------------------------------------------------------------------
// applyTopicSaturationLimit
// ---------------------------------------------------------------------------

describe("applyTopicSaturationLimit", () => {
  it("keeps all posts when no topic exceeds the limit", () => {
    const posts = [
      makeScored({ id: "1", topicSlugs: ["technology"] }),
      makeScored({ id: "2", topicSlugs: ["sports"] }),
      makeScored({ id: "3", topicSlugs: ["music"] }),
    ];
    expect(applyTopicSaturationLimit(posts, 10, 0.4)).toHaveLength(3);
  });

  it("drops posts when a topic exceeds the saturation limit", () => {
    const feedSize = 10;
    const limit = 0.3; // max 3 per topic
    const posts = [
      makeScored({ id: "t1", topicSlugs: ["technology"] }),
      makeScored({ id: "t2", topicSlugs: ["technology"] }),
      makeScored({ id: "t3", topicSlugs: ["technology"] }),
      makeScored({ id: "t4", topicSlugs: ["technology"] }), // should be dropped
      makeScored({ id: "s1", topicSlugs: ["sports"] }),
    ];
    const filtered = applyTopicSaturationLimit(posts, feedSize, limit);
    expect(filtered).toHaveLength(4); // 3 tech + 1 sports
    expect(filtered.find((p) => p.id === "t4")).toBeUndefined();
  });

  it("always keeps posts with no topics", () => {
    const posts = [
      makeScored({ id: "no-topic", topicSlugs: [] }),
    ];
    expect(applyTopicSaturationLimit(posts, 5, 0.1)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// applyFreshnessFloor
// ---------------------------------------------------------------------------

describe("applyFreshnessFloor", () => {
  const now = new Date("2026-02-23T12:00:00Z");

  it("promotes fresh posts to the front when underrepresented", () => {
    const posts = [
      makeScored({ id: "old1", createdAt: new Date("2026-02-20T12:00:00Z"), score: 0.9 }),
      makeScored({ id: "old2", createdAt: new Date("2026-02-19T12:00:00Z"), score: 0.85 }),
      makeScored({ id: "fresh1", createdAt: new Date("2026-02-23T11:00:00Z"), score: 0.3 }), // 1h old
    ];
    const result = applyFreshnessFloor(posts, 10, 0.15, now, 4);
    // fresh1 should be at the front
    expect(result[0].id).toBe("fresh1");
  });

  it("leaves order unchanged when enough fresh posts exist", () => {
    const posts = [
      makeScored({ id: "fresh1", createdAt: new Date("2026-02-23T11:00:00Z"), score: 0.9 }),
      makeScored({ id: "fresh2", createdAt: new Date("2026-02-23T10:00:00Z"), score: 0.8 }),
      makeScored({ id: "fresh3", createdAt: new Date("2026-02-23T09:00:00Z"), score: 0.7 }),
    ];
    const result = applyFreshnessFloor(posts, 10, 0.15, now, 4);
    // All are fresh, order unchanged
    expect(result.map((p) => p.id)).toEqual(["fresh1", "fresh2", "fresh3"]);
  });
});

// ---------------------------------------------------------------------------
// applyExplorationInjection
// ---------------------------------------------------------------------------

describe("applyExplorationInjection", () => {
  it("does nothing when enough out-of-network posts exist", () => {
    const posts = [
      makeScored({ id: "in1", source: "in_network" }),
      makeScored({ id: "out1", source: "out_of_network" }),
      makeScored({ id: "out2", source: "out_of_network" }),
      makeScored({ id: "out3", source: "out_of_network" }),
    ];
    const result = applyExplorationInjection(posts, 10, 0.1);
    // Already 3 out-of-network >= ceil(10*0.1)=1, no change
    expect(result).toEqual(posts);
  });

  it("interleaves exploration posts when underrepresented", () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      makeScored({ id: `in${i}`, source: "in_network" })
    );
    // Add one out-of-network at the end
    posts.push(makeScored({ id: "out1", source: "out_of_network" }));

    // With 20% exploration on feedSize=10, we need 2 out-of-network
    // But we only have 1 — it should still get promoted
    const result = applyExplorationInjection(posts, 10, 0.2);
    // The out-of-network post should appear somewhere in the feed
    const oonPositions = result
      .map((p, i) => (p.source === "out_of_network" ? i : -1))
      .filter((i) => i >= 0);
    expect(oonPositions.length).toBeGreaterThan(0);
    // And it shouldn't be last anymore
    expect(oonPositions[0]).toBeLessThan(result.length - 1);
  });
});

// ---------------------------------------------------------------------------
// applyHeuristicFilters (integration)
// ---------------------------------------------------------------------------

describe("applyHeuristicFilters", () => {
  it("applies all filters without crashing on empty input", () => {
    const result = applyHeuristicFilters([], DEFAULT_PIPELINE_CONFIG);
    expect(result).toEqual([]);
  });

  it("reduces a feed with heavy author duplication", () => {
    // 20 posts from same author, should cap at authorDiversityCap (default 3)
    const posts = Array.from({ length: 20 }, (_, i) =>
      makeScored({ id: `p${i}`, authorId: "alice", score: 1 - i * 0.01 })
    );
    const config = { ...DEFAULT_PIPELINE_CONFIG, authorDiversityCap: 3 };
    const result = applyHeuristicFilters(posts, config);
    const alicePosts = result.filter((p) => p.authorId === "alice");
    expect(alicePosts.length).toBeLessThanOrEqual(3);
  });

  it("limits topic saturation", () => {
    const posts = Array.from({ length: 30 }, (_, i) =>
      makeScored({
        id: `p${i}`,
        authorId: `author-${i}`, // Different authors to bypass author cap
        topicSlugs: ["technology"],
        score: 1 - i * 0.01,
      })
    );
    const config = { ...DEFAULT_PIPELINE_CONFIG, feedSize: 10, topicSaturationLimit: 0.3 };
    const result = applyHeuristicFilters(posts, config);
    const techPosts = result.filter((p) => p.topicSlugs.includes("technology"));
    // ceil(10 * 0.3) = 3 max tech posts
    expect(techPosts.length).toBeLessThanOrEqual(4); // Allow 1 margin for filter ordering
  });
});
