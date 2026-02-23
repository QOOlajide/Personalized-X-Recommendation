import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GeneratedPersona } from "../schemas/persona";

// ---------------------------------------------------------------------------
// Mock the Gemini client so no real API calls are made
// ---------------------------------------------------------------------------

const mockGenerateContent = vi.fn();

vi.mock("../gemini", () => ({
  getGeminiClient: () => ({
    models: {
      generateContent: mockGenerateContent,
    },
  }),
  MODELS: {
    flash: "gemini-3-flash-preview",
    pro: "gemini-3-pro-preview",
  },
}));

// Import AFTER mocking so the mock is in place
import {
  generatePersonaBatch,
  generatePersonas,
  withRetry,
} from "../persona-generator";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

/** A minimal valid persona matching GeneratedPersonaSchema. */
function makePersona(handle: string): GeneratedPersona {
  return {
    name: "Test User",
    handle,
    bio: "A test persona.",
    location: "Test City",
    config: {
      archetype: "developer",
      interests: ["TypeScript", "testing"],
      writingStyle: "concise and clear",
      postingFrequency: "medium",
      engagementStyle: "replies thoughtfully",
    },
  };
}

/** Helper: make the mock return a valid JSON batch. */
function mockValidResponse(personas: GeneratedPersona[]) {
  mockGenerateContent.mockResolvedValueOnce({
    text: JSON.stringify({ personas }),
  });
}

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the result on first success (no retry needed)", async () => {
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withRetry(fn, "test");

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("retries on 503 UNAVAILABLE and succeeds on second attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
      .mockResolvedValueOnce("recovered");

    const promise = withRetry(fn, "test");
    // Advance past the first retry delay (2s)
    await vi.advanceTimersByTimeAsync(2_000);

    const result = await promise;
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 RESOURCE_EXHAUSTED", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("429 RESOURCE_EXHAUSTED"))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn, "test");
    await vi.advanceTimersByTimeAsync(2_000);

    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on non-retryable errors (e.g. auth failure)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new Error("GEMINI_API_KEY is not set"));

    await expect(withRetry(fn, "test")).rejects.toThrow("GEMINI_API_KEY");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("throws after exhausting all attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("503 UNAVAILABLE"));

    const promise = withRetry(fn, "test");
    // Advance through retry delays: 2s + 4s
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(4_000);

    await expect(promise).rejects.toThrow("503 UNAVAILABLE");
    // 3 total attempts (1 initial + 2 retries)
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses exponential backoff delays (2s, 4s)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("503 UNAVAILABLE"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const promise = withRetry(fn, "batch");

    // After first failure, logs retry in 2s
    await vi.advanceTimersByTimeAsync(2_000);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("2s");

    // After second failure, logs retry in 4s
    await vi.advanceTimersByTimeAsync(4_000);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[1][0]).toContain("4s");

    // Third attempt also fails → rejects
    await expect(promise).rejects.toThrow("503");

    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// generatePersonaBatch
// ---------------------------------------------------------------------------

describe("generatePersonaBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed personas from a valid Gemini response", async () => {
    const personas = [makePersona("ali_codes"), makePersona("sara_writes")];
    mockValidResponse(personas);

    const result = await generatePersonaBatch(2);

    expect(result).toHaveLength(2);
    expect(result[0].handle).toBe("ali_codes");
    expect(result[1].handle).toBe("sara_writes");
  });

  it("calls Gemini with the flash model", async () => {
    mockValidResponse([makePersona("test_user")]);

    await generatePersonaBatch(1);

    expect(mockGenerateContent).toHaveBeenCalledOnce();
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.model).toBe("gemini-3-flash-preview");
  });

  it("requests JSON response format", async () => {
    mockValidResponse([makePersona("test_user")]);

    await generatePersonaBatch(1);

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.config.responseMimeType).toBe("application/json");
  });

  it("throws an actionable error when Gemini returns empty text", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: null });

    await expect(generatePersonaBatch(1)).rejects.toThrow(
      "Gemini returned an empty response"
    );
  });

  it("throws an actionable error when Gemini returns invalid JSON", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "{ broken json",
    });

    await expect(generatePersonaBatch(1)).rejects.toThrow(
      "Gemini returned invalid JSON"
    );
  });

  it("includes raw response in JSON parse error message", async () => {
    const badResponse = '```json\n{"not": "valid"}\n```';
    mockGenerateContent.mockResolvedValueOnce({ text: badResponse });

    await expect(generatePersonaBatch(1)).rejects.toThrow("```json");
  });

  it("throws an actionable error when JSON doesn't match schema", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ personas: [{ name: "Incomplete" }] }),
    });

    await expect(generatePersonaBatch(1)).rejects.toThrow(
      "PersonaBatchSchema"
    );
  });

  it("passes existing handles to avoid in the prompt", async () => {
    mockValidResponse([makePersona("new_user")]);

    await generatePersonaBatch(1, undefined, ["old_handle_1", "old_handle_2"]);

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain("old_handle_1");
    expect(callArgs.contents).toContain("old_handle_2");
  });

  it("includes the requested count in the prompt", async () => {
    mockValidResponse([makePersona("test_user")]);

    await generatePersonaBatch(7);

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain("exactly 7");
  });
});

// ---------------------------------------------------------------------------
// generatePersonas (multi-batch orchestration)
// ---------------------------------------------------------------------------

describe("generatePersonas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates the requested total across multiple batches", async () => {
    // Request 3 personas — should call Gemini once (batch size fits)
    mockValidResponse([
      makePersona("user_1"),
      makePersona("user_2"),
      makePersona("user_3"),
    ]);

    const result = await generatePersonas(3);

    expect(result).toHaveLength(3);
  });

  it("deduplicates handles across batches using Set", async () => {
    // First batch: 2 personas
    mockValidResponse([makePersona("ali"), makePersona("sara")]);
    // Second batch: returns 2, but one is a duplicate of "ali"
    mockValidResponse([makePersona("ali"), makePersona("omar")]);

    const result = await generatePersonas(3);

    const handles = result.map((p) => p.handle);
    // "ali" should appear only once
    expect(handles.filter((h) => h === "ali")).toHaveLength(1);
    // Should have 3 unique personas total
    expect(result).toHaveLength(3);
  });

  it("calls the onBatch callback with progress", async () => {
    mockValidResponse([makePersona("user_1"), makePersona("user_2")]);

    const onBatch = vi.fn();
    await generatePersonas(2, onBatch);

    expect(onBatch).toHaveBeenCalled();
    // First arg is the batch array, second is total progress
    const [batch, progress] = onBatch.mock.calls[0];
    expect(batch).toHaveLength(2);
    expect(progress).toBe(2);
  });

  it("keeps requesting batches until target is met", async () => {
    // 12 personas requested, batch size is 10
    // First batch: 10 personas
    const batch1 = Array.from({ length: 10 }, (_, i) =>
      makePersona(`user_${i}`)
    );
    mockValidResponse(batch1);

    // Second batch: 2 more
    const batch2 = [makePersona("user_10"), makePersona("user_11")];
    mockValidResponse(batch2);

    const result = await generatePersonas(12);

    expect(result).toHaveLength(12);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("returns empty array for zero total", async () => {
    // Edge case: requesting 0 personas should immediately return empty
    const result = await generatePersonas(0);
    expect(result).toHaveLength(0);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
