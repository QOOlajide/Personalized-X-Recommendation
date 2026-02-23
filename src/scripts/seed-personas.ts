/**
 * Seed script: generates LLM personas via Gemini and inserts them
 * into the database. Run with: npx tsx src/scripts/seed-personas.ts
 *
 * Requires: GEMINI_API_KEY and DATABASE_URL in .env
 */

import "dotenv/config";
import { db } from "../lib/db";
import { generatePersonas } from "../lib/ai/persona-generator";
import type { GeneratedPersona } from "../lib/ai/schemas/persona";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TOTAL_PERSONAS = Number(process.env.SEED_PERSONA_COUNT ?? 20);

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function getExistingHandles(): Promise<string[]> {
  const users = await db.user.findMany({
    where: { isPersona: true },
    select: { handle: true },
  });
  return users.map((u) => u.handle);
}

/**
 * Maps a generated persona to the shape Prisma expects for user creation.
 * Exported for testability — this is a pure function with no side effects.
 */
export function toUserCreateInput(persona: GeneratedPersona) {
  return {
    name: persona.name,
    handle: persona.handle,
    email: `${persona.handle}@persona.local`,
    bio: persona.bio,
    location: persona.location,
    website: persona.website ?? null,
    isPersona: true,
    personaConfig: persona.config,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🌱 Seeding ${TOTAL_PERSONAS} personas via Gemini...\n`);

  const existingHandles = await getExistingHandles();
  if (existingHandles.length > 0) {
    console.log(`  Found ${existingHandles.length} existing personas in DB.`);
  }

  const personas = await generatePersonas(TOTAL_PERSONAS, (batch, progress) => {
    console.log(
      `  ✅ Batch complete — ${batch.length} generated, ${progress}/${TOTAL_PERSONAS} total`
    );
  });

  console.log(`\n💾 Inserting ${personas.length} personas into database...\n`);

  const startTime = Date.now();

  const result = await db.user.createMany({
    data: personas.map(toUserCreateInput),
    skipDuplicates: true, // Silently skips rows that violate unique constraints
  });

  const durationMs = Date.now() - startTime;

  console.log(
    `\n✨ Done! Inserted ${result.count} personas in ${durationMs}ms ` +
      `(${personas.length - result.count} duplicates skipped).\n`
  );
}

// Only auto-execute when run directly as a script (e.g. npx tsx seed-personas.ts).
// When Vitest imports this file to test toUserCreateInput, main() must NOT run —
// otherwise it would attempt real DB calls against our empty mock.
if (!process.env.VITEST) {
  main()
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    })
    .finally(() => {
      db.$disconnect();
    });
}
