/**
 * Post-related Zod schemas for input validation.
 *
 * Validates tweet creation, reply, and quote tweet inputs
 * at Server Action boundaries.
 */

import { z } from "zod/v4";

// -- Post Creation --

export const CreatePostSchema = z.object({
  content: z
    .string()
    .min(1, "Post cannot be empty")
    .max(280, "Post must be 280 characters or less"),
  parentId: z.string().cuid().optional(), // Reply to another post
  quotedPostId: z.string().cuid().optional(), // Quote tweet
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

// -- Engagement --

export const PostIdSchema = z.object({
  postId: z.string().cuid(),
});

export type PostIdInput = z.infer<typeof PostIdSchema>;
