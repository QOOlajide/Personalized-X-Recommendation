import { z } from "zod/v4";
import { getGeminiClient, MODELS } from "./gemini";
import {
  PERSONA_ARCHETYPES,
  PersonaBatchSchema,
  type GeneratedPersona,
  type PersonaArchetype,
} from "./schemas/persona";

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(
  archetypes: PersonaArchetype[],
  count: number,
  existingHandles: string[]
): string {
  const avoidList =
    existingHandles.length > 0
      ? `\nDo NOT reuse these handles: ${existingHandles.join(", ")}`
      : "";

  return `You are generating synthetic social media personas for a Twitter/X-like platform.

Generate exactly ${count} unique personas. Distribute them across these archetypes: ${archetypes.join(", ")}.

Each persona must feel like a real person (or brand account) with a distinct voice.
- Names should be realistic and culturally diverse (global, not just Western).
- Handles should be creative and realistic (lowercase + underscores + numbers allowed).
- Bios should sound like real Twitter bios — concise, personality-driven, max 160 chars.
- Locations should be real cities/countries.
- Interests must be specific (e.g. "functional programming" not just "technology").
- Writing style should describe HOW they write, not WHAT they write about.
- Engagement style should describe interaction patterns.
${avoidList}

Important: Ensure variety in gender, ethnicity, geography, and personality.`;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3; // Total calls (1 initial + 2 retries)
const BASE_DELAY_MS = 2_000; // 2s → 4s exponential backoff

/**
 * Retry helper with exponential backoff for transient API errors.
 * Only retries on 503 (UNAVAILABLE) and 429 (RESOURCE_EXHAUSTED) errors.
 * Non-retryable errors (auth failures, schema errors) fail immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRetryable =
        message.includes("503") ||
        message.includes("429") ||
        message.includes("UNAVAILABLE") ||
        message.includes("RESOURCE_EXHAUSTED");

      if (!isRetryable || attempt === MAX_ATTEMPTS) {
        throw error;
      }

      const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(
        `  ⚠️  ${label}: transient error (attempt ${attempt}/${MAX_ATTEMPTS}), ` +
          `retrying in ${delayMs / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // TypeScript exhaustiveness — unreachable, but satisfies the compiler
  throw new Error(`${label}: exhausted all retries`);
}

/**
 * Generate a batch of personas using Gemini 3 Flash with structured output.
 * Includes automatic retry with exponential backoff for transient API errors
 * (503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED).
 *
 * @param count - Number of personas to generate in this batch (max ~10 for quality).
 * @param archetypes - Which archetypes to distribute across.
 * @param existingHandles - Handles already in the DB to avoid collisions.
 * @returns Parsed and validated array of GeneratedPersona.
 */
export async function generatePersonaBatch(
  count: number = BATCH_SIZE,
  archetypes: PersonaArchetype[] = [...PERSONA_ARCHETYPES],
  existingHandles: string[] = []
): Promise<GeneratedPersona[]> {
  const prompt = buildPrompt(archetypes, count, existingHandles);
  const jsonSchema = z.toJSONSchema(PersonaBatchSchema, { target: "draft-7" });

  const response = await withRetry(
    () =>
      getGeminiClient().models.generateContent({
        model: MODELS.flash,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature: 1.0, // High creativity for diverse personas
        },
      }),
    `Gemini batch (${count} personas)`
  );

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  // Parse raw JSON — LLMs can return malformed output even in structured mode
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Gemini returned invalid JSON. ` +
        `Parse error: ${error instanceof Error ? error.message : String(error)}. ` +
        `Raw response (first 500 chars): ${text.slice(0, 500)}`
    );
  }

  // Validate against our schema — safeParse gives us control over the error message
  const result = PersonaBatchSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Gemini JSON did not match PersonaBatchSchema. ` +
        `Validation errors: ${JSON.stringify(result.error.issues, null, 2)}`
    );
  }

  return result.data.personas;
}

/**
 * Generate a large number of personas in sequential batches.
 * Collects handles as it goes to prevent duplicates across batches.
 *
 * Uses a Set<string> for O(1) handle lookups instead of Array.includes()
 * which would be O(n) per check — important for scalability at 500+ personas.
 *
 * @param total - Total personas to generate.
 * @param onBatch - Optional callback after each batch (for progress reporting).
 * @returns All generated personas.
 */
export async function generatePersonas(
  total: number,
  onBatch?: (batch: GeneratedPersona[], progress: number) => void
): Promise<GeneratedPersona[]> {
  const allPersonas: GeneratedPersona[] = [];
  const existingHandles = new Set<string>();

  let remaining = total;
  while (remaining > 0) {
    const batchSize = Math.min(remaining, BATCH_SIZE);

    const batch = await generatePersonaBatch(
      batchSize,
      [...PERSONA_ARCHETYPES],
      [...existingHandles] // Spread Set into array for the prompt builder
    );

    for (const persona of batch) {
      // Guard against duplicate handles within this run — Set.has() is O(1)
      if (!existingHandles.has(persona.handle)) {
        allPersonas.push(persona);
        existingHandles.add(persona.handle);
      }
    }

    remaining = total - allPersonas.length;
    onBatch?.(batch, allPersonas.length);
  }

  return allPersonas;
}
