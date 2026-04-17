/**
 * Content generation service using Gemini 3 Flash.
 *
 * Generates tweets, threads, replies, and quote tweets for personas.
 * Each function returns validated structured data ready for DB insertion.
 *
 * Design decisions:
 * - One persona per Gemini call (better quality than batching multiple personas)
 * - Reuses withRetry from persona-generator for transient error handling
 * - All output validated via Zod schemas (LLMs can still produce bad JSON)
 * - Topic slugs are included in generation (LLM tags topics inline)
 */

import { z } from "zod/v4";
import { getGeminiClient, MODELS } from "./gemini";
import { withRetry } from "./persona-generator";
import {
  TweetBatchSchema,
  ThreadBatchSchema,
  ReplyBatchSchema,
  QuoteTweetBatchSchema,
  type GeneratedTweet,
  type GeneratedThread,
  type GeneratedReply,
  type GeneratedQuoteTweet,
} from "./schemas/content";
import { TOPICS } from "../seed/topics";
import type { PersonaConfig } from "./schemas/persona";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOPIC_SLUG_LIST = TOPICS.map((t) => `${t.slug} (${t.name})`).join(", ");

const CONTENT_CHAR_LIMIT = 280;

/**
 * Walk a parsed JSON object and truncate any string `content` fields
 * that exceed the character limit. Truncation cuts at the last word
 * boundary before the limit and appends "…".
 * Returns the number of fields that were truncated.
 */
function repairContentFields(obj: unknown): number {
  let repaired = 0;

  function walk(node: unknown): void {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node !== null && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (
        typeof record.content === "string" &&
        record.content.length > CONTENT_CHAR_LIMIT
      ) {
        const truncated = record.content.slice(0, CONTENT_CHAR_LIMIT - 1);
        const lastSpace = truncated.lastIndexOf(" ");
        record.content =
          (lastSpace > CONTENT_CHAR_LIMIT * 0.6
            ? truncated.slice(0, lastSpace)
            : truncated) + "…";
        repaired++;
      }
      Object.values(record).forEach(walk);
    }
  }

  walk(obj);
  return repaired;
}

/**
 * Parse and validate Gemini's JSON response against a Zod schema.
 * Extracted as a helper to avoid repeating error handling in every generator.
 *
 * Includes an automatic repair pass: any `content` fields exceeding 280
 * characters are truncated at a word boundary before validation. This
 * handles the common case where the LLM slightly overshoots the limit.
 */
function parseGeminiResponse<T>(text: string | undefined, schema: z.ZodType<T>, label: string): T {
  if (!text) {
    throw new Error(`${label}: Gemini returned an empty response`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${label}: Gemini returned invalid JSON. ` +
        `Parse error: ${error instanceof Error ? error.message : String(error)}. ` +
        `Raw (first 500 chars): ${text.slice(0, 500)}`
    );
  }

  const repaired = repairContentFields(parsed);
  if (repaired > 0) {
    console.warn(`  🔧 ${label}: truncated ${repaired} content field(s) to ${CONTENT_CHAR_LIMIT} chars`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `${label}: Gemini JSON did not match schema. ` +
        `Errors: ${JSON.stringify(result.error.issues, null, 2)}`
    );
  }

  return result.data;
}

// ---------------------------------------------------------------------------
// Standalone Tweet Generation
// ---------------------------------------------------------------------------

function buildTweetPrompt(
  persona: { name: string; handle: string; config: PersonaConfig },
  count: number
): string {
  return `You are generating tweets for a synthetic Twitter/X persona.

Persona: @${persona.handle} (${persona.name})
Archetype: ${persona.config.archetype}
Interests: ${persona.config.interests.join(", ")}
Writing style: ${persona.config.writingStyle}
Engagement style: ${persona.config.engagementStyle}

Generate exactly ${count} tweets that this persona would realistically post.

HARD CONSTRAINT — every single tweet "content" field MUST be 280 characters or fewer. Count carefully. If a draft exceeds 280 characters, shorten it before including it. This is a strict technical limit that will cause a validation error if violated.

Rules:
- Match the persona's writing style exactly (tone, emoji usage, punctuation, capitalization)
- Cover their interests naturally — not every tweet about the same thing
- Include a mix: some informative, some opinions, some casual/personal
- Tag each tweet with 1-3 topic slugs from: ${TOPIC_SLUG_LIST}
- Make tweets feel authentic, not generic or robotic
- Vary tweet lengths (some short and punchy, some longer — but never over 280 chars)`;
}

/**
 * Generate standalone tweets for a single persona.
 *
 * @param persona - The persona's profile + config.
 * @param count - Number of tweets to generate (recommended: 5-15).
 * @returns Validated array of generated tweets with topic tags.
 */
export async function generateTweets(
  persona: { name: string; handle: string; config: PersonaConfig },
  count: number = 8
): Promise<GeneratedTweet[]> {
  const prompt = buildTweetPrompt(persona, count);
  const jsonSchema = z.toJSONSchema(TweetBatchSchema, { target: "draft-7" });

  const response = await withRetry(
    () =>
      getGeminiClient().models.generateContent({
        model: MODELS.lite,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature: 0.9, // High creativity for diverse content
        },
      }),
    `Tweets for @${persona.handle}`
  );

  const batch = parseGeminiResponse(response.text, TweetBatchSchema, `Tweets @${persona.handle}`);
  return batch.tweets;
}

// ---------------------------------------------------------------------------
// Thread Generation
// ---------------------------------------------------------------------------

function buildThreadPrompt(
  persona: { name: string; handle: string; config: PersonaConfig },
  count: number
): string {
  return `You are generating Twitter/X threads for a synthetic persona.

Persona: @${persona.handle} (${persona.name})
Archetype: ${persona.config.archetype}
Interests: ${persona.config.interests.join(", ")}
Writing style: ${persona.config.writingStyle}

Generate exactly ${count} thread(s). Each thread is a sequence of 2-5 connected tweets telling a story, explaining a concept, or building an argument.

HARD CONSTRAINT — every single "content" field in every thread post MUST be 280 characters or fewer. Count carefully. If a draft exceeds 280 characters, shorten it before including it. This is a strict technical limit that will cause a validation error if violated.

Rules:
- First tweet should hook the reader (e.g., "Thread 🧵" or a bold claim)
- Each subsequent tweet builds on the previous one
- Match the persona's writing style
- Tag each thread with 1-3 topic slugs from: ${TOPIC_SLUG_LIST}
- Topics should reflect the thread's subject, not each individual tweet`;
}

/**
 * Generate threads for a single persona.
 *
 * @param persona - The persona's profile + config.
 * @param count - Number of threads to generate (recommended: 1-3).
 * @returns Validated array of threads, each with ordered posts.
 */
export async function generateThreads(
  persona: { name: string; handle: string; config: PersonaConfig },
  count: number = 1
): Promise<GeneratedThread[]> {
  const prompt = buildThreadPrompt(persona, count);
  const jsonSchema = z.toJSONSchema(ThreadBatchSchema, { target: "draft-7" });

  const response = await withRetry(
    () =>
      getGeminiClient().models.generateContent({
        model: MODELS.lite,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature: 0.9,
        },
      }),
    `Threads for @${persona.handle}`
  );

  const batch = parseGeminiResponse(
    response.text,
    ThreadBatchSchema,
    `Threads @${persona.handle}`
  );
  return batch.threads;
}

// ---------------------------------------------------------------------------
// Reply Generation
// ---------------------------------------------------------------------------

function buildReplyPrompt(
  persona: { name: string; handle: string; config: PersonaConfig },
  targetTweets: { index: number; authorHandle: string; content: string }[],
  count: number
): string {
  const tweetList = targetTweets
    .map((t) => `[${t.index}] @${t.authorHandle}: "${t.content}"`)
    .join("\n");

  return `You are generating replies for a synthetic Twitter/X persona.

Persona: @${persona.handle} (${persona.name})
Archetype: ${persona.config.archetype}
Interests: ${persona.config.interests.join(", ")}
Writing style: ${persona.config.writingStyle}
Engagement style: ${persona.config.engagementStyle}

Here are tweets from other users that this persona might reply to:
${tweetList}

Generate exactly ${count} replies. For each reply, specify which tweet you're replying to (by its index).

HARD CONSTRAINT — every "content" field MUST be 280 characters or fewer. Count carefully. Shorten any draft that exceeds this limit. This is a strict technical limit.

Rules:
- Replies should feel natural — agree, disagree, add context, joke, or ask a question
- Match the persona's engagement style
- Don't reply to every tweet — pick the ones this persona would actually engage with
- The originalTweetIndex must be a valid index from the list above`;
}

/**
 * Generate replies from a persona to a set of existing tweets.
 *
 * @param persona - The replying persona.
 * @param targetTweets - Existing tweets to potentially reply to.
 * @param count - Number of replies to generate.
 * @returns Validated replies with target tweet indices.
 */
export async function generateReplies(
  persona: { name: string; handle: string; config: PersonaConfig },
  targetTweets: { index: number; authorHandle: string; content: string }[],
  count: number = 3
): Promise<GeneratedReply[]> {
  if (targetTweets.length === 0) return [];

  const prompt = buildReplyPrompt(persona, targetTweets, count);
  const jsonSchema = z.toJSONSchema(ReplyBatchSchema, { target: "draft-7" });

  const response = await withRetry(
    () =>
      getGeminiClient().models.generateContent({
        model: MODELS.lite,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature: 0.9,
        },
      }),
    `Replies from @${persona.handle}`
  );

  const batch = parseGeminiResponse(
    response.text,
    ReplyBatchSchema,
    `Replies @${persona.handle}`
  );

  // Filter out replies targeting invalid indices
  return batch.replies.filter((r) => r.originalTweetIndex < targetTweets.length);
}

// ---------------------------------------------------------------------------
// Quote Tweet Generation
// ---------------------------------------------------------------------------

function buildQuoteTweetPrompt(
  persona: { name: string; handle: string; config: PersonaConfig },
  targetTweets: { index: number; authorHandle: string; content: string }[],
  count: number
): string {
  const tweetList = targetTweets
    .map((t) => `[${t.index}] @${t.authorHandle}: "${t.content}"`)
    .join("\n");

  return `You are generating quote tweets for a synthetic Twitter/X persona.

Persona: @${persona.handle} (${persona.name})
Archetype: ${persona.config.archetype}
Interests: ${persona.config.interests.join(", ")}
Writing style: ${persona.config.writingStyle}
Engagement style: ${persona.config.engagementStyle}

Here are tweets that this persona might quote-tweet:
${tweetList}

Generate exactly ${count} quote tweet(s). A quote tweet adds commentary on top of the original — it's NOT a reply, it's a repost with added perspective.

HARD CONSTRAINT — every "content" field MUST be 280 characters or fewer. Count carefully. Shorten any draft that exceeds this limit. This is a strict technical limit.

Rules:
- Add real commentary: agree strongly, disagree, add hot take, expand with insight
- Don't just repeat or paraphrase the original
- Match the persona's writing style
- The originalTweetIndex must be a valid index from the list above`;
}

/**
 * Generate quote tweets from a persona about existing tweets.
 *
 * @param persona - The quoting persona.
 * @param targetTweets - Existing tweets to potentially quote.
 * @param count - Number of quote tweets to generate.
 * @returns Validated quote tweets with target tweet indices.
 */
export async function generateQuoteTweets(
  persona: { name: string; handle: string; config: PersonaConfig },
  targetTweets: { index: number; authorHandle: string; content: string }[],
  count: number = 2
): Promise<GeneratedQuoteTweet[]> {
  if (targetTweets.length === 0) return [];

  const prompt = buildQuoteTweetPrompt(persona, targetTweets, count);
  const jsonSchema = z.toJSONSchema(QuoteTweetBatchSchema, { target: "draft-7" });

  const response = await withRetry(
    () =>
      getGeminiClient().models.generateContent({
        model: MODELS.lite,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature: 0.9,
        },
      }),
    `QuoteTweets from @${persona.handle}`
  );

  const batch = parseGeminiResponse(
    response.text,
    QuoteTweetBatchSchema,
    `QuoteTweets @${persona.handle}`
  );

  return batch.quoteTweets.filter((qt) => qt.originalTweetIndex < targetTweets.length);
}
