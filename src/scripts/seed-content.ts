/**
 * Master content seed script — orchestrates the full synthetic network.
 *
 * Pipeline:  Topics → Follow Graph → Tweets & Threads → Replies & QTs → Engagement
 *
 * Run with: npx tsx src/scripts/seed-content.ts
 * Requires: GEMINI_API_KEY and DATABASE_URL in .env
 *
 * Assumes personas are already seeded (run seed-personas.ts first).
 */

import "dotenv/config";
import { db } from "../lib/db";
import { TOPICS, resolveInterestsToTopics } from "../lib/seed/topics";
import { buildFollowGraph, type PersonaForGraph } from "../lib/seed/follow-graph";
import { buildEngagement, type PostForEngagement, type PersonaForEngagement } from "../lib/seed/engagement";
import { generateTweets, generateThreads, generateReplies, generateQuoteTweets } from "../lib/ai/content-generator";
import type { PersonaConfig } from "../lib/ai/schemas/persona";

// ---------------------------------------------------------------------------
// Config — tunable via environment variables
// ---------------------------------------------------------------------------

/** Tweets per persona (standalone, not counting threads/replies) */
const TWEETS_PER_PERSONA = Number(process.env.SEED_TWEETS_PER_PERSONA ?? 6);
/** Threads per persona (each thread is 2-5 tweets) */
const THREADS_PER_PERSONA = Number(process.env.SEED_THREADS_PER_PERSONA ?? 1);
/** Replies per persona */
const REPLIES_PER_PERSONA = Number(process.env.SEED_REPLIES_PER_PERSONA ?? 2);
/** Quote tweets per persona */
const QUOTE_TWEETS_PER_PERSONA = Number(process.env.SEED_QTS_PER_PERSONA ?? 1);

/** Delay between Gemini API calls (ms) to respect rate limits */
const API_DELAY_MS = Number(process.env.SEED_API_DELAY_MS ?? 1500);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Spread post creation timestamps across a realistic time range.
 * Posts should appear to have been created over the past 7 days,
 * not all at the same instant.
 */
function randomRecentDate(): Date {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return new Date(now - Math.random() * sevenDaysMs);
}

// ---------------------------------------------------------------------------
// Step 1: Seed Topics
// ---------------------------------------------------------------------------

async function seedTopics(): Promise<Map<string, string>> {
  console.log("\n📂 Step 1: Seeding topics...");

  const slugToId = new Map<string, string>();

  for (const topic of TOPICS) {
    const result = await db.topic.upsert({
      where: { slug: topic.slug },
      update: {}, // No-op if already exists
      create: {
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
      },
    });
    slugToId.set(topic.slug, result.id);
  }

  console.log(`  ✅ ${slugToId.size} topics seeded.`);
  return slugToId;
}

// ---------------------------------------------------------------------------
// Step 2: Build Follow Graph
// ---------------------------------------------------------------------------

async function seedFollowGraph(
  personas: PersonaForGraph[]
): Promise<Set<string>> {
  console.log("\n🔗 Step 2: Building follow graph...");

  const edges = buildFollowGraph(personas);

  // Batch insert with skipDuplicates (idempotent re-runs)
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    const batch = edges.slice(i, i + BATCH_SIZE);
    const result = await db.follow.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += result.count;
  }

  console.log(
    `  ✅ ${inserted} follow relationships created (${edges.length} generated, dupes skipped).`
  );

  // Return a Set for O(1) lookup during engagement seeding
  const followSet = new Set<string>();
  for (const edge of edges) {
    followSet.add(`${edge.followerId}:${edge.followingId}`);
  }
  return followSet;
}

// ---------------------------------------------------------------------------
// Step 3: Generate Tweets & Threads
// ---------------------------------------------------------------------------

interface InsertedPost {
  id: string;
  authorId: string;
  authorHandle: string;
  content: string;
  topicSlugs: string[];
}

async function seedTweetsAndThreads(
  personas: { id: string; name: string; handle: string; config: PersonaConfig }[],
  topicSlugToId: Map<string, string>
): Promise<InsertedPost[]> {
  console.log("\n✍️  Step 3: Generating tweets and threads...");

  const allPosts: InsertedPost[] = [];
  let totalTweets = 0;
  let totalThreadPosts = 0;

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    const progress = `[${i + 1}/${personas.length}]`;

    try {
      // --- Standalone tweets ---
      const tweets = await generateTweets(persona, TWEETS_PER_PERSONA);
      await sleep(API_DELAY_MS);

      for (const tweet of tweets) {
        const createdAt = randomRecentDate();
        const post = await db.post.create({
          data: {
            content: tweet.content,
            authorId: persona.id,
            createdAt,
            updatedAt: createdAt,
          },
        });

        // Assign topics
        const topicIds = tweet.topicSlugs
          .map((slug) => topicSlugToId.get(slug))
          .filter((id): id is string => id !== undefined);

        if (topicIds.length > 0) {
          await db.postTopic.createMany({
            data: topicIds.map((topicId) => ({ postId: post.id, topicId })),
            skipDuplicates: true,
          });
        }

        allPosts.push({
          id: post.id,
          authorId: persona.id,
          authorHandle: persona.handle,
          content: tweet.content,
          topicSlugs: tweet.topicSlugs,
        });
        totalTweets++;
      }

      // --- Threads ---
      const threads = await generateThreads(persona, THREADS_PER_PERSONA);
      await sleep(API_DELAY_MS);

      for (const thread of threads) {
        let parentId: string | null = null;
        const threadTime = randomRecentDate();

        for (let j = 0; j < thread.posts.length; j++) {
          const threadPost = thread.posts[j];
          // Thread posts are slightly staggered in time (1-3 min apart)
          const postTime = new Date(threadTime.getTime() + j * (60_000 + Math.random() * 120_000));

          const post: { id: string } = await db.post.create({
            data: {
              content: threadPost.content,
              authorId: persona.id,
              parentId, // null for first post, previous post's id for continuations
              createdAt: postTime,
              updatedAt: postTime,
            },
          });

          // Update parent's reply count
          if (parentId) {
            await db.post.update({
              where: { id: parentId },
              data: { replyCount: { increment: 1 } },
            });
          }

          // Assign topics (same topics for entire thread)
          const topicIds = thread.topicSlugs
            .map((slug) => topicSlugToId.get(slug))
            .filter((id): id is string => id !== undefined);

          if (topicIds.length > 0) {
            await db.postTopic.createMany({
              data: topicIds.map((topicId) => ({ postId: post.id, topicId })),
              skipDuplicates: true,
            });
          }

          // Only the thread starter goes into allPosts (for replies/QTs targeting)
          if (j === 0) {
            allPosts.push({
              id: post.id,
              authorId: persona.id,
              authorHandle: persona.handle,
              content: threadPost.content,
              topicSlugs: thread.topicSlugs,
            });
          }

          parentId = post.id;
          totalThreadPosts++;
        }
      }

      console.log(
        `  ${progress} @${persona.handle}: ${tweets.length} tweets, ${threads.length} threads`
      );
    } catch (error) {
      // Log and continue — one persona failing shouldn't stop the whole seed
      console.error(
        `  ❌ ${progress} @${persona.handle} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log(
    `  ✅ ${totalTweets} standalone tweets + ${totalThreadPosts} thread posts created.`
  );
  return allPosts;
}

// ---------------------------------------------------------------------------
// Step 4: Generate Replies & Quote Tweets
// ---------------------------------------------------------------------------

async function seedRepliesAndQuoteTweets(
  personas: { id: string; name: string; handle: string; config: PersonaConfig }[],
  allPosts: InsertedPost[],
  topicSlugToId: Map<string, string>
): Promise<void> {
  console.log("\n💬 Step 4: Generating replies and quote tweets...");

  let totalReplies = 0;
  let totalQuoteTweets = 0;

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    const progress = `[${i + 1}/${personas.length}]`;

    try {
      // Sample posts from OTHER personas that match this persona's interests
      const personaTopics = new Set(resolveInterestsToTopics(persona.config.interests));
      const relevantPosts = allPosts
        .filter((p) => {
          if (p.authorId === persona.id) return false; // Skip own posts
          return p.topicSlugs.some((slug) => personaTopics.has(slug));
        })
        .slice(0, 20); // Cap to avoid huge prompts

      if (relevantPosts.length === 0) continue;

      const targetTweets = relevantPosts.map((p, idx) => ({
        index: idx,
        authorHandle: p.authorHandle,
        content: p.content,
      }));

      // --- Replies ---
      const replies = await generateReplies(persona, targetTweets, REPLIES_PER_PERSONA);
      await sleep(API_DELAY_MS);

      for (const reply of replies) {
        const targetPost = relevantPosts[reply.originalTweetIndex];
        if (!targetPost) continue;

        const createdAt = new Date(
          Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000 // within last 6 days
        );

        await db.post.create({
          data: {
            content: reply.content,
            authorId: persona.id,
            parentId: targetPost.id,
            createdAt,
            updatedAt: createdAt,
          },
        });

        // Increment parent's reply count
        await db.post.update({
          where: { id: targetPost.id },
          data: { replyCount: { increment: 1 } },
        });

        totalReplies++;
      }

      // --- Quote Tweets ---
      const quoteTweets = await generateQuoteTweets(persona, targetTweets, QUOTE_TWEETS_PER_PERSONA);
      await sleep(API_DELAY_MS);

      for (const qt of quoteTweets) {
        const targetPost = relevantPosts[qt.originalTweetIndex];
        if (!targetPost) continue;

        const createdAt = new Date(
          Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000
        );

        const post = await db.post.create({
          data: {
            content: qt.content,
            authorId: persona.id,
            quotedPostId: targetPost.id,
            createdAt,
            updatedAt: createdAt,
          },
        });

        // Assign same topics as the quoted post
        const topicIds = targetPost.topicSlugs
          .map((slug) => topicSlugToId.get(slug))
          .filter((id): id is string => id !== undefined);

        if (topicIds.length > 0) {
          await db.postTopic.createMany({
            data: topicIds.map((topicId) => ({ postId: post.id, topicId })),
            skipDuplicates: true,
          });
        }

        totalQuoteTweets++;
      }

      if ((i + 1) % 10 === 0 || i === personas.length - 1) {
        console.log(
          `  ${progress} Progress: ${totalReplies} replies, ${totalQuoteTweets} quote tweets so far`
        );
      }
    } catch (error) {
      console.error(
        `  ❌ ${progress} @${persona.handle} replies/QTs failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log(
    `  ✅ ${totalReplies} replies + ${totalQuoteTweets} quote tweets created.`
  );
}

// ---------------------------------------------------------------------------
// Step 5: Seed Engagement (Likes & Reposts)
// ---------------------------------------------------------------------------

async function seedEngagement(
  personas: PersonaForEngagement[],
  allPosts: InsertedPost[],
  followSet: Set<string>
): Promise<void> {
  console.log("\n❤️  Step 5: Seeding engagement (likes & reposts)...");

  const postsForEngagement: PostForEngagement[] = allPosts.map((p) => ({
    id: p.id,
    authorId: p.authorId,
    topicSlugs: p.topicSlugs,
  }));

  const { likes, reposts } = buildEngagement(personas, postsForEngagement, followSet);

  // Batch insert likes
  const BATCH_SIZE = 500;
  let insertedLikes = 0;
  for (let i = 0; i < likes.length; i += BATCH_SIZE) {
    const batch = likes.slice(i, i + BATCH_SIZE);
    const result = await db.like.createMany({
      data: batch,
      skipDuplicates: true,
    });
    insertedLikes += result.count;
  }

  // Batch insert reposts
  let insertedReposts = 0;
  for (let i = 0; i < reposts.length; i += BATCH_SIZE) {
    const batch = reposts.slice(i, i + BATCH_SIZE);
    const result = await db.repost.createMany({
      data: batch,
      skipDuplicates: true,
    });
    insertedReposts += result.count;
  }

  // Update denormalized counts on posts
  console.log("  📊 Updating denormalized engagement counts...");

  // Group likes by postId and update counts in batches
  const likeCounts = new Map<string, number>();
  for (const like of likes) {
    likeCounts.set(like.postId, (likeCounts.get(like.postId) ?? 0) + 1);
  }
  const repostCounts = new Map<string, number>();
  for (const repost of reposts) {
    repostCounts.set(repost.postId, (repostCounts.get(repost.postId) ?? 0) + 1);
  }

  // Collect all post IDs that need updating
  const postIdsToUpdate = new Set([...likeCounts.keys(), ...repostCounts.keys()]);
  for (const postId of postIdsToUpdate) {
    await db.post.update({
      where: { id: postId },
      data: {
        likeCount: { increment: likeCounts.get(postId) ?? 0 },
        repostCount: { increment: repostCounts.get(postId) ?? 0 },
      },
    });
  }

  console.log(
    `  ✅ ${insertedLikes} likes + ${insertedReposts} reposts created. ` +
      `${postIdsToUpdate.size} posts updated.`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🚀 Content seed pipeline starting...\n");

  // Load all personas from DB
  const rawPersonas = await db.user.findMany({
    where: { isPersona: true },
    select: {
      id: true,
      name: true,
      handle: true,
      personaConfig: true,
    },
  });

  if (rawPersonas.length === 0) {
    console.error(
      "❌ No personas found in the database. Run seed-personas.ts first:\n" +
        "   npx tsx src/scripts/seed-personas.ts"
    );
    process.exit(1);
  }

  console.log(`📋 Found ${rawPersonas.length} personas in database.`);

  // Parse personaConfig JSON → typed PersonaConfig
  const personas = rawPersonas.map((p) => ({
    id: p.id,
    name: p.name,
    handle: p.handle,
    config: p.personaConfig as PersonaConfig,
  }));

  // Step 1: Topics
  const topicSlugToId = await seedTopics();

  // Step 2: Follow graph
  const personasForGraph: PersonaForGraph[] = personas.map((p) => ({
    id: p.id,
    interests: p.config.interests,
    archetype: p.config.archetype,
  }));
  const followSet = await seedFollowGraph(personasForGraph);

  // Step 3: Tweets & Threads
  const allPosts = await seedTweetsAndThreads(personas, topicSlugToId);

  // Step 4: Replies & Quote Tweets
  await seedRepliesAndQuoteTweets(personas, allPosts, topicSlugToId);

  // Step 5: Engagement
  const personasForEngagement: PersonaForEngagement[] = personas.map((p) => ({
    id: p.id,
    interests: p.config.interests,
  }));
  await seedEngagement(personasForEngagement, allPosts, followSet);

  console.log("\n🎉 Content seed pipeline complete!");
}

// Only auto-execute when run directly (not when imported by tests)
if (!process.env.VITEST) {
  main()
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    })
    .finally(() => {
      db.$disconnect();
    });
}
