/**
 * Unit tests for engagement seeding algorithm.
 *
 * Tests the pure engagement probability logic and the buildEngagement
 * graph builder. No DB calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  engagementProbability,
  buildEngagement,
  type PostForEngagement,
  type PersonaForEngagement,
} from "../engagement";

describe("engagementProbability", () => {
  it("is higher when persona topics overlap with post topics", () => {
    const personaTopics = new Set(["ai-ml", "technology"]);
    const matchingPost = ["ai-ml", "technology"];
    const unrelatedPost = ["sports", "music"];

    const probMatch = engagementProbability(personaTopics, matchingPost, false);
    const probMiss = engagementProbability(personaTopics, unrelatedPost, false);

    expect(probMatch).toBeGreaterThan(probMiss);
  });

  it("gives a boost to posts from followed authors", () => {
    const personaTopics = new Set(["ai-ml"]);
    const postTopics = ["ai-ml"];

    const probFollowing = engagementProbability(personaTopics, postTopics, true);
    const probNotFollowing = engagementProbability(personaTopics, postTopics, false);

    expect(probFollowing).toBeGreaterThan(probNotFollowing);
  });

  it("returns a small base probability even with no overlap and no follow", () => {
    const personaTopics = new Set(["ai-ml"]);
    const postTopics = ["sports"];

    const prob = engagementProbability(personaTopics, postTopics, false);
    expect(prob).toBeGreaterThan(0);
    expect(prob).toBeLessThan(0.1); // Should be low
  });

  it("handles empty post topics", () => {
    const personaTopics = new Set(["ai-ml"]);
    const prob = engagementProbability(personaTopics, [], false);
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
  });

  it("never returns negative or greater than 1", () => {
    const personaTopics = new Set(["ai-ml", "technology", "startups-business"]);
    const postTopics = ["ai-ml", "technology", "startups-business"];

    const prob = engagementProbability(personaTopics, postTopics, true);
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
  });
});

describe("buildEngagement", () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Low random value means most engagement checks pass
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it("never generates self-engagement (liking/reposting own posts)", () => {
    const personas: PersonaForEngagement[] = [
      { id: "user1", interests: ["AI"] },
      { id: "user2", interests: ["AI"] },
    ];
    const posts: PostForEngagement[] = [
      { id: "post1", authorId: "user1", topicSlugs: ["ai-ml"] },
      { id: "post2", authorId: "user2", topicSlugs: ["ai-ml"] },
    ];
    const followSet = new Set<string>();

    const { likes, reposts } = buildEngagement(personas, posts, followSet);

    for (const like of likes) {
      const post = posts.find((p) => p.id === like.postId)!;
      expect(like.userId).not.toBe(post.authorId);
    }
    for (const repost of reposts) {
      const post = posts.find((p) => p.id === repost.postId)!;
      expect(repost.userId).not.toBe(post.authorId);
    }
  });

  it("generates fewer reposts than likes", () => {
    // With low random value, most engagements fire
    const personas: PersonaForEngagement[] = Array.from({ length: 5 }, (_, i) => ({
      id: `user${i}`,
      interests: ["AI"],
    }));
    const posts: PostForEngagement[] = Array.from({ length: 10 }, (_, i) => ({
      id: `post${i}`,
      authorId: `user${i % 5}`,
      topicSlugs: ["ai-ml"],
    }));
    const followSet = new Set<string>();

    const { likes, reposts } = buildEngagement(personas, posts, followSet);

    // Reposts should be a subset of likes (only likers can repost)
    expect(reposts.length).toBeLessThanOrEqual(likes.length);
  });

  it("returns empty results for empty inputs", () => {
    const { likes, reposts } = buildEngagement([], [], new Set());
    expect(likes).toEqual([]);
    expect(reposts).toEqual([]);
  });
});
