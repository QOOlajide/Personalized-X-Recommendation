/**
 * Preference-related Zod schemas for the personalization layer.
 *
 * Validates algorithm tuning inputs and topic preference updates.
 * All weights are clamped to [0.0, 1.0].
 */

import { z } from "zod/v4";

const weightField = z
  .number()
  .min(0, "Weight must be at least 0")
  .max(1, "Weight must be at most 1");

// -- Algorithm Preference Tuning --

export const UpdateAlgorithmPreferenceSchema = z.object({
  recencyWeight: weightField.optional(),
  popularityWeight: weightField.optional(),
  networkWeight: weightField.optional(),
  diversityWeight: weightField.optional(),
});

export type UpdateAlgorithmPreferenceInput = z.infer<
  typeof UpdateAlgorithmPreferenceSchema
>;

// -- Topic Preference --

export const UpdateTopicPreferenceSchema = z.object({
  topicId: z.string().cuid(),
  weight: weightField,
});

export type UpdateTopicPreferenceInput = z.infer<
  typeof UpdateTopicPreferenceSchema
>;
