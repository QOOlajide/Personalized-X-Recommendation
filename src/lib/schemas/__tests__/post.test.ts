import { describe, it, expect } from "vitest";
import { CreatePostSchema, PostIdSchema } from "../post";

describe("CreatePostSchema", () => {
  it("accepts valid post content", () => {
    const result = CreatePostSchema.safeParse({ content: "Hello world!" });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = CreatePostSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("rejects content over 280 characters", () => {
    const result = CreatePostSchema.safeParse({ content: "x".repeat(281) });
    expect(result.success).toBe(false);
  });

  it("accepts content at exactly 280 characters", () => {
    const result = CreatePostSchema.safeParse({ content: "x".repeat(280) });
    expect(result.success).toBe(true);
  });

  it("accepts optional parentId (reply)", () => {
    const result = CreatePostSchema.safeParse({
      content: "Great thread!",
      parentId: "cm1234567890abcdef",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional quotedPostId (quote tweet)", () => {
    const result = CreatePostSchema.safeParse({
      content: "This is interesting",
      quotedPostId: "cm1234567890abcdef",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid parentId format", () => {
    const result = CreatePostSchema.safeParse({
      content: "Reply",
      parentId: "not-a-cuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("PostIdSchema", () => {
  it("accepts valid CUID", () => {
    const result = PostIdSchema.safeParse({
      postId: "cm1234567890abcdef",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = PostIdSchema.safeParse({ postId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects non-CUID string", () => {
    const result = PostIdSchema.safeParse({ postId: "123" });
    expect(result.success).toBe(false);
  });
});
