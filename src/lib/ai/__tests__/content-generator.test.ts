/**
 * Unit tests for content generation schemas.
 *
 * Tests schema validation only — no actual Gemini API calls.
 * The generator functions themselves require the Gemini API key
 * and would be tested via integration tests or manual seed runs.
 */

import { describe, it, expect } from "vitest";
import {
  TweetBatchSchema,
  ThreadBatchSchema,
  ReplyBatchSchema,
  QuoteTweetBatchSchema,
} from "../schemas/content";

describe("TweetBatchSchema", () => {
  it("accepts a valid tweet batch", () => {
    const valid = {
      tweets: [
        { content: "Hello world!", topicSlugs: ["technology"] },
        { content: "AI is transforming everything 🚀", topicSlugs: ["ai-ml", "technology"] },
      ],
    };
    const result = TweetBatchSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects empty tweets array", () => {
    const invalid = { tweets: [] };
    const result = TweetBatchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects tweet content exceeding 280 characters", () => {
    const invalid = {
      tweets: [{ content: "a".repeat(281), topicSlugs: ["technology"] }],
    };
    const result = TweetBatchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects tweets with no topic slugs", () => {
    const invalid = {
      tweets: [{ content: "Hello!", topicSlugs: [] }],
    };
    const result = TweetBatchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects tweets with more than 3 topic slugs", () => {
    const invalid = {
      tweets: [
        { content: "Hello!", topicSlugs: ["a", "b", "c", "d"] },
      ],
    };
    const result = TweetBatchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("ThreadBatchSchema", () => {
  it("accepts a valid thread batch", () => {
    const valid = {
      threads: [
        {
          topicSlugs: ["ai-ml"],
          posts: [
            { content: "Thread 🧵: Why AI matters" },
            { content: "First, let me explain..." },
            { content: "And that's the key insight." },
          ],
        },
      ],
    };
    const result = ThreadBatchSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects thread with fewer than 2 posts", () => {
    const invalid = {
      threads: [
        {
          topicSlugs: ["ai-ml"],
          posts: [{ content: "Single post is not a thread" }],
        },
      ],
    };
    const result = ThreadBatchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects thread with more than 6 posts", () => {
    const invalid = {
      threads: [
        {
          topicSlugs: ["ai-ml"],
          posts: Array.from({ length: 7 }, (_, i) => ({
            content: `Post ${i + 1}`,
          })),
        },
      ],
    };
    const result = ThreadBatchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("ReplyBatchSchema", () => {
  it("accepts valid replies", () => {
    const valid = {
      replies: [
        { originalTweetIndex: 0, content: "Great point!" },
        { originalTweetIndex: 3, content: "I disagree because..." },
      ],
    };
    const result = ReplyBatchSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects negative originalTweetIndex", () => {
    const invalid = {
      replies: [{ originalTweetIndex: -1, content: "Invalid" }],
    };
    const result = ReplyBatchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer originalTweetIndex", () => {
    const invalid = {
      replies: [{ originalTweetIndex: 1.5, content: "Invalid" }],
    };
    const result = ReplyBatchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("QuoteTweetBatchSchema", () => {
  it("accepts valid quote tweets", () => {
    const valid = {
      quoteTweets: [
        { originalTweetIndex: 0, content: "This! 👆" },
      ],
    };
    const result = QuoteTweetBatchSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const invalid = {
      quoteTweets: [{ originalTweetIndex: 0, content: "" }],
    };
    const result = QuoteTweetBatchSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
