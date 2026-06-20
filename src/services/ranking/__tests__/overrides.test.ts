/**
 * Tests for applyOverrides (ranking/index.ts).
 *
 * Verifies transient preference-override semantics used by live preview:
 *   - No overrides → context unchanged
 *   - Partial algorithm overrides merge field-by-field
 *   - Topic weights merge key-by-key (override wins)
 */

import { describe, it, expect, vi } from "vitest";

// `applyOverrides` is pure, but it lives in index.ts which imports the
// Prisma client at module scope — that throws without DATABASE_URL. Stub
// the db so importing the module under test never evaluates it.
vi.mock("../../../lib/db", () => ({ db: {} }));

import { applyOverrides } from "../index";
import type { RankingContext } from "../types";
import { DEFAULT_PREFERENCES } from "../types";

function makeContext(overrides: Partial<RankingContext> = {}): RankingContext {
  return {
    userId: "user-1",
    preferences: { ...DEFAULT_PREFERENCES },
    topicWeights: { tech: 0.5, sports: 0.5 },
    followingIds: new Set(["author-1"]),
    ...overrides,
  };
}

describe("applyOverrides", () => {
  it("returns the context unchanged when no overrides are given", () => {
    const ctx = makeContext();
    expect(applyOverrides(ctx, undefined)).toBe(ctx);
  });

  it("merges partial algorithm weights without dropping the rest", () => {
    const ctx = makeContext();

    const result = applyOverrides(ctx, {
      preferences: { recencyWeight: 1.0 },
    });

    expect(result.preferences).toEqual({
      ...DEFAULT_PREFERENCES,
      recencyWeight: 1.0,
    });
  });

  it("merges topic weights per key, overriding only what is supplied", () => {
    const ctx = makeContext();

    const result = applyOverrides(ctx, {
      topicWeights: { tech: 0.1, ai: 0.9 },
    });

    expect(result.topicWeights).toEqual({
      tech: 0.1,
      sports: 0.5,
      ai: 0.9,
    });
  });

  it("does not mutate the original context", () => {
    const ctx = makeContext();

    applyOverrides(ctx, {
      preferences: { recencyWeight: 0.0 },
      topicWeights: { tech: 0.0 },
    });

    expect(ctx.preferences.recencyWeight).toBe(DEFAULT_PREFERENCES.recencyWeight);
    expect(ctx.topicWeights.tech).toBe(0.5);
  });
});
