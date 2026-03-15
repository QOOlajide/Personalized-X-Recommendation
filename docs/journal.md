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

---

## Entry 6 — 2026-03-15: `prisma.config.ts` — `directUrl` and `earlyAccess` are not valid properties

**Symptom:** `npm run build` failed twice in succession with TypeScript errors:
1. `Object literal may only specify known properties, and 'directUrl' does not exist in type '{ url?: string | undefined; shadowDatabaseUrl?: string | undefined; }'`
2. After removing `directUrl`, a second error: `Object literal may only specify known properties, and 'earlyAccess' does not exist in type 'PrismaConfig'`

**Root cause:** `prisma.config.ts` was authored using examples from early Prisma 7 previews or blog posts that included `directUrl` in the `datasource` block and `earlyAccess` at the top level. By the time Prisma 7.3.0 shipped, neither property existed in the `PrismaConfig` type or its `datasource` sub-type. The `directUrl` concept (for migrations) is now handled differently, and `earlyAccess` flags were removed from the stable release.

**Fix:** Removed both properties, leaving a minimal config:
```ts
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"]! },
});
```

**Lesson:** Prisma's config file API (`prisma.config.ts`) is new and evolved rapidly between preview and stable. Always check the installed type definitions (`node_modules/prisma/config.d.ts`) rather than relying on blog posts or preview docs. Remove properties one at a time when facing "does not exist" errors — there may be multiple stale fields.

---

## Entry 7 — 2026-03-15: `new PrismaClient()` without an adapter fails in Prisma 7

**Symptom:** `npm run build` failed with `Expected 1 arguments, but got 0` on `new PrismaClient()` in `src/lib/db.ts`.

**Root cause:** `db.ts` had a fallback code path for local development that called `new PrismaClient()` without any arguments (no adapter). In Prisma 6 and earlier, this was valid — PrismaClient would use the built-in query engine. In Prisma 7, when the schema is configured with `previewFeatures = ["driverAdapters"]` or when using `prisma.config.ts` with a driver adapter setup, PrismaClient's constructor _requires_ an adapter argument. The bare no-argument call is no longer valid.

**Fix:** Removed the bare `new PrismaClient()` fallback. The client now always uses the `PrismaNeon` adapter:
```ts
const adapter = new PrismaNeon({ connectionString });
return new PrismaClient({ adapter });
```
This means local development also routes through Neon (which works fine — Neon's free tier has no issues for dev).

**Lesson:** In Prisma 7 with driver adapters, there is no "default" engine fallback. Once you commit to an adapter-based setup, every `PrismaClient` instantiation must provide one. Don't maintain separate code paths for "with adapter" vs. "without adapter" — it creates a build-time landmine.

---

## Entry 8 — 2026-03-15: `Module not found: '../generated/prisma/client'` on Vercel build

**Symptom:** Vercel deployment failed with `Module not found: Can't resolve '../generated/prisma/client'` in `src/lib/db.ts`. The same code worked locally.

**Root cause:** `prisma generate` had been run locally (producing `src/generated/prisma/`), but the generated client is in `.gitignore` and not committed. On Vercel, the build starts from a fresh `git clone` — the generated directory doesn't exist. The `build` script was just `next build`, which doesn't run `prisma generate` first.

**Fix:** Changed the `build` script in `package.json` from `"next build"` to `"prisma generate && next build"`. This ensures the Prisma client is regenerated from `schema.prisma` on every build, both locally and on Vercel.

**Lesson:** Any code-generated artifact that's in `.gitignore` (Prisma client, GraphQL codegen, etc.) must be regenerated as part of the build pipeline. For Vercel + Prisma, prepending `prisma generate` to the build command is the standard pattern. Never rely on the generated client being present from a prior local run.

---

## Entry 9 — 2026-03-15: Clerk `UserButton` — `afterSignOutUrl` prop removed in v7

**Symptom:** Vercel build failed with a TypeScript error: `Property 'afterSignOutUrl' does not exist on type 'IntrinsicAttributes & Without<WithClerkProp<...>, "clerk">'` on the `<UserButton>` component in `LeftSidebar.tsx`.

**Root cause:** In Clerk v5/v6, `<UserButton afterSignOutUrl="/" />` was the standard way to control where users land after signing out. In Clerk v7 (`@clerk/nextjs@7.x`), this prop was removed. The sign-out redirect is now configured via the `CLERK_SIGN_IN_URL` environment variable or through `<ClerkProvider>` props.

**Fix:** Removed the `afterSignOutUrl` prop entirely. The sign-out behavior is already controlled by the `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` environment variable set in `.env`.

**Lesson:** Clerk's component API changes across major versions. When upgrading (or starting with v7), check each component's props against the installed types, not v5/v6 documentation. The pattern of moving configuration from component props to environment variables or provider-level config is a recurring theme in Clerk v7.

---

## Entry 10 — 2026-03-15: Clerk middleware blocks pages not listed in `createRouteMatcher`

**Symptom:** Navigating to `/logo-preview` (a temporary preview page) resulted in an infinite redirect loop to `/sign-in`, even though the page existed and compiled successfully.

**Root cause:** `src/proxy.ts` uses `createRouteMatcher` to define public routes (`/`, `/sign-in(.*)`, `/sign-up(.*)`). Any route not in the matcher is treated as protected — `auth.protect()` fires and redirects unauthenticated users to sign-in. The `/logo-preview` page wasn't in the list, so it was blocked.

**Fix:** Temporarily added `"/logo-preview"` to the `createRouteMatcher` array, verified the page worked, then removed it and deleted the preview page.

**Lesson:** In Clerk's `clerkMiddleware` + `createRouteMatcher` pattern, the default is "deny all, allow listed." Every new public-facing route must be explicitly added to the matcher. When debugging "page won't load" issues, check proxy.ts first — it's the most common cause of unexpected redirects in Clerk-protected apps.

---

## Entry 11 — 2026-03-15: Clerk v7 removed `<SignedIn>` / `<SignedOut>` — use `<Show>` instead

**Symptom:** Build error: `Export SignedIn doesn't exist in target module` when importing `{ SignedIn, SignedOut, UserButton }` from `@clerk/nextjs` in the new marketing Navbar.

**Root cause:** In Clerk v7, the `<SignedIn>` and `<SignedOut>` components were replaced by a unified `<Show>` component with a `when` prop. The old named exports no longer exist in `@clerk/nextjs`.

**Fix:** Replaced `<SignedIn>` / `<SignedOut>` with `<Show when="signed-in">` / `<Show when="signed-out">` as specified in the project's Clerk rules (`.cursor/rules/clerk.mdc`).

**Lesson:** The project's own rules file already documented this (`NEVER use deprecated <SignedIn>, <SignedOut>`). When an import fails, check project rules and installed type definitions before searching external docs — the answer is often already local.

---

## Entry 12 — 2026-03-15: Sign-in/sign-up buttons redirect back to landing page for authenticated users

**Symptom:** Clicking "Log in" or "Sign up" on the landing page navigated to `/sign-in` or `/sign-up`, then immediately bounced back to `/`. Appeared as if the buttons "didn't point to anything."

**Root cause:** The user was already signed in (Clerk session active). Clerk's `<SignIn />` and `<SignUp />` components detect an existing session and redirect the authenticated user away — back to the origin page. The landing page (`/`) was a public route, so the middleware didn't redirect authenticated users to `/feed`, leaving them stuck on a page with non-functional auth buttons.

**Fix:** Added a server-side auth check at the top of the landing page:
```ts
const { userId } = await auth();
if (userId) redirect('/feed');
```
Authenticated users now skip the landing page entirely and go straight to `/feed`.

**Lesson:** Public marketing pages that show auth CTAs need an authenticated-user redirect. If the middleware treats `/` as public (correct — it's the landing page), the page itself must handle the redirect. Otherwise, signed-in users see a broken experience where auth buttons loop back to the same page.
