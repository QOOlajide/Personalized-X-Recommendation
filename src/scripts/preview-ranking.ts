/**
 * Throwaway verification script for the Phase 5 preference-override path.
 *
 * Runs the real ranking pipeline for one user under several preference
 * profiles and prints the resulting feed orderings side by side, so you
 * can SEE that changing the weights actually re-ranks the feed.
 *
 * Nothing is written to the database — overrides are transient (the same
 * mechanism the live slider preview will use).
 *
 * Run with:
 *   npx tsx src/scripts/preview-ranking.ts            (auto-picks your real user)
 *   npx tsx src/scripts/preview-ranking.ts <userId>   (explicit user)
 *
 * Requires DATABASE_URL in .env and a seeded network (personas + posts).
 */

import "dotenv/config";
import { db } from "../lib/db";
import { getFeedForUser } from "../services/feed/get-feed";
import type { PreferenceOverrides } from "../services/ranking";

// ---------------------------------------------------------------------------
// Preference profiles to compare
// ---------------------------------------------------------------------------

const PROFILES: { label: string; overrides?: PreferenceOverrides }[] = [
  { label: "Balanced (no overrides)", overrides: undefined },
  {
    label: "Recency-max",
    overrides: {
      preferences: { recencyWeight: 1, popularityWeight: 0, networkWeight: 0 },
    },
  },
  {
    label: "Popularity-max",
    overrides: {
      preferences: { popularityWeight: 1, recencyWeight: 0, networkWeight: 0 },
    },
  },
  {
    label: "Network-max",
    overrides: {
      preferences: { networkWeight: 1, recencyWeight: 0, popularityWeight: 0 },
    },
  },
];

const TOP_N = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ageLabel(createdAt: Date): string {
  const mins = Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

async function resolveUserId(): Promise<string | null> {
  const argId = process.argv[2];
  if (argId) return argId;

  // Prefer a real (non-persona) user; fall back to any user.
  const real = await db.user.findFirst({
    where: { isPersona: false },
    select: { id: true, handle: true },
  });
  if (real) {
    console.log(`Using real user @${real.handle} (${real.id})\n`);
    return real.id;
  }

  const any = await db.user.findFirst({ select: { id: true, handle: true } });
  if (any) {
    console.log(
      `No real user found; falling back to @${any.handle} (${any.id})\n`
    );
    return any.id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const userId = await resolveUserId();
  if (!userId) {
    console.error(
      "No users in the database. Seed the network first:\n" +
        "  npx tsx src/scripts/seed-personas.ts\n" +
        "  npx tsx src/scripts/seed-content.ts"
    );
    return;
  }

  for (const { label, overrides } of PROFILES) {
    const { items, meta } = await getFeedForUser(userId, overrides);

    console.log("=".repeat(72));
    console.log(`${label}`);
    console.log(
      `  sourced ${meta.candidatesSourced} → feed ${meta.feedSize} in ${meta.pipelineMs}ms`
    );
    console.log("-".repeat(72));

    if (items.length === 0) {
      console.log("  (empty feed — is the database seeded?)");
      console.log();
      continue;
    }

    console.log(
      `  #  ${"score".padEnd(7)} ${"age".padEnd(5)} ${"likes".padEnd(6)} ${"src".padEnd(4)} author / post`
    );
    items.slice(0, TOP_N).forEach((p, i) => {
      const rank = String(i + 1).padStart(2);
      const score = p.score.toFixed(3).padEnd(7);
      const age = ageLabel(p.createdAt).padEnd(5);
      const likes = String(p.likeCount).padEnd(6);
      const src = (p.source === "in_network" ? "net" : "out").padEnd(4);
      const snippet = p.content.replace(/\s+/g, " ").slice(0, 38);
      console.log(`  ${rank} ${score} ${age} ${likes} ${src} @${p.author.handle}: ${snippet}`);
    });
    console.log();
  }

  console.log("=".repeat(72));
  console.log(
    "If the top posts reorder between profiles, the override path works."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
