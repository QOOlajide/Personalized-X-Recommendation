/**
 * Zod schemas for LLM-generated content (structured output from Gemini).
 *
 * These schemas validate the JSON that Gemini returns when generating
 * tweets, threads, and replies. Used with Gemini's responseJsonSchema
 * to enforce structure at generation time AND validated again on our side
 * (LLMs can still return malformed output in structured mode).
 */

import { z } from "zod/v4";
import { TOPICS } from "../../seed/topics";

// Build a list of valid topic slugs from the static topic definitions
const TOPIC_SLUGS = TOPICS.map((t) => t.slug);

// ---------------------------------------------------------------------------
// Standalone Tweets
// ---------------------------------------------------------------------------

export const GeneratedTweetSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(280)
    .describe("Tweet text, max 280 characters. Must match the persona's writing style."),
  topicSlugs: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe(
      `1-3 topic slugs from: ${TOPIC_SLUGS.join(", ")}. Pick the most relevant topics.`
    ),
});

export type GeneratedTweet = z.infer<typeof GeneratedTweetSchema>;

export const TweetBatchSchema = z.object({
  tweets: z.array(GeneratedTweetSchema).min(1),
});

export type TweetBatch = z.infer<typeof TweetBatchSchema>;

// ---------------------------------------------------------------------------
// Threads (multi-tweet chains)
// ---------------------------------------------------------------------------

export const GeneratedThreadSchema = z.object({
  topicSlugs: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("Topic slugs for the entire thread."),
  posts: z
    .array(
      z.object({
        content: z.string().min(1).max(280).describe("Tweet text for this thread segment."),
      })
    )
    .min(2)
    .max(6)
    .describe("Thread posts in order. First post is the thread starter, rest are continuations."),
});

export type GeneratedThread = z.infer<typeof GeneratedThreadSchema>;

export const ThreadBatchSchema = z.object({
  threads: z.array(GeneratedThreadSchema).min(1),
});

export type ThreadBatch = z.infer<typeof ThreadBatchSchema>;

// ---------------------------------------------------------------------------
// Replies (persona responds to an existing tweet)
// ---------------------------------------------------------------------------

export const GeneratedReplySchema = z.object({
  /** Index into the original tweets array that this reply targets */
  originalTweetIndex: z
    .number()
    .int()
    .min(0)
    .describe("Index of the tweet being replied to (from the provided list)."),
  content: z
    .string()
    .min(1)
    .max(280)
    .describe("Reply text. Must feel like a natural response matching the replying persona's voice."),
});

export type GeneratedReply = z.infer<typeof GeneratedReplySchema>;

export const ReplyBatchSchema = z.object({
  replies: z.array(GeneratedReplySchema).min(1),
});

export type ReplyBatch = z.infer<typeof ReplyBatchSchema>;

// ---------------------------------------------------------------------------
// Quote Tweets (persona comments on an existing tweet)
// ---------------------------------------------------------------------------

export const GeneratedQuoteTweetSchema = z.object({
  /** Index into the original tweets array being quoted */
  originalTweetIndex: z
    .number()
    .int()
    .min(0)
    .describe("Index of the tweet being quote-tweeted (from the provided list)."),
  content: z
    .string()
    .min(1)
    .max(280)
    .describe("Quote tweet commentary. Should add perspective, not just repeat the original."),
});

export type GeneratedQuoteTweet = z.infer<typeof GeneratedQuoteTweetSchema>;

export const QuoteTweetBatchSchema = z.object({
  quoteTweets: z.array(GeneratedQuoteTweetSchema).min(1),
});

export type QuoteTweetBatch = z.infer<typeof QuoteTweetBatchSchema>;
