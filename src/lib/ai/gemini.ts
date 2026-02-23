import { GoogleGenAI } from "@google/genai";

/** Model identifiers — centralised so a rename only touches one file. */
export const MODELS = {
  /** Fast, cost-effective generation (personas, tweets, engagement). */
  flash: "gemini-2.5-flash",
  /** Complex reasoning tasks (if needed in the future). */
  pro: "gemini-3-pro-preview",
} as const;
/**
 * Lazily-initialized Gemini client singleton.
 *
 * Why lazy? If this were created at module-evaluation time, any file that
 * transitively imports gemini.ts would crash the entire app when
 * GEMINI_API_KEY is missing — even pages unrelated to AI.
 * By deferring creation to first use, only the code path that actually
 * calls the LLM will fail, with a clear error message.
 */
let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Get one at https://aistudio.google.com/apikey"
      );
    }

    _client = new GoogleGenAI({ apiKey });
  }

  return _client;
}
