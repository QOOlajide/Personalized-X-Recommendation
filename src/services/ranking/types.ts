/**
 * Shared types for the 4-stage ranking pipeline.
 *
 * These types flow between stages:
 *   CandidateSourcing → Scoring → HeuristicFiltering → FeedConstruction
 *
 * Each stage reads and enriches posts with more data, culminating
 * in a fully-scored, filtered, and explained feed.
 */

// ---------------------------------------------------------------------------
// User Preferences (input to the pipeline)
// ---------------------------------------------------------------------------

/**
 * Algorithm-level tuning knobs set by the authenticated user.
 * Maps 1:1 to the AlgorithmPreference Prisma model.
 * All weights are in [0.0, 1.0].
 */
export interface UserPreferences {
  recencyWeight: number;
  popularityWeight: number;
  networkWeight: number;
  diversityWeight: number;
}

/**
 * Per-topic interest weights for the requesting user.
 * Key: topic slug (e.g., "ai-ml"), Value: weight in [0.0, 1.0].
 * Missing slug = neutral (0.5).
 */
export type TopicWeights = Record<string, number>;

/**
 * Everything the pipeline needs to know about the requesting user.
 */
export interface RankingContext {
  userId: string;
  preferences: UserPreferences;
  topicWeights: TopicWeights;
  followingIds: Set<string>;
}

// ---------------------------------------------------------------------------
// Candidate Post (output of Stage 1, input to Stage 2)
// ---------------------------------------------------------------------------

/**
 * A post pulled from the database during candidate sourcing.
 * Contains the raw data needed for scoring — no score yet.
 */
export interface CandidatePost {
  id: string;
  content: string;
  authorId: string;
  createdAt: Date;

  // Engagement counts (denormalized on Post model)
  likeCount: number;
  repostCount: number;
  replyCount: number;
  viewCount: number;

  // Structural metadata
  parentId: string | null;
  quotedPostId: string | null;

  // Topic slugs for this post (resolved from PostTopic join)
  topicSlugs: string[];

  // Source: where candidate sourcing found this post
  source: "in_network" | "out_of_network";
}

// ---------------------------------------------------------------------------
// Scored Post (output of Stage 2, input to Stage 3)
// ---------------------------------------------------------------------------

/**
 * Breakdown of individual scoring factors.
 * Each factor is a value in [0.0, 1.0]. The final score is a
 * weighted combination of these factors using the user's preferences.
 *
 * Stored as JSON in RankingExplanation.factors for the
 * "Why am I seeing this?" feature.
 */
export interface ScoringFactors {
  /** How recently the post was created (exponential decay). */
  recency: number;
  /** Normalized engagement signal (likes + reposts + replies). */
  popularity: number;
  /** 1.0 if author is followed, 0.0 otherwise. */
  networkBonus: number;
  /** Overlap between post topics and user's topic weights. */
  topicRelevance: number;
  /** Bonus for engagement velocity (recent engagement rate). */
  engagementVelocity: number;
}

/**
 * A candidate post after scoring. Carries the final score
 * and the factor breakdown for explainability.
 */
export interface ScoredPost extends CandidatePost {
  score: number;
  factors: ScoringFactors;
}

// ---------------------------------------------------------------------------
// Feed Post (output of Stage 4 — final feed item)
// ---------------------------------------------------------------------------

/**
 * A post in the final feed after filtering and construction.
 * Includes position and the ranking explanation to persist.
 */
export interface FeedPost extends ScoredPost {
  /** 0-based position in the final feed. */
  position: number;
}

// ---------------------------------------------------------------------------
// Pipeline Configuration
// ---------------------------------------------------------------------------

/**
 * Tunable constants for the ranking pipeline.
 * Defaults are sensible for ~500 personas and ~3,000 posts.
 * Override in tests or when scaling.
 */
export interface PipelineConfig {
  /** Max candidates to source in Stage 1 (default: 1500). */
  maxCandidates: number;
  /** Max posts in the final feed from Stage 4 (default: 50). */
  feedSize: number;
  /** Half-life for recency decay in hours (default: 24). */
  recencyHalfLifeHours: number;
  /** Max posts from a single author in the final feed (default: 3). */
  authorDiversityCap: number;
  /** Max % of feed from a single topic (default: 0.4 = 40%). */
  topicSaturationLimit: number;
  /** Fraction of feed reserved for exploration posts (default: 0.1 = 10%). */
  explorationFraction: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  maxCandidates: 1500,
  feedSize: 50,
  recencyHalfLifeHours: 24,
  authorDiversityCap: 3,
  topicSaturationLimit: 0.4,
  explorationFraction: 0.1,
};

/**
 * Default preferences when a user has no AlgorithmPreference row.
 * All weights at 0.5 = balanced feed.
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  recencyWeight: 0.5,
  popularityWeight: 0.5,
  networkWeight: 0.5,
  diversityWeight: 0.5,
};
