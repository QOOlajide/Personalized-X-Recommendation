/**
 * Tests for the feed data-access layer (get-feed.ts).
 *
 * Mocks the ranking pipeline and database to test:
 *   - Author enrichment (batch fetch + mapping)
 *   - Feed item assembly (merging post + author + explanation)
 *   - Empty feed handling
 *   - Missing author fallback
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the ranking pipeline before importing the module under test
vi.mock("../../ranking", () => ({
  generateFeed: vi.fn(),
}));

// Mock the database client
vi.mock("../../../lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { getFeedForUser } from "../get-feed";
import { generateFeed } from "../../ranking";
import { db } from "../../../lib/db";
import type { FeedResult } from "../../ranking";
import type { ScoringFactors, FeedPost } from "../../ranking/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FACTORS: ScoringFactors = {
  recency: 0.9,
  popularity: 0.6,
  networkBonus: 1.0,
  topicRelevance: 0.7,
  engagementVelocity: 0.3,
};

function makeFeedPost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: "post-1",
    content: "Hello world",
    authorId: "author-1",
    createdAt: new Date("2026-04-16T10:00:00Z"),
    likeCount: 10,
    repostCount: 2,
    replyCount: 3,
    viewCount: 100,
    parentId: null,
    quotedPostId: null,
    topicSlugs: ["technology"],
    source: "in_network",
    score: 0.85,
    factors: FACTORS,
    position: 0,
    ...overrides,
  };
}

function makeFeedResult(posts: FeedPost[]): FeedResult {
  return {
    feed: posts,
    explanations: posts.map((p) => ({
      postId: p.id,
      userId: "viewer-1",
      totalScore: p.score,
      factors: {},
      primaryReason: "You follow this author",
    })),
    meta: {
      candidatesSourced: 100,
      candidatesAfterFiltering: 50,
      feedSize: posts.length,
      pipelineMs: 42,
    },
  };
}

const mockedGenerateFeed = vi.mocked(generateFeed);
const mockedFindMany = vi.mocked(db.user.findMany);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFeedForUser", () => {
  it("returns empty items when the pipeline produces no posts", async () => {
    mockedGenerateFeed.mockResolvedValue(makeFeedResult([]));

    const response = await getFeedForUser("viewer-1");

    expect(response.items).toEqual([]);
    expect(response.meta.feedSize).toBe(0);
    // Should NOT query for authors when feed is empty
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("enriches posts with author data from the database", async () => {
    const post = makeFeedPost({ id: "p1", authorId: "a1" });
    mockedGenerateFeed.mockResolvedValue(makeFeedResult([post]));
    mockedFindMany.mockResolvedValue([
      { id: "a1", name: "Ada Lovelace", handle: "ada", image: "https://img.example.com/ada.jpg" },
    ] as any);

    const response = await getFeedForUser("viewer-1");

    expect(response.items).toHaveLength(1);
    expect(response.items[0].author).toEqual({
      id: "a1",
      name: "Ada Lovelace",
      handle: "ada",
      image: "https://img.example.com/ada.jpg",
    });
  });

  it("deduplicates author IDs before querying", async () => {
    const posts = [
      makeFeedPost({ id: "p1", authorId: "a1", position: 0 }),
      makeFeedPost({ id: "p2", authorId: "a1", position: 1 }),
      makeFeedPost({ id: "p3", authorId: "a2", position: 2 }),
    ];
    mockedGenerateFeed.mockResolvedValue(makeFeedResult(posts));
    mockedFindMany.mockResolvedValue([
      { id: "a1", name: "Author One", handle: "one", image: null },
      { id: "a2", name: "Author Two", handle: "two", image: null },
    ] as any);

    await getFeedForUser("viewer-1");

    // Should query with deduplicated IDs
    const whereArg = mockedFindMany.mock.calls[0][0]?.where;
    const queriedIds = (whereArg as any).id.in;
    expect(queriedIds).toHaveLength(2);
    expect(queriedIds).toContain("a1");
    expect(queriedIds).toContain("a2");
  });

  it("falls back to unknown author when author is not in the database", async () => {
    const post = makeFeedPost({ id: "p1", authorId: "deleted-user" });
    mockedGenerateFeed.mockResolvedValue(makeFeedResult([post]));
    mockedFindMany.mockResolvedValue([] as any);

    const response = await getFeedForUser("viewer-1");

    expect(response.items[0].author).toEqual({
      id: "unknown",
      name: "Unknown",
      handle: "unknown",
      image: null,
    });
  });

  it("maps primaryReason from ranking explanations", async () => {
    const post = makeFeedPost({ id: "p1", authorId: "a1" });
    mockedGenerateFeed.mockResolvedValue(makeFeedResult([post]));
    mockedFindMany.mockResolvedValue([
      { id: "a1", name: "Test", handle: "test", image: null },
    ] as any);

    const response = await getFeedForUser("viewer-1");

    expect(response.items[0].primaryReason).toBe("You follow this author");
  });

  it("preserves ranking metadata in the response", async () => {
    const post = makeFeedPost({ score: 0.92, position: 0 });
    mockedGenerateFeed.mockResolvedValue(makeFeedResult([post]));
    mockedFindMany.mockResolvedValue([
      { id: "author-1", name: "Test", handle: "test", image: null },
    ] as any);

    const response = await getFeedForUser("viewer-1");

    expect(response.items[0].score).toBe(0.92);
    expect(response.items[0].position).toBe(0);
    expect(response.items[0].factors).toEqual(FACTORS);
    expect(response.meta.candidatesSourced).toBe(100);
    expect(response.meta.pipelineMs).toBe(42);
  });

  it("preserves post content fields in the feed items", async () => {
    const post = makeFeedPost({
      id: "p1",
      content: "Real tweet content",
      likeCount: 42,
      repostCount: 7,
      replyCount: 3,
      viewCount: 500,
      topicSlugs: ["ai-ml", "startups"],
      source: "out_of_network",
    });
    mockedGenerateFeed.mockResolvedValue(makeFeedResult([post]));
    mockedFindMany.mockResolvedValue([
      { id: "author-1", name: "Test", handle: "test", image: null },
    ] as any);

    const response = await getFeedForUser("viewer-1");
    const item = response.items[0];

    expect(item.content).toBe("Real tweet content");
    expect(item.likeCount).toBe(42);
    expect(item.repostCount).toBe(7);
    expect(item.topicSlugs).toEqual(["ai-ml", "startups"]);
    expect(item.source).toBe("out_of_network");
  });
});
