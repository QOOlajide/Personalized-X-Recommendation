import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MODELS } from "../gemini";

// =============================================================================
// MODELS constant
// =============================================================================

describe("MODELS", () => {
  it("has a lite model identifier", () => {
    expect(MODELS.lite).toBeDefined();
    expect(typeof MODELS.lite).toBe("string");
    expect(MODELS.lite.length).toBeGreaterThan(0);
  });

  it("has a flash model identifier", () => {
    expect(MODELS.flash).toBeDefined();
    expect(typeof MODELS.flash).toBe("string");
    expect(MODELS.flash.length).toBeGreaterThan(0);
  });

  it("lite and flash are different models", () => {
    expect(MODELS.lite).not.toBe(MODELS.flash);
  });
});

// =============================================================================
// getGeminiClient — lazy initialization
// =============================================================================

describe("getGeminiClient", () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    // Save the current key and clear the module cache so each test
    // gets a fresh gemini.ts with _client reset to null.
    savedKey = process.env.GEMINI_API_KEY;
    vi.resetModules();
  });

  afterEach(() => {
    // Restore the original key
    if (savedKey !== undefined) {
      process.env.GEMINI_API_KEY = savedKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it("importing the module does NOT throw when API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    // Dynamic import — if this throws, the module crashes at evaluation time
    const module = await import("../gemini");
    expect(module.MODELS).toBeDefined();
    expect(module.getGeminiClient).toBeTypeOf("function");
  });

  it("throws a clear error when calling getGeminiClient without API key", async () => {
    delete process.env.GEMINI_API_KEY;

    // Fresh dynamic import after vi.resetModules() gives us a clean _client
    const { getGeminiClient } = await import("../gemini");

    expect(() => getGeminiClient()).toThrowError("GEMINI_API_KEY");
  });

  it("error message includes the API key signup URL", async () => {
    delete process.env.GEMINI_API_KEY;

    const { getGeminiClient } = await import("../gemini");

    expect(() => getGeminiClient()).toThrowError("aistudio.google.com");
  });
});
