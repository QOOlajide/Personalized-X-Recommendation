/**
 * User-related Zod schemas for input validation.
 *
 * Used at API boundaries (Server Actions, Route Handlers) to validate
 * user input before it reaches the database layer.
 */

import { z } from "zod/v4";

// -- Registration & Auth --

export const SignUpSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or less"),
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(30, "Handle must be 30 characters or less")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Handle can only contain letters, numbers, and underscores"
    ),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof SignInSchema>;

// -- Profile Update --

export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  bio: z.string().max(160, "Bio must be 160 characters or less").optional(),
  location: z
    .string()
    .max(100, "Location must be 100 characters or less")
    .optional(),
  website: z.url("Invalid URL").optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
