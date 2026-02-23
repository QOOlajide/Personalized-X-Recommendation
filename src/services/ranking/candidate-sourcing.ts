/**
 * Stage 1: Candidate Sourcing
 *
 * Pulls ~maxCandidates posts from two pools:
 *   1. In-network — recent posts from users the viewer follows.
 *   2. Out-of-network — posts matching the viewer's topic interests
 *      from users they *don't* follow (discovery).
 *
 * The split between in-network and out-of-network is driven by
 * the user's `networkWeight` preference:
 *   - networkWeight = 1.0 → 100% in-network (friends only)
 *   - networkWeight = 0.0 → 100% out-of-network (pure discovery)
 *   - networkWeight = 0.5 → 50/50 split (default)
 *
 * No scoring happens here — that's Stage 2. This stage simply
 * gathers the raw candidates for the scorer to rank.
 */

import { db } from "../../lib/db";
import type {
  CandidatePost,
  RankingContext,
  PipelineConfig,
} from "./types";
import { DEFAULT_PIPELINE_CONFIG } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a raw Prisma post (with joined postTopics) into a CandidatePost.
 */
function toCandidate(
  raw: {
    id: string;
    content: string;
    authorId: string;
    createdAt: Date;
    likeCount: number;
    repostCount: number;
    replyCount: number;
    viewCount: number;
    parentId: string | null;
    quotedPostId: string | null;
    postTopics: { topic: { slug: string } }[];
  },
  source: "in_network" | "out_of_network"
): CandidatePost {
  return {
    id: raw.id,
    content: raw.content,
    authorId: raw.authorId,
    createdAt: raw.createdAt,
    likeCount: raw.likeCount,
    repostCount: raw.repostCount,
    replyCount: raw.replyCount,
    viewCount: raw.viewCount,
    parentId: raw.parentId,
    quotedPostId: raw.quotedPostId,
    topicSlugs: raw.postTopics.map((pt) => pt.topic.slug),
    source,
  };
}

/** Shared select clause for post queries. */
const POST_SELECT = {
  id: true,
  content: true,
  authorId: true,
  createdAt: true,
  likeCount: true,
  repostCount: true,
  replyCount: true,
  viewCount: true,
  parentId: true,
  quotedPostId: true,
  postTopics: {
    select: { topic: { select: { slug: true } } },
  },
} as const;

// ---------------------------------------------------------------------------
// In-Network Sourcing
// ---------------------------------------------------------------------------

/**
 * Fetch recent posts from users the viewer follows.
 *
 * Ordered by recency. Only pulls top-level posts and quote tweets
 * (not replies) — replies surface through thread views, not the feed.
 */
async function sourceInNetwork(
  ctx: RankingContext,
  limit: number
): Promise<CandidatePost[]> {
  if (ctx.followingIds.size === 0) return [];

  const posts = await db.post.findMany({
    where: {
      authorId: { in: [...ctx.followingIds] },
      parentId: null, // Exclude replies — they surface in thread views
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: POST_SELECT,
  });

  return posts.map((p) => toCandidate(p, "in_network"));
}

// ---------------------------------------------------------------------------
// Out-of-Network Sourcing (Discovery)
// ---------------------------------------------------------------------------

/**
 * Fetch posts from users the viewer does NOT follow,
 * filtered to topics the viewer has interest in.
 *
 * This is the "discovery" pool — surfaces content from outside
 * the user's follow graph based on topic relevance.
 */
async function sourceOutOfNetwork(
  ctx: RankingContext,
  limit: number
): Promise<CandidatePost[]> {
  // Get topic slugs the user cares about (weight > 0.1)
  const interestedSlugs = Object.entries(ctx.topicWeights)
    .filter(([, weight]) => weight > 0.1)
    .map(([slug]) => slug);

  // If user has no topic preferences, fall back to most recent posts
  const topicFilter =
    interestedSlugs.length > 0
      ? { postTopics: { some: { topic: { slug: { in: interestedSlugs } } } } }
      : {};

  const posts = await db.post.findMany({
    where: {
      authorId: { notIn: [ctx.userId, ...ctx.followingIds] },
      parentId: null, // Top-level posts only
      ...topicFilter,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: POST_SELECT,
  });

  return posts.map((p) => toCandidate(p, "out_of_network"));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Source candidate posts for the ranking pipeline.
 *
 * Splits the candidate pool between in-network and out-of-network
 * based on the user's networkWeight preference.
 *
 * @returns Deduplicated array of CandidatePost, up to config.maxCandidates.
 */
export async function sourceCandidates(
  ctx: RankingContext,
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG
): Promise<CandidatePost[]> {
  const { maxCandidates } = config;

  // Split budget by networkWeight
  const inNetworkBudget = Math.round(maxCandidates * ctx.preferences.networkWeight);
  const outOfNetworkBudget = maxCandidates - inNetworkBudget;

  // Fetch both pools in parallel
  const [inNetwork, outOfNetwork] = await Promise.all([
    sourceInNetwork(ctx, inNetworkBudget),
    sourceOutOfNetwork(ctx, outOfNetworkBudget),
  ]);

  // Deduplicate (a post could theoretically appear in both pools
  // if the user follows someone who also matches topic filters)
  const seen = new Set<string>();
  const candidates: CandidatePost[] = [];

  for (const post of [...inNetwork, ...outOfNetwork]) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      candidates.push(post);
    }
  }

  return candidates.slice(0, maxCandidates);
}
