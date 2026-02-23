/**
 * Tests for Stage 2: Scoring
 *
 * Each factor calculator is tested in isolation, then the full
 * scoreCandidates function is tested for correct sorting and
 * preference responsiveness.
 */

import { describe, it, expect } from "vitest";
import {
  computeRecency,
  computePopularity,
  computeNetworkBonus,
  computeTopicRelevance,
  computeEngagementVelocity,
  combineFactors,
  scoreCandidates,
} from "../scoring";
import type { CandidatePost, RankingContext, ScoringFactors } from "../types";
import { DEFAULT_PIPELINE_CONFIG, DEFAULT_PREFERENCES } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(overrides: Partial<CandidatePost> = {}): CandidatePost {
  return {
    id: "post-1",
    content: "Hello world",
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
    ...overrides,
  };
}

function makeContext(overrides: Partial<RankingContext> = {}): RankingContext {
  return {
    userId: "user-1",
    preferences: DEFAULT_PREFERENCES,
    topicWeights: { technology: 0.8, "ai-ml": 0.9 },
    followingIds: new Set(["author-1"]),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeRecency
// ---------------------------------------------------------------------------

describe("computeRecency", () => {
  const halfLife = 24; // hours

  it("returns ~1.0 for a brand-new post", () => {
    const now = new Date("2026-02-23T12:00:00Z");
    const createdAt = new Date("2026-02-23T12:00:00Z");
    expect(computeRecency(createdAt, now, halfLife)).toBeCloseTo(1.0, 2);
  });

  it("returns ~0.5 for a post exactly one half-life old", () => {
    const now = new Date("2026-02-23T12:00:00Z");
    const createdAt = new Date("2026-02-22T12:00:00Z"); // 24h ago
    expect(computeRecency(createdAt, now, halfLife)).toBeCloseTo(0.5, 2);
  });

  it("returns ~0.25 for a post two half-lives old", () => {
    const now = new Date("2026-02-23T12:00:00Z");
    const createdAt = new Date("2026-02-21T12:00:00Z"); // 48h ago
    expect(computeRecency(createdAt, now, halfLife)).toBeCloseTo(0.25, 2);
  });

  it("returns >0.9 for a post 2 hours old with 24h half-life", () => {
    const now = new Date("2026-02-23T12:00:00Z");
    const createdAt = new Date("2026-02-23T10:00:00Z"); // 2h ago
    expect(computeRecency(createdAt, now, halfLife)).toBeGreaterThan(0.9);
  });

  it("never returns negative", () => {
    const now = new Date("2026-02-23T12:00:00Z");
    const createdAt = new Date("2025-01-01T00:00:00Z"); // very old
    expect(computeRecency(createdAt, now, halfLife)).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// computePopularity
// ---------------------------------------------------------------------------

describe("computePopularity", () => {
  it("returns 0 when maxEngagement is 0", () => {
    expect(computePopularity({ likeCount: 0, repostCount: 0, replyCount: 0 }, 0)).toBe(0);
  });

  it("returns 1.0 for the most popular post", () => {
    // likeCount=100, repostCount=20, replyCount=10 → total = 100 + 40 + 15 = 155
    const score = computePopularity({ likeCount: 100, repostCount: 20, replyCount: 10 }, 155);
    expect(score).toBeCloseTo(1.0, 1);
  });

  it("returns < 1.0 for a post with less engagement than max", () => {
    const score = computePopularity({ likeCount: 5, repostCount: 0, replyCount: 0 }, 155);
    expect(score).toBeLessThan(1.0);
    expect(score).toBeGreaterThan(0);
  });

  it("uses log scaling to prevent mega-viral post domination", () => {
    // A post with 10x engagement shouldn't score 10x higher
    const low = computePopularity({ likeCount: 10, repostCount: 0, replyCount: 0 }, 1000);
    const high = computePopularity({ likeCount: 100, repostCount: 0, replyCount: 0 }, 1000);
    expect(high / low).toBeLessThan(3); // Log scaling compresses the ratio
  });
});

// ---------------------------------------------------------------------------
// computeNetworkBonus
// ---------------------------------------------------------------------------

describe("computeNetworkBonus", () => {
  it("returns 1.0 if author is followed", () => {
    expect(computeNetworkBonus("alice", new Set(["alice", "bob"]))).toBe(1.0);
  });

  it("returns 0.0 if author is not followed", () => {
    expect(computeNetworkBonus("charlie", new Set(["alice", "bob"]))).toBe(0.0);
  });

  it("returns 0.0 for empty follow set", () => {
    expect(computeNetworkBonus("alice", new Set())).toBe(0.0);
  });
});

// ---------------------------------------------------------------------------
// computeTopicRelevance
// ---------------------------------------------------------------------------

describe("computeTopicRelevance", () => {
  it("returns 0.5 (neutral) for posts with no topics", () => {
    expect(computeTopicRelevance([], { technology: 0.9 })).toBe(0.5);
  });

  it("returns the user's weight for a single-topic post", () => {
    expect(computeTopicRelevance(["technology"], { technology: 0.9 })).toBe(0.9);
  });

  it("averages weights for multi-topic posts", () => {
    const score = computeTopicRelevance(["technology", "ai-ml"], { technology: 0.8, "ai-ml": 1.0 });
    expect(score).toBeCloseTo(0.9, 2);
  });

  it("defaults to 0.5 for topics without user weight", () => {
    const score = computeTopicRelevance(["unknown-topic"], { technology: 0.9 });
    expect(score).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// computeEngagementVelocity
// ---------------------------------------------------------------------------

describe("computeEngagementVelocity", () => {
  it("returns 0 for posts with no engagement", () => {
    const post = { likeCount: 0, repostCount: 0, replyCount: 0, createdAt: new Date() };
    expect(computeEngagementVelocity(post, new Date())).toBe(0);
  });

  it("returns higher score for faster engagement accumulation", () => {
    const now = new Date("2026-02-23T12:00:00Z");
    const fast = {
      likeCount: 50, repostCount: 10, replyCount: 5,
      createdAt: new Date("2026-02-23T11:00:00Z"), // 1h ago
    };
    const slow = {
      likeCount: 50, repostCount: 10, replyCount: 5,
      createdAt: new Date("2026-02-22T12:00:00Z"), // 24h ago
    };
    expect(computeEngagementVelocity(fast, now)).toBeGreaterThan(
      computeEngagementVelocity(slow, now)
    );
  });

  it("returns a value between 0 and 1", () => {
    const post = {
      likeCount: 1000, repostCount: 500, replyCount: 200,
      createdAt: new Date("2026-02-23T11:30:00Z"),
    };
    const score = computeEngagementVelocity(post, new Date("2026-02-23T12:00:00Z"));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// combineFactors
// ---------------------------------------------------------------------------

describe("combineFactors", () => {
  const factors: ScoringFactors = {
    recency: 0.8,
    popularity: 0.6,
    networkBonus: 1.0,
    topicRelevance: 0.7,
    engagementVelocity: 0.3,
  };

  it("weights factors according to user preferences", () => {
    const prefs = { recencyWeight: 1.0, popularityWeight: 0.0, networkWeight: 0.0, diversityWeight: 0.5 };
    const score = combineFactors(factors, prefs);
    // recency=0.8*1.0 + popularity=0.6*0.0 + network=1.0*0.0 + topic=0.7*(1-0.5) + velocity=0.3*0.15
    expect(score).toBeCloseTo(0.8 + 0 + 0 + 0.35 + 0.045, 2);
  });

  it("high diversity weight reduces topic relevance impact", () => {
    const lowDiv = combineFactors(factors, { ...DEFAULT_PREFERENCES, diversityWeight: 0.0 });
    const highDiv = combineFactors(factors, { ...DEFAULT_PREFERENCES, diversityWeight: 1.0 });
    // topicRelevance contributes (1-diversity)*0.7
    // At diversity=0: contributes 0.7; at diversity=1: contributes 0
    expect(lowDiv).toBeGreaterThan(highDiv);
  });
});

// ---------------------------------------------------------------------------
// scoreCandidates (integration)
// ---------------------------------------------------------------------------

describe("scoreCandidates", () => {
  const now = new Date("2026-02-23T12:00:00Z");

  it("returns empty array for empty input", () => {
    expect(scoreCandidates([], makeContext(), DEFAULT_PIPELINE_CONFIG, now)).toEqual([]);
  });

  it("sorts posts by score descending", () => {
    const posts = [
      makePost({ id: "low", likeCount: 1, createdAt: new Date("2026-02-20T12:00:00Z") }),
      makePost({ id: "high", likeCount: 100, createdAt: new Date("2026-02-23T11:00:00Z") }),
      makePost({ id: "mid", likeCount: 20, createdAt: new Date("2026-02-22T12:00:00Z") }),
    ];
    const scored = scoreCandidates(posts, makeContext(), DEFAULT_PIPELINE_CONFIG, now);
    expect(scored[0].id).toBe("high");
    expect(scored[scored.length - 1].id).toBe("low");
  });

  it("attaches ScoringFactors to each post", () => {
    const posts = [makePost()];
    const scored = scoreCandidates(posts, makeContext(), DEFAULT_PIPELINE_CONFIG, now);
    expect(scored[0].factors).toHaveProperty("recency");
    expect(scored[0].factors).toHaveProperty("popularity");
    expect(scored[0].factors).toHaveProperty("networkBonus");
    expect(scored[0].factors).toHaveProperty("topicRelevance");
    expect(scored[0].factors).toHaveProperty("engagementVelocity");
  });

  it("responds to preference changes — high recency preference boosts recent posts", () => {
    const old = makePost({ id: "old", createdAt: new Date("2026-02-20T12:00:00Z"), likeCount: 100 });
    const recent = makePost({ id: "recent", createdAt: new Date("2026-02-23T11:00:00Z"), likeCount: 5 });
    const posts = [old, recent];

    // High recency, low popularity → recent should win
    const ctx = makeContext({
      preferences: { recencyWeight: 1.0, popularityWeight: 0.0, networkWeight: 0.5, diversityWeight: 0.5 },
    });
    const scored = scoreCandidates(posts, ctx, DEFAULT_PIPELINE_CONFIG, now);
    expect(scored[0].id).toBe("recent");
  });

  it("responds to preference changes — high popularity preference boosts popular posts", () => {
    const old = makePost({ id: "popular", createdAt: new Date("2026-02-21T12:00:00Z"), likeCount: 200 });
    const recent = makePost({ id: "fresh", createdAt: new Date("2026-02-23T11:00:00Z"), likeCount: 1 });
    const posts = [old, recent];

    // High popularity, low recency → popular should win
    const ctx = makeContext({
      preferences: { recencyWeight: 0.0, popularityWeight: 1.0, networkWeight: 0.0, diversityWeight: 0.5 },
    });
    const scored = scoreCandidates(posts, ctx, DEFAULT_PIPELINE_CONFIG, now);
    expect(scored[0].id).toBe("popular");
  });
});
