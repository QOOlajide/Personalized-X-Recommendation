import { z } from "zod/v4";

/**
 * Persona archetypes that drive content diversity in the synthetic network.
 * Each maps to a distinct writing style, topic focus, and engagement pattern.
 */
export const PERSONA_ARCHETYPES = [
  "tech_founder",
  "journalist",
  "meme_account",
  "trader",
  "politician",
  "academic",
  "islamic_scholar",
  "artist",
  "sports_commentator",
  "developer",
  "health_fitness",
  "activist",
  "comedian",
  "musician",
  "news_outlet",
] as const;

export type PersonaArchetype = (typeof PERSONA_ARCHETYPES)[number];

/** Schema for the JSON config stored in User.personaConfig */
export const PersonaConfigSchema = z.object({
  archetype: z.enum(PERSONA_ARCHETYPES),
  interests: z
    .array(z.string())
    .min(2)
    .max(6)
    .describe("Topics this persona cares about, e.g. ['AI', 'startups']"),
  writingStyle: z
    .string()
    .describe(
      "Brief description of writing voice, e.g. 'casual, uses emojis, short punchy sentences'"
    ),
  postingFrequency: z
    .enum(["high", "medium", "low"])
    .describe("How often this persona posts — high ≈ 5-10/day, low ≈ 1/day"),
  engagementStyle: z
    .string()
    .describe(
      "How they interact, e.g. 'replies often, rarely reposts' or 'quote-tweets with hot takes'"
    ),
});

export type PersonaConfig = z.infer<typeof PersonaConfigSchema>;

/** Full persona as returned by the LLM (profile fields + config). */
export const GeneratedPersonaSchema = z.object({
  name: z.string().min(2).max(50),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  bio: z.string().max(160),
  location: z.string().max(60),
  website: z.string().url().optional(),
  config: PersonaConfigSchema,
});

export type GeneratedPersona = z.infer<typeof GeneratedPersonaSchema>;

/** Batch response: the LLM generates multiple personas at once. */
export const PersonaBatchSchema = z.object({
  personas: z.array(GeneratedPersonaSchema).min(1),
});

export type PersonaBatch = z.infer<typeof PersonaBatchSchema>;
