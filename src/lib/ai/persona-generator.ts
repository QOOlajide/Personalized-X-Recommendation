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
const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 2_000;
const RATE_LIMIT_FALLBACK_MS = 10_000;
const SCHEMA_RETRY_LIMIT = 2;

/**
 * Parse the server-provided retry delay from a 429 error message.
 * Looks for patterns like "retry in 50.7s" or "retryDelay":"50s".
 * Returns the delay in ms, or null if not found.
 */
export function parseRetryDelay(message: string): number | null {
  const match = message.match(/retry\s*(?:in|Delay[":\s]*)\s*"?(\d+(?:\.\d+)?)\s*s/i);
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000);
  }
  return null;
}

/**
 * Add ±25% jitter to a delay to avoid thundering-herd retries.
 */
function addJitter(ms: number): number {
  const jitter = ms * 0.25 * (2 * Math.random() - 1);
  return Math.max(1000, Math.round(ms + jitter));
}

type ErrorCategory = "rate_limit" | "transient" | "schema" | "fatal";

function categorizeError(message: string): ErrorCategory {
  if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
    return "rate_limit";
  }
  if (message.includes("503") || message.includes("UNAVAILABLE")) {
    return "transient";
  }
  if (message.includes("did not match schema")) {
    return "schema";
  }
  return "fatal";
}

/**
 * Retry helper for Gemini API calls.
 *
 * - 503 UNAVAILABLE: exponential backoff (2s → 4s → 8s) with jitter.
 *   Google treats 503 as transient overload.
 * - 429 RESOURCE_EXHAUSTED: uses the server-provided retryDelay if
 *   present in the error; falls back to a conservative delay otherwise.
 *   429 is a quota/rate-limit signal, not a prompt problem.
 * - Schema validation failures: retried as application-level errors
 *   (the LLM produced bad output, worth one more attempt) with a
 *   separate, smaller retry budget so they don't consume API retries.
 * - Auth failures, missing keys, etc: fail immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let schemaRetries = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const category = categorizeError(message);

      if (category === "fatal") throw error;

      if (category === "schema") {
        schemaRetries++;
        if (schemaRetries > SCHEMA_RETRY_LIMIT) throw error;
        const delayMs = addJitter(BASE_DELAY_MS);
        console.warn(
          `  ⚠️  ${label}: schema mismatch (schema retry ${schemaRetries}/${SCHEMA_RETRY_LIMIT}), ` +
            `retrying in ${(delayMs / 1000).toFixed(1)}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt--; // schema retries don't count against the API attempt budget
        continue;
      }

      if (attempt === MAX_ATTEMPTS) throw error;

      let delayMs: number;
      if (category === "rate_limit") {
        const serverDelay = parseRetryDelay(message);
        delayMs = serverDelay ?? RATE_LIMIT_FALLBACK_MS;
        delayMs = addJitter(delayMs);
      } else {
        delayMs = addJitter(BASE_DELAY_MS * 2 ** (attempt - 1));
      }

      console.warn(
        `  ⚠️  ${label}: ${category} error (attempt ${attempt}/${MAX_ATTEMPTS}), ` +
          `retrying in ${(delayMs / 1000).toFixed(1)}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

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
        model: MODELS.lite,
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
