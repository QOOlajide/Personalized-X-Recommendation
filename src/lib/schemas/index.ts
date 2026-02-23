/**
 * Central export for all Zod validation schemas.
 *
 * Import from "@/lib/schemas" for clean, single-source access
 * to all validation logic across Server Actions and Route Handlers.
 */

export {
  SignUpSchema,
  SignInSchema,
  UpdateProfileSchema,
  type SignUpInput,
  type SignInInput,
  type UpdateProfileInput,
} from "./user";

export {
  CreatePostSchema,
  PostIdSchema,
  type CreatePostInput,
  type PostIdInput,
} from "./post";

export {
  UpdateAlgorithmPreferenceSchema,
  UpdateTopicPreferenceSchema,
  type UpdateAlgorithmPreferenceInput,
  type UpdateTopicPreferenceInput,
} from "./preference";
