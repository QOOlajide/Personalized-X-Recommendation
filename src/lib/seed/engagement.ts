/**
 * Engagement seeder — generates likes and reposts for the synthetic network.
 *
 * No LLM needed. Engagement is determined algorithmically based on:
 * - Topic overlap between the persona and the post
 * - Whether the persona follows the post's author (in-network boost)
 * - Random jitter for variety
 *
 * This creates realistic engagement patterns where popular/relevant posts
 * get more likes, and in-network content gets disproportionate attention.
 */

import { resolveInterestsToTopics } from "./topics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostForEngagement {
  id: string;
  authorId: string;
  topicSlugs: string[]; // Already-resolved topic slugs for this post
}

export interface PersonaForEngagement {
  id: string;
  interests: string[];
}

export interface LikeEdge {
  userId: string;
  postId: string;
}

export interface RepostEdge {
  userId: string;
  postId: string;
}

// ---------------------------------------------------------------------------
// Core Algorithm
// ---------------------------------------------------------------------------

/**
 * Calculate the probability a persona engages with a post.
 *
 * @param personaTopics - Set of topic slugs the persona cares about.
 * @param postTopics - Topic slugs assigned to the post.
 * @param isFollowing - Whether the persona follows the post's author.
 * @returns A value between 0 and 1.
 */
export function engagementProbability(
  personaTopics: Set<string>,
  postTopics: string[],
  isFollowing: boolean
): number {
  // Topic overlap: what fraction of the post's topics match the persona's interests?
  if (postTopics.length === 0) return isFollowing ? 0.05 : 0.01;

  let overlap = 0;
  for (const slug of postTopics) {
    if (personaTopics.has(slug)) overlap++;
  }
  const topicScore = overlap / postTopics.length;

  // In-network boost: followers are ~3x more likely to engage
  const networkBoost = isFollowing ? 0.15 : 0;

  // Base probability is low — most people scroll past most tweets
  const BASE = 0.02;
  const raw = BASE + topicScore * 0.25 + networkBoost;

  return Math.min(1, Math.max(0, raw));
}

/**
 * Generate like and repost edges for the entire network.
 *
 * For each (persona, post) pair, compute engagement probability and roll.
 * Likes are ~5x more common than reposts (matches real X behavior).
 *
 * @param personas - All personas in the network.
 * @param posts - All posts to potentially engage with.
 * @param followSet - Set of "followerId:followingId" strings for O(1) lookup.
 * @returns Likes and reposts to insert into the database.
 */
export function buildEngagement(
  personas: PersonaForEngagement[],
  posts: PostForEngagement[],
  followSet: Set<string>
): { likes: LikeEdge[]; reposts: RepostEdge[] } {
  const likes: LikeEdge[] = [];
  const reposts: RepostEdge[] = [];

  // Pre-compute resolved topics for each persona
  const personaTopicCache = new Map<string, Set<string>>();
  for (const p of personas) {
    personaTopicCache.set(p.id, new Set(resolveInterestsToTopics(p.interests)));
  }

  for (const persona of personas) {
    const personaTopics = personaTopicCache.get(persona.id)!;

    for (const post of posts) {
      // Can't engage with your own posts
      if (persona.id === post.authorId) continue;

      const isFollowing = followSet.has(`${persona.id}:${post.authorId}`);
      const prob = engagementProbability(personaTopics, post.topicSlugs, isFollowing);

      // Roll for like
      if (Math.random() < prob) {
        likes.push({ userId: persona.id, postId: post.id });

        // Repost is much rarer — only ~20% of likers also repost
        if (Math.random() < 0.2) {
          reposts.push({ userId: persona.id, postId: post.id });
        }
      }
    }
  }

  return { likes, reposts };
}
