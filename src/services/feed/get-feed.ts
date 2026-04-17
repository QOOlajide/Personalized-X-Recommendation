/**
 * Feed data-access layer.
 *
 * Orchestrates the ranking pipeline and enriches results with author
 * data for display. This is the single function the feed page calls —
 * it owns the boundary between "ranking engine output" and "UI-ready data."
 */

import { db } from "../../lib/db";
import { generateFeed } from "../ranking";
import type { FeedResult } from "../ranking";
import type { FeedPost, ScoringFactors } from "../ranking/types";

// ---------------------------------------------------------------------------
// Public types — what the feed page receives
// ---------------------------------------------------------------------------

export interface FeedAuthor {
  id: string;
  name: string;
  handle: string;
  image: string | null;
}

export interface FeedItem {
  id: string;
  content: string;
  createdAt: Date;
  author: FeedAuthor;

  likeCount: number;
  repostCount: number;
  replyCount: number;
  viewCount: number;

  parentId: string | null;
  quotedPostId: string | null;
  topicSlugs: string[];
  source: "in_network" | "out_of_network";

  score: number;
  position: number;
  factors: ScoringFactors;
  primaryReason: string;
}

export interface FeedResponse {
  items: FeedItem[];
  meta: FeedResult["meta"];
}

// ---------------------------------------------------------------------------
// Author enrichment
// ---------------------------------------------------------------------------

/**
 * Batch-fetch author data for a set of posts.
 * Returns a Map keyed by userId for O(1) lookup per post.
 */
async function fetchAuthors(
  authorIds: string[]
): Promise<Map<string, FeedAuthor>> {
  if (authorIds.length === 0) return new Map();

  const unique = [...new Set(authorIds)];

  const users = await db.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, handle: true, image: true },
  });

  const map = new Map<string, FeedAuthor>();
  for (const u of users) {
    map.set(u.id, { id: u.id, name: u.name, handle: u.handle, image: u.image });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Assemble feed items
// ---------------------------------------------------------------------------

function toFeedItem(
  post: FeedPost,
  author: FeedAuthor,
  primaryReason: string
): FeedItem {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    author,

    likeCount: post.likeCount,
    repostCount: post.repostCount,
    replyCount: post.replyCount,
    viewCount: post.viewCount,

    parentId: post.parentId,
    quotedPostId: post.quotedPostId,
    topicSlugs: post.topicSlugs,
    source: post.source,

    score: post.score,
    position: post.position,
    factors: post.factors,
    primaryReason,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const UNKNOWN_AUTHOR: FeedAuthor = {
  id: "unknown",
  name: "Unknown",
  handle: "unknown",
  image: null,
};

/**
 * Generate a personalized feed for the authenticated user.
 *
 * 1. Runs the 4-stage ranking pipeline via `generateFeed`.
 * 2. Batch-fetches author profiles for all posts in the result.
 * 3. Merges ranking explanations with post + author data.
 *
 * Returns UI-ready `FeedItem[]` or an empty array if the pipeline
 * produces no results (e.g., no posts in the database yet).
 */
export async function getFeedForUser(userId: string): Promise<FeedResponse> {
  const result = await generateFeed(userId);

  if (result.feed.length === 0) {
    return { items: [], meta: result.meta };
  }

  const authorIds = result.feed.map((p) => p.authorId);
  const authors = await fetchAuthors(authorIds);

  const explanationMap = new Map(
    result.explanations.map((e) => [e.postId, e])
  );

  const items = result.feed.map((post) => {
    const author = authors.get(post.authorId) ?? UNKNOWN_AUTHOR;
    const explanation = explanationMap.get(post.id);
    const primaryReason = explanation?.primaryReason ?? "General relevance";
    return toFeedItem(post, author, primaryReason);
  });

  return { items, meta: result.meta };
}
