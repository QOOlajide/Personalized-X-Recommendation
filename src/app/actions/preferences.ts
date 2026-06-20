"use server";

/**
 * Preference Server Actions — the write path for the personalization layer.
 *
 * Each action:
 *   1. Resolves the current viewer (anonymous guest, cookie-identified).
 *   2. Validates input with the shared Zod schemas.
 *   3. Ensures the guest's User row exists, then upserts the preference row.
 *   4. Revalidates the feed so the next render re-ranks with new weights.
 *
 * All actions return a discriminated `ActionResult` so client callers can
 * branch on success/failure without throwing.
 */

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getViewer, ensureGuestUser } from "@/lib/auth/viewer";
import {
  UpdateAlgorithmPreferenceSchema,
  UpdateTopicPreferenceSchema,
  type UpdateAlgorithmPreferenceInput,
  type UpdateTopicPreferenceInput,
} from "@/lib/schemas";
import { getFeedForUser, type FeedResponse } from "@/services/feed/get-feed";
import type { PreferenceOverrides } from "@/services/ranking";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** How far "Show less like this" nudges each of a post's topic weights down. */
const SHOW_LESS_STEP = 0.25;

const FEED_PATH = "/feed";

// ---------------------------------------------------------------------------
// Algorithm tuning
// ---------------------------------------------------------------------------

/**
 * Update one or more algorithm tuning weights for the current user.
 * Creates the AlgorithmPreference row on first write.
 */
export async function updateAlgorithmPreference(
  input: UpdateAlgorithmPreferenceInput
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "No viewer" };

  const parsed = UpdateAlgorithmPreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Drop undefined keys so we only write fields the caller actually sent.
  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "No weights provided" };
  }

  await ensureGuestUser(viewer.id);
  await db.algorithmPreference.upsert({
    where: { userId: viewer.id },
    create: { userId: viewer.id, ...data },
    update: data,
  });

  revalidatePath(FEED_PATH);
  return { ok: true, data: undefined };
}

/**
 * Reset all algorithm weights back to the balanced 0.5 defaults.
 */
export async function resetAlgorithmPreference(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "No viewer" };

  const defaults = {
    recencyWeight: 0.5,
    popularityWeight: 0.5,
    networkWeight: 0.5,
    diversityWeight: 0.5,
  };

  await ensureGuestUser(viewer.id);
  await db.algorithmPreference.upsert({
    where: { userId: viewer.id },
    create: { userId: viewer.id, ...defaults },
    update: defaults,
  });

  revalidatePath(FEED_PATH);
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Topic interests
// ---------------------------------------------------------------------------

/**
 * Set the current user's interest weight for a single topic.
 * Creates the UserTopicPreference row on first write.
 */
export async function updateTopicPreference(
  input: UpdateTopicPreferenceInput
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "No viewer" };

  const parsed = UpdateTopicPreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { topicId, weight } = parsed.data;

  await ensureGuestUser(viewer.id);
  await db.userTopicPreference.upsert({
    where: { userId_topicId: { userId: viewer.id, topicId } },
    create: { userId: viewer.id, topicId, weight },
    update: { weight },
  });

  revalidatePath(FEED_PATH);
  return { ok: true, data: undefined };
}

/**
 * "Show less like this" — nudge down the user's weight for every topic
 * attached to a given post. Clamps at 0. Used as per-post feedback that
 * subtly reshapes future rankings.
 */
export async function showLessLikeThis(postId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "No viewer" };

  if (!postId) return { ok: false, error: "postId is required" };

  const postTopics = await db.postTopic.findMany({
    where: { postId },
    select: { topicId: true },
  });

  if (postTopics.length === 0) {
    // Nothing to adjust — treat as a no-op success.
    return { ok: true, data: undefined };
  }

  const topicIds = postTopics.map((pt) => pt.topicId);

  const existing = await db.userTopicPreference.findMany({
    where: { userId: viewer.id, topicId: { in: topicIds } },
    select: { topicId: true, weight: true },
  });
  const currentByTopic = new Map(existing.map((e) => [e.topicId, e.weight]));

  await ensureGuestUser(viewer.id);
  await db.$transaction(
    topicIds.map((topicId) => {
      const current = currentByTopic.get(topicId) ?? 0.5;
      const next = Math.max(0, current - SHOW_LESS_STEP);
      return db.userTopicPreference.upsert({
        where: { userId_topicId: { userId: viewer.id, topicId } },
        create: { userId: viewer.id, topicId, weight: next },
        update: { weight: next },
      });
    })
  );

  revalidatePath(FEED_PATH);
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Live preview
// ---------------------------------------------------------------------------

/**
 * Re-rank the current user's feed against transient (unsaved) preference
 * overrides. Lets the UI preview the effect of a slider before committing
 * it via the update actions above. Persists nothing.
 */
export async function previewFeed(
  overrides: PreferenceOverrides
): Promise<ActionResult<FeedResponse>> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "No viewer" };

  const feed = await getFeedForUser(viewer.id, overrides);
  return { ok: true, data: feed };
}
