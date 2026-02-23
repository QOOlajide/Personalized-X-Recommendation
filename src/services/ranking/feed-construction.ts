/**
 * Stage 4: Feed Construction
 *
 * Takes the filtered, scored candidates and assembles the final feed:
 *   1. Truncate to feedSize.
 *   2. Assign position indices.
 *   3. Build RankingExplanation records to persist for the
 *      "Why am I seeing this?" feature.
 *
 * This is the last stage — its output goes directly to the API response.
 */

import type { ScoredPost, FeedPost, PipelineConfig } from "./types";
import { DEFAULT_PIPELINE_CONFIG } from "./types";

// ---------------------------------------------------------------------------
// Explanation Builder
// ---------------------------------------------------------------------------

/**
 * Format ScoringFactors into a human-readable explanation object
 * suitable for both DB storage (RankingExplanation.factors JSON)
 * and the "Why am I seeing this?" UI card.
 *
 * Converts raw factor values into labeled percentages of the
 * total score for intuitive understanding.
 */
export function buildExplanation(post: ScoredPost): {
  totalScore: number;
  factors: Record<string, { value: number; percentage: number; label: string }>;
  primaryReason: string;
} {
  const f = post.factors;
  const raw: Record<string, { value: number; label: string }> = {
    recency: { value: f.recency, label: "Post freshness" },
    popularity: { value: f.popularity, label: "Engagement level" },
    networkBonus: { value: f.networkBonus, label: "You follow this author" },
    topicRelevance: { value: f.topicRelevance, label: "Matches your interests" },
    engagementVelocity: { value: f.engagementVelocity, label: "Trending signal" },
  };

  // Compute weighted contributions (same formula as combineFactors)
  // so percentages reflect actual impact, not raw factor values
  const sumRaw = Object.values(raw).reduce((sum, r) => sum + r.value, 0);

  const factors: Record<string, { value: number; percentage: number; label: string }> = {};
  for (const [key, { value, label }] of Object.entries(raw)) {
    const percentage = sumRaw > 0 ? Math.round((value / sumRaw) * 100) : 0;
    factors[key] = { value: Math.round(value * 1000) / 1000, percentage, label };
  }

  // Determine primary reason (highest contributing factor)
  const primaryReason =
    Object.entries(factors).sort((a, b) => b[1].percentage - a[1].percentage)[0]?.[1]?.label ??
    "General relevance";

  return {
    totalScore: Math.round(post.score * 10000) / 10000,
    factors,
    primaryReason,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a RankingExplanation-ready object for each feed post.
 * These are returned alongside the feed and optionally persisted
 * in the RankingExplanation table.
 */
export interface FeedExplanation {
  postId: string;
  userId: string;
  totalScore: number;
  factors: Record<string, { value: number; percentage: number; label: string }>;
  primaryReason: string;
}

/**
 * Construct the final feed from filtered, scored candidates.
 *
 * @param candidates - Output from Stage 3 (heuristic filtering).
 * @param userId - The requesting user's ID (for explanation records).
 * @param config - Pipeline configuration.
 * @returns Feed posts with positions and explanation records.
 */
export function constructFeed(
  candidates: ScoredPost[],
  userId: string,
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG
): { feed: FeedPost[]; explanations: FeedExplanation[] } {
  // Truncate to feed size
  const truncated = candidates.slice(0, config.feedSize);

  const feed: FeedPost[] = [];
  const explanations: FeedExplanation[] = [];

  for (let i = 0; i < truncated.length; i++) {
    const post = truncated[i];

    // Assign position
    const feedPost: FeedPost = { ...post, position: i };
    feed.push(feedPost);

    // Build explanation
    const explanation = buildExplanation(post);
    explanations.push({
      postId: post.id,
      userId,
      totalScore: explanation.totalScore,
      factors: explanation.factors,
      primaryReason: explanation.primaryReason,
    });
  }

  return { feed, explanations };
}
