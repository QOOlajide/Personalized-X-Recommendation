/**
 * Tests for the preferences data-access layer (get-preferences.ts).
 *
 * Covers:
 *   - Pure topic-weight merge (catalog + user weights → complete list)
 *   - Algorithm preference defaults vs. stored values
 *   - Topic preference assembly with the DB mocked
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/db", () => ({
  db: {
    algorithmPreference: { findUnique: vi.fn() },
    topic: { findMany: vi.fn() },
    userTopicPreference: { findMany: vi.fn() },
  },
}));

import {
  mergeTopicWeights,
  getAlgorithmPreference,
  getTopicPreferences,
  DEFAULT_TOPIC_WEIGHT,
} from "../get-preferences";
import { db } from "../../../lib/db";
import { DEFAULT_PREFERENCES } from "../../ranking/types";

const mockedAlgoFindUnique = vi.mocked(db.algorithmPreference.findUnique);
const mockedTopicFindMany = vi.mocked(db.topic.findMany);
const mockedUserTopicFindMany = vi.mocked(db.userTopicPreference.findMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mergeTopicWeights", () => {
  it("uses the default weight for topics the user has not tuned", () => {
    const result = mergeTopicWeights(
      [{ id: "t1", name: "Tech", slug: "tech" }],
      []
    );

    expect(result).toEqual([
      { topicId: "t1", name: "Tech", slug: "tech", weight: DEFAULT_TOPIC_WEIGHT },
    ]);
  });

  it("applies the user's stored weight when present", () => {
    const result = mergeTopicWeights(
      [
        { id: "t1", name: "Tech", slug: "tech" },
        { id: "t2", name: "Sports", slug: "sports" },
      ],
      [{ topicId: "t2", weight: 0.9 }]
    );

    expect(result).toEqual([
      { topicId: "t1", name: "Tech", slug: "tech", weight: DEFAULT_TOPIC_WEIGHT },
      { topicId: "t2", name: "Sports", slug: "sports", weight: 0.9 },
    ]);
  });

  it("preserves the input topic order", () => {
    const result = mergeTopicWeights(
      [
        { id: "b", name: "Beta", slug: "beta" },
        { id: "a", name: "Alpha", slug: "alpha" },
      ],
      []
    );

    expect(result.map((r) => r.topicId)).toEqual(["b", "a"]);
  });
});

describe("getAlgorithmPreference", () => {
  it("returns balanced defaults when the user has no stored row", async () => {
    mockedAlgoFindUnique.mockResolvedValue(null as never);

    const prefs = await getAlgorithmPreference("user-1");

    expect(prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it("maps the stored weights when a row exists", async () => {
    mockedAlgoFindUnique.mockResolvedValue({
      recencyWeight: 0.8,
      popularityWeight: 0.2,
      networkWeight: 0.6,
      diversityWeight: 0.4,
    } as never);

    const prefs = await getAlgorithmPreference("user-1");

    expect(prefs).toEqual({
      recencyWeight: 0.8,
      popularityWeight: 0.2,
      networkWeight: 0.6,
      diversityWeight: 0.4,
    });
  });
});

describe("getTopicPreferences", () => {
  it("merges the full topic catalog with the user's weights", async () => {
    mockedTopicFindMany.mockResolvedValue([
      { id: "t1", name: "Tech", slug: "tech" },
      { id: "t2", name: "Sports", slug: "sports" },
    ] as never);
    mockedUserTopicFindMany.mockResolvedValue([
      { topicId: "t1", weight: 1.0 },
    ] as never);

    const result = await getTopicPreferences("user-1");

    expect(result).toEqual([
      { topicId: "t1", name: "Tech", slug: "tech", weight: 1.0 },
      { topicId: "t2", name: "Sports", slug: "sports", weight: DEFAULT_TOPIC_WEIGHT },
    ]);
  });
});
