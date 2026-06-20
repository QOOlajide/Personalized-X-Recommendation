/**
 * Tests for the preference Server Actions (app/actions/preferences.ts).
 *
 * The viewer resolver, the database, Next's cache, and the feed layer are
 * mocked so these run as fast, deterministic unit tests. Covers: viewer
 * guard, Zod validation, upsert wiring, lazy guest-row creation, the
 * "show less" weight nudge, and live preview.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/services/feed/get-feed", () => ({ getFeedForUser: vi.fn() }));
vi.mock("@/lib/auth/viewer", () => ({
  getViewer: vi.fn(),
  ensureGuestUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    algorithmPreference: { upsert: vi.fn() },
    userTopicPreference: { upsert: vi.fn(), findMany: vi.fn() },
    postTopic: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getFeedForUser } from "@/services/feed/get-feed";
import { getViewer, ensureGuestUser } from "@/lib/auth/viewer";
import {
  updateAlgorithmPreference,
  updateTopicPreference,
  resetAlgorithmPreference,
  showLessLikeThis,
  previewFeed,
} from "../preferences";

const mockedGetViewer = vi.mocked(getViewer);
const mockedEnsureGuestUser = vi.mocked(ensureGuestUser);
const mockedRevalidate = vi.mocked(revalidatePath);
const mockedGetFeed = vi.mocked(getFeedForUser);

function viewer(id: string | null) {
  mockedGetViewer.mockResolvedValue(id ? { id, isGuest: true } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateAlgorithmPreference", () => {
  it("rejects unauthenticated callers", async () => {
    viewer(null);

    const result = await updateAlgorithmPreference({ recencyWeight: 0.8 });

    expect(result).toEqual({ ok: false, error: "No viewer" });
    expect(db.algorithmPreference.upsert).not.toHaveBeenCalled();
  });

  it("rejects out-of-range weights via Zod", async () => {
    viewer("user-1");

    const result = await updateAlgorithmPreference({ recencyWeight: 5 });

    expect(result.ok).toBe(false);
    expect(db.algorithmPreference.upsert).not.toHaveBeenCalled();
  });

  it("rejects an empty update (no weights provided)", async () => {
    viewer("user-1");

    const result = await updateAlgorithmPreference({});

    expect(result).toEqual({ ok: false, error: "No weights provided" });
    expect(db.algorithmPreference.upsert).not.toHaveBeenCalled();
  });

  it("upserts only the provided weights and revalidates the feed", async () => {
    viewer("user-1");

    const result = await updateAlgorithmPreference({
      recencyWeight: 0.8,
      networkWeight: 0.3,
    });

    expect(result.ok).toBe(true);
    expect(mockedEnsureGuestUser).toHaveBeenCalledWith("user-1");
    expect(db.algorithmPreference.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", recencyWeight: 0.8, networkWeight: 0.3 },
      update: { recencyWeight: 0.8, networkWeight: 0.3 },
    });
    expect(mockedRevalidate).toHaveBeenCalledWith("/feed");
  });
});

describe("resetAlgorithmPreference", () => {
  it("writes balanced 0.5 defaults", async () => {
    viewer("user-1");

    const result = await resetAlgorithmPreference();

    expect(result.ok).toBe(true);
    const call = vi.mocked(db.algorithmPreference.upsert).mock.calls[0][0];
    expect(call.update).toEqual({
      recencyWeight: 0.5,
      popularityWeight: 0.5,
      networkWeight: 0.5,
      diversityWeight: 0.5,
    });
    expect(mockedRevalidate).toHaveBeenCalledWith("/feed");
  });
});

describe("updateTopicPreference", () => {
  it("upserts the topic weight keyed on the compound unique", async () => {
    viewer("user-1");

    const result = await updateTopicPreference({
      topicId: "ckv000000000000000000000a",
      weight: 0.2,
    });

    expect(result.ok).toBe(true);
    expect(db.userTopicPreference.upsert).toHaveBeenCalledWith({
      where: { userId_topicId: { userId: "user-1", topicId: "ckv000000000000000000000a" } },
      create: { userId: "user-1", topicId: "ckv000000000000000000000a", weight: 0.2 },
      update: { weight: 0.2 },
    });
  });

  it("rejects an invalid (non-cuid) topicId", async () => {
    viewer("user-1");

    const result = await updateTopicPreference({ topicId: "nope", weight: 0.2 });

    expect(result.ok).toBe(false);
    expect(db.userTopicPreference.upsert).not.toHaveBeenCalled();
  });
});

describe("showLessLikeThis", () => {
  it("is a no-op success when the post has no topics", async () => {
    viewer("user-1");
    vi.mocked(db.postTopic.findMany).mockResolvedValue([] as never);

    const result = await showLessLikeThis("post-1");

    expect(result.ok).toBe(true);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("nudges each topic weight down by the step, clamped at 0", async () => {
    viewer("user-1");
    vi.mocked(db.postTopic.findMany).mockResolvedValue([
      { topicId: "t1" },
      { topicId: "t2" },
    ] as never);
    // t1 has a stored weight of 0.1 (→ clamps to 0); t2 has none (→ 0.5 - 0.25 = 0.25)
    vi.mocked(db.userTopicPreference.findMany).mockResolvedValue([
      { topicId: "t1", weight: 0.1 },
    ] as never);
    vi.mocked(db.$transaction).mockResolvedValue([] as never);

    const result = await showLessLikeThis("post-1");

    expect(result.ok).toBe(true);
    // The action builds one upsert promise per topic; capture their inputs.
    expect(db.userTopicPreference.upsert).toHaveBeenCalledTimes(2);
    const weights = vi
      .mocked(db.userTopicPreference.upsert)
      .mock.calls.map((c) => c[0].update);
    expect(weights).toContainEqual({ weight: 0 });
    expect(weights).toContainEqual({ weight: 0.25 });
    expect(mockedRevalidate).toHaveBeenCalledWith("/feed");
  });
});

describe("previewFeed", () => {
  it("re-ranks with overrides without persisting anything", async () => {
    viewer("user-1");
    const fakeFeed = { items: [], meta: { feedSize: 0 } };
    mockedGetFeed.mockResolvedValue(fakeFeed as never);

    const result = await previewFeed({ preferences: { recencyWeight: 1 } });

    expect(result).toEqual({ ok: true, data: fakeFeed });
    expect(mockedGetFeed).toHaveBeenCalledWith("user-1", {
      preferences: { recencyWeight: 1 },
    });
    // Preview must not write or revalidate.
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("returns an error when there is no viewer at all", async () => {
    viewer(null);

    const result = await previewFeed({ preferences: { recencyWeight: 1 } });

    expect(result).toEqual({ ok: false, error: "No viewer" });
    expect(mockedGetFeed).not.toHaveBeenCalled();
  });
});
