/**
 * Stage 2: Scoring
 *
 * Assigns a numerical score to each candidate post based on:
 *   - Recency (exponential time decay)
 *   - Popularity (normalized engagement signals)
 *   - Network bonus (is author followed?)
 *   - Topic relevance (overlap with user's topic weights)
 *   - Engagement velocity (recent engagement rate)
 *
 * Each factor produces a value in [0.0, 1.0]. The final score
 * is a weighted combination using the user's AlgorithmPreference
 * weights (recencyWeight, popularityWeight, networkWeight, diversityWeight).
 *
 * All factors are exposed in ScoringFactors for the "Why am I seeing this?"
 * explainability feature.
 */

import type {
  CandidatePost,
  ScoredPost,
  ScoringFactors,
  RankingContext,
  PipelineConfig,
} from "./types";
import { DEFAULT_PIPELINE_CONFIG } from "./types";

// ---------------------------------------------------------------------------
// Factor Calculators (pure functions — easy to test in isolation)
// ---------------------------------------------------------------------------

/**
 * Exponential recency decay.
 *
 * Score = 0.5^(ageHours / halfLifeHours)
 *
 * A post exactly `halfLifeHours` old scores 0.5.
 * A brand-new post scores ~1.0.
 * A post 3× the half-life old scores ~0.125.
 *
 * @param createdAt - Post creation timestamp.
 * @param now - Current time (injectable for testing).
 * @param halfLifeHours - Time in hours for score to halve.
 */
export function computeRecency(
  createdAt: Date,
  now: Date,
  halfLifeHours: number
): number {
  const ageMs = now.getTime() - createdAt.getTime();
  const ageHours = Math.max(0, ageMs / (1000 * 60 * 60));
  return Math.pow(0.5, ageHours / halfLifeHours);
}

/**
 * Normalized popularity score based on engagement counts.
 *
 * Uses a log-scaled formula to prevent mega-viral posts from
 * completely dominating:
 *   score = log(1 + totalEngagement) / log(1 + maxEngagement)
 *
 * @param post - The candidate post with engagement counts.
 * @param maxEngagement - The highest total engagement across all candidates.
 */
export function computePopularity(
  post: Pick<CandidatePost, "likeCount" | "repostCount" | "replyCount">,
  maxEngagement: number
): number {
  const total = post.likeCount + post.repostCount * 2 + post.replyCount * 1.5;
  if (maxEngagement <= 0) return 0;
  return Math.log(1 + total) / Math.log(1 + maxEngagement);
}

/**
 * Binary network bonus.
 * 1.0 if the author is in the viewer's follow graph, 0.0 otherwise.
 */
export function computeNetworkBonus(
  authorId: string,
  followingIds: Set<string>
): number {
  return followingIds.has(authorId) ? 1.0 : 0.0;
}

/**
 * Topic relevance: weighted overlap between a post's topics
 * and the user's topic preference weights.
 *
 * For each of the post's topic slugs, look up the user's weight
 * for that topic (default 0.5 if not set). Average the weights.
 *
 * @returns Value in [0.0, 1.0].
 */
export function computeTopicRelevance(
  postTopicSlugs: string[],
  userTopicWeights: Record<string, number>
): number {
  if (postTopicSlugs.length === 0) return 0.5; // No topics = neutral

  let total = 0;
  for (const slug of postTopicSlugs) {
    total += userTopicWeights[slug] ?? 0.5; // Default neutral weight
  }
  return total / postTopicSlugs.length;
}

/**
 * Engagement velocity — how quickly engagement accumulated
 * relative to the post's age.
 *
 * A post with 100 likes in 1 hour is more "hot" than 100 likes in 24 hours.
 * Normalized to [0, 1] using a sigmoid-like curve.
 *
 * velocity = totalEngagement / max(ageHours, 0.1)
 * score = 1 - 1 / (1 + velocity / 10)
 *
 * The /10 divisor controls sensitivity — tune based on network scale.
 */
export function computeEngagementVelocity(
  post: Pick<CandidatePost, "likeCount" | "repostCount" | "replyCount" | "createdAt">,
  now: Date
): number {
  const total = post.likeCount + post.repostCount + post.replyCount;
  const ageHours = Math.max(0.1, (now.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60));
  const velocity = total / ageHours;

  // Sigmoid-like normalization: maps velocity → [0, 1)
  return 1 - 1 / (1 + velocity / 10);
}

// ---------------------------------------------------------------------------
// Score Combiner
// ---------------------------------------------------------------------------

/**
 * Combine individual factors into a final score using user preferences.
 *
 * The formula:
 *   score = recencyWeight × recency
 *         + popularityWeight × popularity
 *         + networkWeight × networkBonus
 *         + (1 - diversityWeight) × topicRelevance  ← high diversity DEprioritizes topic match
 *         + 0.15 × engagementVelocity               ← fixed weight (trending signal)
 *
 * The diversityWeight inverts topic relevance: at high diversity, the algorithm
 * cares LESS about matching the user's exact interests, surfacing more variety.
 *
 * All weights are [0, 1], so the raw sum can exceed 1. That's fine —
 * we only care about relative ordering, not absolute values.
 */
export function combineFactors(
  factors: ScoringFactors,
  preferences: { recencyWeight: number; popularityWeight: number; networkWeight: number; diversityWeight: number }
): number {
  return (
    preferences.recencyWeight * factors.recency +
    preferences.popularityWeight * factors.popularity +
    preferences.networkWeight * factors.networkBonus +
    (1 - preferences.diversityWeight) * factors.topicRelevance +
    0.15 * factors.engagementVelocity
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score all candidate posts.
 *
 * Computes factors for each candidate and combines them into a
 * final score. Returns posts sorted by score descending.
 *
 * @param candidates - Output from Stage 1 (candidate sourcing).
 * @param ctx - Ranking context (user preferences, follows, topic weights).
 * @param config - Pipeline configuration.
 * @param now - Current time (injectable for deterministic testing).
 */
export function scoreCandidates(
  candidates: CandidatePost[],
  ctx: RankingContext,
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
  now: Date = new Date()
): ScoredPost[] {
  if (candidates.length === 0) return [];

  // Pre-compute max engagement for popularity normalization
  const maxEngagement = candidates.reduce((max, p) => {
    const total = p.likeCount + p.repostCount * 2 + p.replyCount * 1.5;
    return Math.max(max, total);
  }, 0);

  const scored: ScoredPost[] = candidates.map((post) => {
    const factors: ScoringFactors = {
      recency: computeRecency(post.createdAt, now, config.recencyHalfLifeHours),
      popularity: computePopularity(post, maxEngagement),
      networkBonus: computeNetworkBonus(post.authorId, ctx.followingIds),
      topicRelevance: computeTopicRelevance(post.topicSlugs, ctx.topicWeights),
      engagementVelocity: computeEngagementVelocity(post, now),
    };

    const score = combineFactors(factors, ctx.preferences);

    return { ...post, score, factors };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);
  return scored;
}
