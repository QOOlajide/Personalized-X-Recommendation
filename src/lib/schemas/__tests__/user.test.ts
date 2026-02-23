import { describe, it, expect } from "vitest";
import { SignUpSchema, SignInSchema, UpdateProfileSchema } from "../user";

describe("SignUpSchema", () => {
  const validInput = {
    name: "Ali Hassan",
    email: "ali@example.com",
    password: "securepass123",
    handle: "ali_hassan",
  };

  it("accepts valid sign-up input", () => {
    const result = SignUpSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = SignUpSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = SignUpSchema.safeParse({ ...validInput, email: "not-email" });
    expect(result.success).toBe(false);
  });

  it("rejects short password (< 8 chars)", () => {
    const result = SignUpSchema.safeParse({ ...validInput, password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects password over 128 chars", () => {
    const result = SignUpSchema.safeParse({
      ...validInput,
      password: "a".repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it("rejects handle shorter than 3 chars", () => {
    const result = SignUpSchema.safeParse({ ...validInput, handle: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects handle with spaces", () => {
    const result = SignUpSchema.safeParse({
      ...validInput,
      handle: "bad handle",
    });
    expect(result.success).toBe(false);
  });

  it("rejects handle with special characters", () => {
    const result = SignUpSchema.safeParse({
      ...validInput,
      handle: "bad@handle!",
    });
    expect(result.success).toBe(false);
  });

  it("accepts handle with underscores", () => {
    const result = SignUpSchema.safeParse({
      ...validInput,
      handle: "tech_founder_42",
    });
    expect(result.success).toBe(true);
  });
});

describe("SignInSchema", () => {
  it("accepts valid email and password", () => {
    const result = SignInSchema.safeParse({
      email: "ali@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing password", () => {
    const result = SignInSchema.safeParse({
      email: "ali@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = SignInSchema.safeParse({
      email: "bad",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateProfileSchema", () => {
  it("accepts all valid optional fields", () => {
    const result = UpdateProfileSchema.safeParse({
      name: "Ali Hassan",
      bio: "Building cool things",
      location: "London",
      website: "https://ali.dev",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    const result = UpdateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects bio over 160 chars", () => {
    const result = UpdateProfileSchema.safeParse({
      bio: "a".repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid website URL", () => {
    const result = UpdateProfileSchema.safeParse({
      website: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});
