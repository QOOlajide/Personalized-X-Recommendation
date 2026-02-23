/**
 * Follow graph construction for the synthetic social network.
 *
 * Builds realistic follower/following relationships between personas
 * based on interest overlap and archetype affinity. No LLM needed —
 * this is pure algorithmic logic.
 *
 * Design decisions:
 * - Interest overlap drives follow probability (shared topics → more likely to follow)
 * - Archetype affinity adds a bonus (e.g., traders follow journalists for news)
 * - Random jitter prevents deterministic, predictable graphs
 * - Follow counts are calibrated to feel realistic (30–100 follows per persona)
 */

import type { PersonaArchetype } from "../ai/schemas/persona";
import { resolveInterestsToTopics } from "./topics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PersonaForGraph {
  id: string;
  interests: string[];
  archetype: PersonaArchetype;
}

export interface FollowEdge {
  followerId: string;
  followingId: string;
}

// ---------------------------------------------------------------------------
// Archetype Affinity Matrix
// ---------------------------------------------------------------------------

/**
 * Bonus follow probability between archetype pairs.
 * Values are additive on top of the interest-overlap score.
 *
 * Only non-obvious affinities are listed. If a pair isn't here,
 * the affinity bonus is 0 (follow probability is interest-only).
 */
const ARCHETYPE_AFFINITY: Partial<
  Record<PersonaArchetype, Partial<Record<PersonaArchetype, number>>>
> = {
  tech_founder: { developer: 0.15, trader: 0.1, journalist: 0.1 },
  developer: { tech_founder: 0.15, academic: 0.05 },
  trader: { journalist: 0.15, news_outlet: 0.15, politician: 0.05 },
  journalist: { politician: 0.15, activist: 0.1, news_outlet: 0.2 },
  news_outlet: { journalist: 0.2, politician: 0.1 },
  politician: { journalist: 0.1, activist: 0.1, news_outlet: 0.1 },
  academic: { developer: 0.05, journalist: 0.05, islamic_scholar: 0.05 },
  islamic_scholar: { academic: 0.05, activist: 0.05 },
  activist: { journalist: 0.1, politician: 0.1 },
  artist: { musician: 0.1, comedian: 0.05 },
  musician: { artist: 0.1, comedian: 0.05 },
  comedian: { meme_account: 0.15, journalist: 0.05 },
  meme_account: { comedian: 0.15 },
  sports_commentator: { journalist: 0.1, news_outlet: 0.1 },
  health_fitness: { academic: 0.05 },
};

// ---------------------------------------------------------------------------
// Core Algorithm
// ---------------------------------------------------------------------------

/**
 * Compute the Jaccard similarity between two sets.
 * Returns a value between 0 (no overlap) and 1 (identical sets).
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;

  let intersection = 0;
  // Iterate over the smaller set for efficiency
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of smaller) {
    if (larger.has(item)) intersection++;
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculate the probability that persona A follows persona B.
 *
 * @returns A value between 0 and 1.
 */
export function followProbability(
  a: PersonaForGraph,
  b: PersonaForGraph,
  aTopics: Set<string>,
  bTopics: Set<string>
): number {
  // Base: interest overlap via Jaccard similarity on resolved topic slugs
  const topicSimilarity = jaccardSimilarity(aTopics, bTopics);

  // Archetype affinity bonus
  const affinityBonus =
    ARCHETYPE_AFFINITY[a.archetype]?.[b.archetype] ?? 0;

  // Combine: topic similarity weighted at 70%, archetype affinity at 30%
  // Then add a small base probability so even unrelated personas occasionally connect
  const BASE_PROBABILITY = 0.03;
  const raw = BASE_PROBABILITY + topicSimilarity * 0.7 + affinityBonus * 0.3;

  // Clamp to [0, 1]
  return Math.min(1, Math.max(0, raw));
}

/**
 * Build follow edges for all personas.
 *
 * For each persona pair (A, B), compute follow probability
 * and roll the dice. Follow relationships are directional
 * (A→B does not imply B→A).
 *
 * Uses a seeded PRNG-style approach with Math.random() for simplicity.
 * For reproducibility in tests, callers can mock Math.random.
 *
 * @param personas - All personas with their config data.
 * @param maxFollowsPerUser - Cap to prevent unrealistic super-connectors.
 * @returns Array of follow edges to insert into the database.
 */
export function buildFollowGraph(
  personas: PersonaForGraph[],
  maxFollowsPerUser: number = 80
): FollowEdge[] {
  const edges: FollowEdge[] = [];

  // Pre-compute resolved topics for each persona (avoids re-resolving per pair)
  const topicCache = new Map<string, Set<string>>();
  for (const p of personas) {
    topicCache.set(p.id, new Set(resolveInterestsToTopics(p.interests)));
  }

  // Track follow count per user to enforce the cap
  const followCount = new Map<string, number>();

  for (const a of personas) {
    const aTopics = topicCache.get(a.id)!;

    for (const b of personas) {
      // Can't follow yourself
      if (a.id === b.id) continue;

      // Enforce per-user follow cap
      const currentCount = followCount.get(a.id) ?? 0;
      if (currentCount >= maxFollowsPerUser) break;

      const bTopics = topicCache.get(b.id)!;
      const prob = followProbability(a, b, aTopics, bTopics);

      if (Math.random() < prob) {
        edges.push({ followerId: a.id, followingId: b.id });
        followCount.set(a.id, currentCount + 1);
      }
    }
  }

  return edges;
}
