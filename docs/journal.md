This project has a journal.md. Every time we fix or clearly understand a bug or confusing behavior, append a new entry to journal.md using the rules inside that file."

---

## Entry 1 — 2026-02-13: Vitest can't resolve `@/generated/prisma` when importing `seed-personas.ts`

**Symptom:** `seed-helpers.test.ts` crashed with `Cannot find package '@/generated/prisma'` before any tests ran.

**Root cause:** The test imports `toUserCreateInput` from `seed-personas.ts`, which also imports `db` from `../lib/db`. `db.ts` imports `PrismaClient` from `@/generated/prisma` — a path alias (`@/` → `src/`) configured in `tsconfig.json`. While `vite-tsconfig-paths` resolves most aliases in Vitest, the Prisma generated client at that path failed to resolve in the test runner environment.

**Fix:** Added `vi.mock("../../lib/db", () => ({ db: {} }))` at the top of the test file. This tells Vitest to replace the real `db` module with an empty stub, so the Prisma import is never evaluated. This is safe because we're only testing the pure `toUserCreateInput` mapping function — it never touches the database.

**Lesson:** When unit-testing a pure function that lives in a file with heavy side-effectful imports (database clients, API clients), mock those imports. Better yet, consider extracting pure functions into their own files with zero I/O dependencies (§5 of coding guidelines: testability).

---

## Entry 2 — 2026-02-13: `require()` doesn't work in Vitest ESM mode

**Symptom:** `gemini.test.ts` failed with `Cannot find module '../gemini'` on a `require()` call.

**Root cause:** Vitest runs in ESM (ECMAScript Module) mode. `require()` is a CommonJS function — it's not available in ESM. The test used `require("../gemini")` to try to bypass module caching and get a fresh singleton, but this is invalid in ESM.

**Fix:** Replaced `require()` with `vi.resetModules()` (clears Vitest's module cache) followed by `await import("../gemini")` (dynamic ESM import). This gives a fresh module with `_client` reset to `null`, allowing us to test the "missing API key" error path cleanly.

**Lesson:** In Vitest (and any ESM environment), always use `vi.resetModules()` + dynamic `import()` to get fresh module instances. Never use `require()` — it's a CommonJS-only feature.

---

## Entry 3 — 2026-02-13: Script's `main()` runs as side effect when Vitest imports it

**Symptom:** All 92 tests passed, but Vitest reported 1 unhandled error: `Cannot read properties of undefined (reading 'findMany')` and `db.$disconnect is not a function`, both originating from `seed-personas.ts`.

**Root cause:** `seed-personas.ts` ends with `main().catch(...).finally(...)` at module scope (top-level, not inside a function). In JavaScript, top-level code runs when a file is imported. When Vitest imported the file to access the exported `toUserCreateInput` function, it also executed `main()`, which tried to call `db.user.findMany()` on our empty mock `{}`.

**Fix:** Wrapped the `main()` call in `if (!process.env.VITEST) { ... }`. Vitest automatically sets `process.env.VITEST` to `"true"` during test runs, so the script's auto-execution is skipped in tests but works normally when run directly via `npx tsx`.

**Lesson:** Script files that are both executable (`npx tsx script.ts`) and importable (for testing) need an entry-point guard. In Vitest, check `process.env.VITEST`. This is the same concept as Python's `if __name__ == "__main__":` pattern.

---

## Entry 4 — 2026-02-14: `@/` path alias not resolved by `npx tsx` + `PrismaNeon` constructor API changed in Prisma 7

**Symptom:** Running `npx tsx src/scripts/seed-personas.ts` crashed with `Cannot find module '@/generated/prisma'` from `db.ts`. After fixing the import path, a second error appeared: `Argument of type 'Pool' is not assignable to parameter of type 'PoolConfig'`.

**Root cause (two issues):**

1. **Path alias:** `db.ts` imported `PrismaClient` from `"@/generated/prisma"`. The `@/` → `./src/` alias is defined in `tsconfig.json` `paths`. Next.js resolves this via its bundler; Vitest via `vite-tsconfig-paths`. But `npx tsx` (globally installed) failed to resolve it in this project's `moduleResolution: "bundler"` config.

2. **Prisma 7 API change:** In Prisma 5/6, `PrismaNeon` accepted a `Pool` instance (`new PrismaNeon(pool)`). In Prisma 7 + `@prisma/adapter-neon@7.3.0`, `PrismaNeon` implements `SqlDriverAdapterFactory` and its constructor expects a `PoolConfig` config object (`{ connectionString }`). It creates and manages the pool internally.

**Fix:**
- Changed import from `"@/generated/prisma"` to relative path `"../generated/prisma/client"`.
- Replaced `new Pool({ connectionString })` + `new PrismaNeon(pool)` with `new PrismaNeon({ connectionString })`.
- Replaced `Pool` import with `neonConfig` import; set `neonConfig.webSocketConstructor = ws` (cleaner than the `globalThis` assignment).

**Lesson:** When using bleeding-edge versions (Prisma 7, adapter-neon 7.3), always verify constructor signatures against the installed type definitions — docs and blog posts often lag behind. Path aliases (`@/`) are a bundler convenience; standalone scripts run via `tsx` may not resolve them, so relative imports are more portable for files used outside the bundler.

---

## Entry 5 — 2026-02-23: `post` implicitly has type `any` — circular inference in a Prisma `.create()` loop

**Symptom:** TypeScript error TS7022 on `const post = await db.post.create({...})` inside the thread-seeding loop in `seed-content.ts`.

**Root cause:** `post` feeds `parentId = post.id`, and `parentId` feeds back into the next iteration's `db.post.create({ data: { parentId } })`. Prisma's return type is conditional on the argument shape, so TypeScript tried to infer `post`'s type from an argument that transitively depends on `post` itself — a cycle it can't resolve.

**Fix:** Added an explicit type annotation: `const post: { id: string } = await db.post.create({...})`. This breaks the inference cycle since TypeScript no longer needs to derive the type from the call. We annotate with only `{ id: string }` because that's the sole field read from `post`.

**Lesson:** When a variable assigned from a Prisma call is referenced (even indirectly) in a later iteration of the same loop that feeds back into another Prisma call, TypeScript's conditional return-type inference can go circular. An explicit annotation on the variable — scoped to the fields you actually use — breaks the cycle cleanly.
