/**
 * Tests for shared utility functions (src/lib/utils.ts).
 *
 * formatRelativeTime: converts a Date to a compact relative time string.
 * formatCompactNumber: converts a number to a compact display string.
 */

import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatCompactNumber } from "../utils";

const NOW = new Date("2026-04-16T12:00:00Z");

/** Shortcut: create a Date that is `ms` milliseconds before NOW. */
function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it('returns "now" for future dates', () => {
    const future = new Date(NOW.getTime() + 60_000);
    expect(formatRelativeTime(future, NOW)).toBe("now");
  });

  it("formats seconds", () => {
    expect(formatRelativeTime(ago(0), NOW)).toBe("0s");
    expect(formatRelativeTime(ago(30 * SECOND), NOW)).toBe("30s");
    expect(formatRelativeTime(ago(59 * SECOND), NOW)).toBe("59s");
  });

  it("formats minutes", () => {
    expect(formatRelativeTime(ago(1 * MINUTE), NOW)).toBe("1m");
    expect(formatRelativeTime(ago(45 * MINUTE), NOW)).toBe("45m");
    expect(formatRelativeTime(ago(59 * MINUTE), NOW)).toBe("59m");
  });

  it("formats hours", () => {
    expect(formatRelativeTime(ago(1 * HOUR), NOW)).toBe("1h");
    expect(formatRelativeTime(ago(12 * HOUR), NOW)).toBe("12h");
    expect(formatRelativeTime(ago(23 * HOUR), NOW)).toBe("23h");
  });

  it("formats days (up to 7)", () => {
    expect(formatRelativeTime(ago(1 * DAY), NOW)).toBe("1d");
    expect(formatRelativeTime(ago(5 * DAY), NOW)).toBe("5d");
    expect(formatRelativeTime(ago(7 * DAY), NOW)).toBe("7d");
  });

  it("formats as short date within the same year", () => {
    const jan5 = new Date("2026-01-05T10:00:00Z");
    expect(formatRelativeTime(jan5, NOW)).toBe("Jan 5");
  });

  it("includes year for dates in a previous year", () => {
    const dec25 = new Date("2025-12-25T10:00:00Z");
    expect(formatRelativeTime(dec25, NOW)).toBe("Dec 25, 2025");
  });

  it("boundary: exactly 60 seconds → 1m (not 60s)", () => {
    expect(formatRelativeTime(ago(60 * SECOND), NOW)).toBe("1m");
  });

  it("boundary: exactly 60 minutes → 1h (not 60m)", () => {
    expect(formatRelativeTime(ago(60 * MINUTE), NOW)).toBe("1h");
  });

  it("boundary: exactly 24 hours → 1d (not 24h)", () => {
    expect(formatRelativeTime(ago(24 * HOUR), NOW)).toBe("1d");
  });
});

// ---------------------------------------------------------------------------
// formatCompactNumber
// ---------------------------------------------------------------------------

describe("formatCompactNumber", () => {
  it("returns plain number for values under 1,000", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(42)).toBe("42");
    expect(formatCompactNumber(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(formatCompactNumber(1_000)).toBe("1K");
    expect(formatCompactNumber(1_200)).toBe("1.2K");
    expect(formatCompactNumber(12_400)).toBe("12.4K");
    expect(formatCompactNumber(999_000)).toBe("999K");
  });

  it("formats millions with M suffix", () => {
    expect(formatCompactNumber(1_000_000)).toBe("1M");
    expect(formatCompactNumber(3_500_000)).toBe("3.5M");
  });

  it("drops decimal when it would be .0", () => {
    expect(formatCompactNumber(5_000)).toBe("5K");
    expect(formatCompactNumber(2_000_000)).toBe("2M");
  });
});
