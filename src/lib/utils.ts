import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a Date into a compact relative time string (e.g. "2m", "4h", "3d").
 * Falls back to a short date ("Jan 5") for anything older than 7 days,
 * or "Jan 5, 2024" if older than the current year.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return "now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days}d`;

  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();

  if (date.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`;
  }

  return `${month} ${day}, ${date.getFullYear()}`;
}

/**
 * Format a number into a compact string (e.g. 1200 → "1.2K", 3500000 → "3.5M").
 * Returns the plain number as a string for values under 1,000.
 */
export function formatCompactNumber(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1_000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  const m = n / 1_000_000;
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}
