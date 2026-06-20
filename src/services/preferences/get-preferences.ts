/**
 * Preferences data-access layer (reads).
 *
 * Single source for loading a user's personalization state:
 *   - Algorithm tuning weights (recency / popularity / network / diversity)
 *   - Per-topic interest weights, merged with the full topic catalog
 *
 * Both reads fall back to neutral defaults when the user has no stored
 * preferences yet, so callers never have to handle "missing row" cases.
 */

import { db } from "../../lib/db";
import type { UserPreferences } from "../ranking/types";
import { DEFAULT_PREFERENCES } from "../ranking/types";

/** Neutral weight applied to any topic the user hasn't explicitly tuned. */
export const DEFAULT_TOPIC_WEIGHT = 0.5;

// ---------------------------------------------------------------------------
// Public types — what the settings UI receives
// ---------------------------------------------------------------------------

/**
 * A topic plus the requesting user's interest weight for it.
 * `weight` is always populated (falls back to DEFAULT_TOPIC_WEIGHT).
 */
export interface TopicPreferenceItem {
  topicId: string;
  name: string;
  slug: string;
  weight: number;
}

export interface PreferencesState {
  algorithm: UserPreferences;
  topics: TopicPreferenceItem[];
}

// ---------------------------------------------------------------------------
// Algorithm preferences
// ---------------------------------------------------------------------------

/**
 * Load the user's algorithm tuning weights, or balanced defaults
 * (all 0.5) when they have no AlgorithmPreference row yet.
 */
export async function getAlgorithmPreference(
  userId: string
): Promise<UserPreferences> {
  const row = await db.algorithmPreference.findUnique({ where: { userId } });

  if (!row) return { ...DEFAULT_PREFERENCES };

  return {
    recencyWeight: row.recencyWeight,
    popularityWeight: row.popularityWeight,
    networkWeight: row.networkWeight,
    diversityWeight: row.diversityWeight,
  };
}

// ---------------------------------------------------------------------------
// Topic preferences
// ---------------------------------------------------------------------------

/**
 * Merge a user's stored topic weights onto the full topic catalog.
 * Pure function so it can be unit-tested without a database.
 */
export function mergeTopicWeights(
  topics: { id: string; name: string; slug: string }[],
  userWeights: { topicId: string; weight: number }[]
): TopicPreferenceItem[] {
  const weightByTopicId = new Map(
    userWeights.map((w) => [w.topicId, w.weight])
  );

  return topics.map((t) => ({
    topicId: t.id,
    name: t.name,
    slug: t.slug,
    weight: weightByTopicId.get(t.id) ?? DEFAULT_TOPIC_WEIGHT,
  }));
}

/**
 * Load every topic alongside the user's weight for it. Topics the user
 * has never tuned come back at DEFAULT_TOPIC_WEIGHT so the UI can render
 * a complete, ordered list of sliders.
 */
export async function getTopicPreferences(
  userId: string
): Promise<TopicPreferenceItem[]> {
  const [topics, userWeights] = await Promise.all([
    db.topic.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    db.userTopicPreference.findMany({
      where: { userId },
      select: { topicId: true, weight: true },
    }),
  ]);

  return mergeTopicWeights(topics, userWeights);
}

// ---------------------------------------------------------------------------
// Combined
// ---------------------------------------------------------------------------

/**
 * Load the user's complete personalization state in one call —
 * algorithm weights plus the full topic-weight list.
 */
export async function getPreferences(
  userId: string
): Promise<PreferencesState> {
  const [algorithm, topics] = await Promise.all([
    getAlgorithmPreference(userId),
    getTopicPreferences(userId),
  ]);

  return { algorithm, topics };
}
