/**
 * Tests for Stage 4: Feed Construction
 *
 * Verifies position assignment, explanation generation,
 * and feed truncation to feedSize.
 */

import { describe, it, expect } from "vitest";
import { constructFeed, buildExplanation } from "../feed-construction";
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
// buildExplanation
// ---------------------------------------------------------------------------

describe("buildExplanation", () => {
  it("returns totalScore from the scored post", () => {
    const post = makeScored({ score: 1.2345 });
    const explanation = buildExplanation(post);
    expect(explanation.totalScore).toBe(1.2345);
  });

  it("includes all five scoring factors", () => {
    const explanation = buildExplanation(makeScored());
    const keys = Object.keys(explanation.factors);
    expect(keys).toContain("recency");
    expect(keys).toContain("popularity");
    expect(keys).toContain("networkBonus");
    expect(keys).toContain("topicRelevance");
    expect(keys).toContain("engagementVelocity");
  });

  it("percentages sum to approximately 100", () => {
    const explanation = buildExplanation(makeScored());
    const totalPercent = Object.values(explanation.factors).reduce(
      (sum, f) => sum + f.percentage,
      0
    );
    // Rounding means it might be 99 or 101
    expect(totalPercent).toBeGreaterThanOrEqual(98);
    expect(totalPercent).toBeLessThanOrEqual(102);
  });

  it("identifies the primary reason correctly", () => {
    const post = makeScored({
      factors: {
        recency: 0.1,
        popularity: 0.1,
        networkBonus: 1.0, // highest
        topicRelevance: 0.1,
        engagementVelocity: 0.1,
      },
    });
    const explanation = buildExplanation(post);
    expect(explanation.primaryReason).toBe("You follow this author");
  });

  it("labels factors with human-readable descriptions", () => {
    const explanation = buildExplanation(makeScored());
    expect(explanation.factors.recency.label).toBe("Post freshness");
    expect(explanation.factors.topicRelevance.label).toBe("Matches your interests");
  });
});

// ---------------------------------------------------------------------------
// constructFeed
// ---------------------------------------------------------------------------

describe("constructFeed", () => {
  it("returns empty feed for empty input", () => {
    const { feed, explanations } = constructFeed([], "user-1");
    expect(feed).toEqual([]);
    expect(explanations).toEqual([]);
  });

  it("assigns 0-based position indices", () => {
    const posts = [
      makeScored({ id: "p1", score: 0.9 }),
      makeScored({ id: "p2", score: 0.8 }),
      makeScored({ id: "p3", score: 0.7 }),
    ];
    const { feed } = constructFeed(posts, "user-1");
    expect(feed[0].position).toBe(0);
    expect(feed[1].position).toBe(1);
    expect(feed[2].position).toBe(2);
  });

  it("truncates feed to config.feedSize", () => {
    const posts = Array.from({ length: 100 }, (_, i) =>
      makeScored({ id: `p${i}`, score: 1 - i * 0.01 })
    );
    const config = { ...DEFAULT_PIPELINE_CONFIG, feedSize: 10 };
    const { feed } = constructFeed(posts, "user-1", config);
    expect(feed).toHaveLength(10);
  });

  it("creates one explanation per feed post", () => {
    const posts = [makeScored({ id: "p1" }), makeScored({ id: "p2" })];
    const { feed, explanations } = constructFeed(posts, "user-1");
    expect(explanations).toHaveLength(feed.length);
  });

  it("sets correct userId on explanations", () => {
    const posts = [makeScored({ id: "p1" })];
    const { explanations } = constructFeed(posts, "viewer-42");
    expect(explanations[0].userId).toBe("viewer-42");
  });

  it("sets correct postId on explanations", () => {
    const posts = [makeScored({ id: "abc-123" })];
    const { explanations } = constructFeed(posts, "user-1");
    expect(explanations[0].postId).toBe("abc-123");
  });
});
