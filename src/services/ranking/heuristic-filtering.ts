/**
 * Stage 3: Heuristic Filtering
 *
 * Applies rule-based diversity enforcement to the scored candidate list.
 * This is the anti-filter-bubble layer — it ensures the feed isn't
 * dominated by one author, one topic, or stale content.
 *
 * Filters (applied in order):
 *   1. Author diversity cap — max N posts per author per feed page.
 *   2. Topic saturation limit — no topic exceeds M% of the feed.
 *   3. Freshness floor — at least some recent posts even if low-scored.
 *   4. Exploration injection — surface some out-of-interest posts.
 *
 * The input is a score-sorted array of ScoredPosts.
 * The output is a filtered array, still sorted by score, ready for
 * Stage 4 (feed construction).
 */

import type { ScoredPost, PipelineConfig } from "./types";
import { DEFAULT_PIPELINE_CONFIG } from "./types";

// ---------------------------------------------------------------------------
// Individual Filters (pure functions)
// ---------------------------------------------------------------------------

/**
 * Author diversity: cap posts per author.
 *
 * Iterates through scored posts (best-first). Once an author hits
 * the cap, their remaining posts are removed.
 *
 * Why: Without this, a prolific poster with high engagement could
 * fill half the feed.
 */
export function applyAuthorDiversityCap(
  posts: ScoredPost[],
  cap: number
): ScoredPost[] {
  const authorCounts = new Map<string, number>();
  return posts.filter((post) => {
    const count = authorCounts.get(post.authorId) ?? 0;
    if (count >= cap) return false;
    authorCounts.set(post.authorId, count + 1);
    return true;
  });
}

/**
 * Topic saturation limit: prevent any single topic from
 * exceeding a given fraction of the final feed.
 *
 * Works by tracking topic frequency. When a topic crosses the
 * threshold, posts whose *primary* topic (first slug) matches
 * are dropped.
 *
 * Posts with no topics are always kept (they can't saturate anything).
 */
export function applyTopicSaturationLimit(
  posts: ScoredPost[],
  feedSize: number,
  limit: number
): ScoredPost[] {
  const maxPerTopic = Math.ceil(feedSize * limit);
  const topicCounts = new Map<string, number>();

  return posts.filter((post) => {
    if (post.topicSlugs.length === 0) return true;

    // Check each of the post's topics
    const primaryTopic = post.topicSlugs[0];
    const count = topicCounts.get(primaryTopic) ?? 0;
    if (count >= maxPerTopic) return false;

    topicCounts.set(primaryTopic, count + 1);
    return true;
  });
}

/**
 * Freshness floor: ensure at least `minFreshPosts` of the feed
 * are very recent (< 4 hours old), even if they scored lower.
 *
 * Works by pulling fresh posts to the front if underrepresented.
 * The caller's score ordering is preserved within the fresh group
 * and the non-fresh group separately.
 */
export function applyFreshnessFloor(
  posts: ScoredPost[],
  feedSize: number,
  minFreshFraction: number = 0.15,
  now: Date = new Date(),
  freshnessThresholdHours: number = 4
): ScoredPost[] {
  const minFresh = Math.ceil(feedSize * minFreshFraction);
  const thresholdMs = freshnessThresholdHours * 60 * 60 * 1000;

  const fresh: ScoredPost[] = [];
  const rest: ScoredPost[] = [];

  for (const post of posts) {
    const ageMs = now.getTime() - post.createdAt.getTime();
    if (ageMs <= thresholdMs) {
      fresh.push(post);
    } else {
      rest.push(post);
    }
  }

  // If there are already enough fresh posts near the top, no change needed
  if (fresh.length <= minFresh) {
    // All fresh posts go first, then the rest
    return [...fresh, ...rest];
  }

  // Otherwise, just return the original order — fresh posts are
  // already scoring well enough to be represented
  return posts;
}

/**
 * Exploration injection: ensure a fraction of the feed comes from
 * out-of-network posts (discovery).
 *
 * If the feed is already >explorationFraction out-of-network,
 * do nothing. Otherwise, promote some out-of-network posts by
 * pulling them forward.
 *
 * This directly addresses the Context.md challenge:
 * "preventing filter bubbles, topic saturation, and popularity
 *  feedback loops inside the simulation."
 */
export function applyExplorationInjection(
  posts: ScoredPost[],
  feedSize: number,
  explorationFraction: number
): ScoredPost[] {
  const minExploration = Math.ceil(feedSize * explorationFraction);

  const outOfNetwork: ScoredPost[] = [];
  const inNetwork: ScoredPost[] = [];

  for (const post of posts) {
    if (post.source === "out_of_network") {
      outOfNetwork.push(post);
    } else {
      inNetwork.push(post);
    }
  }

  // Already enough discovery content — return as-is
  if (outOfNetwork.length >= minExploration) return posts;

  // Not enough discovery — this means the original sort heavily
  // favored in-network. Interleave some exploration posts.
  // Take all out-of-network posts we have, then fill with in-network.
  const result: ScoredPost[] = [];
  let oonIdx = 0;
  let inIdx = 0;

  // Place one exploration post every N slots
  const insertEvery = minExploration > 0 ? Math.floor(feedSize / minExploration) : feedSize;

  for (let i = 0; i < posts.length; i++) {
    if (i % insertEvery === 0 && oonIdx < outOfNetwork.length) {
      result.push(outOfNetwork[oonIdx++]);
    } else if (inIdx < inNetwork.length) {
      result.push(inNetwork[inIdx++]);
    }
  }

  // Append any remaining posts
  while (oonIdx < outOfNetwork.length) result.push(outOfNetwork[oonIdx++]);
  while (inIdx < inNetwork.length) result.push(inNetwork[inIdx++]);

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply all heuristic filters in sequence.
 *
 * @param posts - Score-sorted array from Stage 2.
 * @param config - Pipeline configuration.
 * @param now - Current time (injectable for testing).
 * @returns Filtered array of ScoredPosts.
 */
export function applyHeuristicFilters(
  posts: ScoredPost[],
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
  now: Date = new Date()
): ScoredPost[] {
  let filtered = posts;

  // 1. Author diversity
  filtered = applyAuthorDiversityCap(filtered, config.authorDiversityCap);

  // 2. Topic saturation
  filtered = applyTopicSaturationLimit(filtered, config.feedSize, config.topicSaturationLimit);

  // 3. Freshness floor
  filtered = applyFreshnessFloor(filtered, config.feedSize, 0.15, now);

  // 4. Exploration injection
  filtered = applyExplorationInjection(filtered, config.feedSize, config.explorationFraction);

  return filtered;
}
