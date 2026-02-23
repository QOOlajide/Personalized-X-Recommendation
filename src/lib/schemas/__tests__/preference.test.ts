import { describe, it, expect } from "vitest";
import {
  UpdateAlgorithmPreferenceSchema,
  UpdateTopicPreferenceSchema,
} from "../preference";

describe("UpdateAlgorithmPreferenceSchema", () => {
  it("accepts valid weights", () => {
    const result = UpdateAlgorithmPreferenceSchema.safeParse({
      recencyWeight: 0.8,
      popularityWeight: 0.3,
      networkWeight: 0.6,
      diversityWeight: 0.9,
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial update (single weight)", () => {
    const result = UpdateAlgorithmPreferenceSchema.safeParse({
      recencyWeight: 0.7,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = UpdateAlgorithmPreferenceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts boundary value 0.0", () => {
    const result = UpdateAlgorithmPreferenceSchema.safeParse({
      recencyWeight: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts boundary value 1.0", () => {
    const result = UpdateAlgorithmPreferenceSchema.safeParse({
      popularityWeight: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects weight above 1.0", () => {
    const result = UpdateAlgorithmPreferenceSchema.safeParse({
      recencyWeight: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative weight", () => {
    const result = UpdateAlgorithmPreferenceSchema.safeParse({
      diversityWeight: -0.1,
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateTopicPreferenceSchema", () => {
  it("accepts valid topicId and weight", () => {
    const result = UpdateTopicPreferenceSchema.safeParse({
      topicId: "cm1234567890abcdef",
      weight: 0.8,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing topicId", () => {
    const result = UpdateTopicPreferenceSchema.safeParse({
      weight: 0.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing weight", () => {
    const result = UpdateTopicPreferenceSchema.safeParse({
      topicId: "cm1234567890abcdef",
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight out of range", () => {
    const result = UpdateTopicPreferenceSchema.safeParse({
      topicId: "cm1234567890abcdef",
      weight: 2.0,
    });
    expect(result.success).toBe(false);
  });
});
