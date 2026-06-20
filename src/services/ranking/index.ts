/**
 * Ranking Pipeline Orchestrator
 *
 * Wires the 4 stages together into a single function call:
 *   sourceCandidates → scoreCandidates → applyHeuristicFilters → constructFeed
 *
 * Also handles loading user preferences and follow graph from the database,
 * so the caller only needs to provide a userId.
 *
 * Usage:
 *   const { feed, explanations } = await generateFeed(userId);
 */

import { db } from "../../lib/db";
import { sourceCandidates } from "./candidate-sourcing";
import { scoreCandidates } from "./scoring";
import { applyHeuristicFilters } from "./heuristic-filtering";
import { constructFeed, type FeedExplanation } from "./feed-construction";
import type {
  FeedPost,
  RankingContext,
  PipelineConfig,
  UserPreferences,
  TopicWeights,
} from "./types";
import { DEFAULT_PIPELINE_CONFIG, DEFAULT_PREFERENCES } from "./types";

// ---------------------------------------------------------------------------
// Preference Overrides (live preview)
// ---------------------------------------------------------------------------

/**
 * Transient preference overrides applied on top of the user's stored
 * preferences without persisting them. Powers the "move a slider and
 * watch the feed re-rank" preview before the user commits a change.
 */
export interface PreferenceOverrides {
  preferences?: Partial<UserPreferences>;
  topicWeights?: TopicWeights;
}

/**
 * Merge transient overrides onto a loaded context. Pure function so the
 * override semantics can be unit-tested without touching the database.
 *
 * Algorithm weights are merged field-by-field (partial override allowed);
 * topic weights are merged key-by-key (override wins per slug).
 */
export function applyOverrides(
  ctx: RankingContext,
  overrides?: PreferenceOverrides
): RankingContext {
  if (!overrides) return ctx;

  return {
    ...ctx,
    preferences: { ...ctx.preferences, ...overrides.preferences },
    topicWeights: { ...ctx.topicWeights, ...overrides.topicWeights },
  };
}

// ---------------------------------------------------------------------------
// Context Loader
// ---------------------------------------------------------------------------

/**
 * Load everything the pipeline needs about the requesting user.
 * One set of DB queries, cached for the duration of the request.
 */
async function loadRankingContext(userId: string): Promise<RankingContext> {
  // Run all three queries in parallel
  const [algorithmPref, topicPrefs, follows] = await Promise.all([
    db.algorithmPreference.findUnique({ where: { userId } }),
    db.userTopicPreference.findMany({
      where: { userId },
      select: { topic: { select: { slug: true } }, weight: true },
    }),
    db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
  ]);

  // Map preferences
  const preferences: UserPreferences = algorithmPref
    ? {
        recencyWeight: algorithmPref.recencyWeight,
        popularityWeight: algorithmPref.popularityWeight,
        networkWeight: algorithmPref.networkWeight,
        diversityWeight: algorithmPref.diversityWeight,
      }
    : DEFAULT_PREFERENCES;

  // Map topic weights
  const topicWeights: TopicWeights = {};
  for (const pref of topicPrefs) {
    topicWeights[pref.topic.slug] = pref.weight;
  }

  // Build following set for O(1) lookup
  const followingIds = new Set(follows.map((f) => f.followingId));

  return { userId, preferences, topicWeights, followingIds };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FeedResult {
  feed: FeedPost[];
  explanations: FeedExplanation[];
  meta: {
    candidatesSourced: number;
    candidatesAfterFiltering: number;
    feedSize: number;
    pipelineMs: number;
  };
}

/**
 * Generate a personalized feed for a user.
 *
 * This is the main entry point for the ranking pipeline.
 * It loads the user's context, runs all 4 stages, and returns
 * the final feed with explanations and pipeline metadata.
 *
 * @param userId - The authenticated user requesting their feed.
 * @param config - Optional pipeline config overrides.
 * @param overrides - Optional transient preference overrides (live preview).
 * @returns Feed posts, ranking explanations, and pipeline stats.
 */
export async function generateFeed(
  userId: string,
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
  overrides?: PreferenceOverrides
): Promise<FeedResult> {
  const startMs = performance.now();

  // Load user context (preferences, follows, topic weights), then apply
  // any transient overrides for live preview without persisting them.
  const ctx = applyOverrides(await loadRankingContext(userId), overrides);

  // Stage 1: Candidate Sourcing
  const candidates = await sourceCandidates(ctx, config);

  // Stage 2: Scoring
  const scored = scoreCandidates(candidates, ctx, config);

  // Stage 3: Heuristic Filtering
  const filtered = applyHeuristicFilters(scored, config);

  // Stage 4: Feed Construction
  const { feed, explanations } = constructFeed(filtered, userId, config);

  const pipelineMs = Math.round(performance.now() - startMs);

  return {
    feed,
    explanations,
    meta: {
      candidatesSourced: candidates.length,
      candidatesAfterFiltering: filtered.length,
      feedSize: feed.length,
      pipelineMs,
    },
  };
}

// Re-export types for consumers
export type { FeedPost, FeedExplanation, RankingContext, PipelineConfig };
export { DEFAULT_PIPELINE_CONFIG, DEFAULT_PREFERENCES };
