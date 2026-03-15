# Engineering Tradeoffs

> A living document of every significant "we could have done X, but we chose Y because..." decision.  
> Separate from [ADR-001](adr/001-tech-stack-and-architecture.md) (technology choices) and [journal.md](journal.md) (bug postmortems).  
> ADRs capture **what** we chose; this document captures the **cost of choosing it** and what we gave up.

---

## How to Read Each Entry

| Field | Purpose |
|-------|---------|
| **Context** | The problem we were solving when the tradeoff surfaced. |
| **Option A (chosen)** | What we did and why. |
| **Option B (rejected)** | The road not taken and what it would have bought us. |
| **What we gained** | Concrete benefits of the choice. |
| **What we gave up** | Honest costs — things that are now harder, slower, or missing. |
| **Revisit trigger** | Under what conditions we'd switch to Option B. |

---

## T1 — Heuristic Ranking vs. ML Model

**Context:** The ranking pipeline needed to score ~1,500 candidate posts per feed request. X's real system uses a heavy ML model (48M parameters). We needed to decide whether to train a model or write rules.

**Option A (chosen):** Heuristic 4-stage pipeline — hand-tuned weighted scoring in TypeScript.

**Option B (rejected):** Train or fine-tune a small ML model (e.g., TensorFlow.js, ONNX runtime in Node).

**What we gained:**
- Full explainability — every score decomposes into named, weighted factors ("recency: 0.32, topic match: 0.41, network bonus: 0.18"). Users can see *exactly* why a tweet ranks where it does.
- No training infrastructure — no dataset curation, no GPU, no model serving.
- Instant iteration — change a weight, refresh the feed, see the effect immediately.
- Stays in TypeScript — no Python dependency, single-language stack.

**What we gave up:**
- Non-linear signal capture. Heuristics can't learn interactions between features the way a neural net can (e.g., "this user engages with tech tweets *only* in the morning" — heuristics would need an explicit rule for that).
- Cold-start intelligence. An ML model could learn user preferences from sparse signals; our heuristics need explicit weights or fallback defaults.
- The ability to claim "ML-powered" on a résumé bullet point. (Honesty > marketing.)

**Revisit trigger:** If we add real user behavior telemetry (click-through data, dwell time, scroll depth) and the heuristic rankings start feeling stale, an ML scoring layer on top of the heuristic candidates would be the natural next step.

---

## T2 — Static Interest-to-Topic Map (~150 entries) vs. LLM Classification

**Context:** Personas have free-form interests like "functional programming", "basketball", "dawah". We needed to map these to a fixed set of 20 platform topics for the ranking engine's topic-relevance scoring.

**Option A (chosen):** A hardcoded `INTEREST_TO_TOPIC_MAP` in `topics.ts` with ~150 manually-curated entries mapping interest strings to topic slugs.

**Option B (rejected):** Send each persona's interests to Gemini and let the LLM classify them into topics dynamically.

**What we gained:**
- Deterministic, testable, and free. The same input always produces the same output. No API calls, no latency, no cost.
- Runs in <1ms for 500 personas. LLM classification would add ~500 API calls × 1–2s each = 8–16 minutes to every seed run.
- Easily auditable — open the file, see every mapping.

**What we gave up:**
- Flexibility for novel interests. If a persona has an interest like "solarpunk fiction", it silently maps to nothing unless we manually add it.
- Maintenance burden. Every new interest pattern requires a manual map update (though this is mitigated by our persona generator — we control what interests get generated, so the map only needs to cover our own output vocabulary).
- Nuance. "Islamic finance" maps to `["islam-spirituality", "finance-markets"]`, but the map can't capture *degree* of relevance (it's a binary: mapped or not).

**Revisit trigger:** If we open up persona creation to real users (not just LLM-generated) and they enter interests we can't predict, LLM classification becomes necessary.

---

## T3 — Jaccard Similarity + Archetype Affinity for Follow Graph vs. Simple Random Follows

**Context:** 500 personas needed follow relationships to form a social network. The follow graph directly impacts the ranking engine's in-network vs. out-of-network scoring.

**Option A (chosen):** Jaccard similarity on resolved topic sets + an archetype affinity matrix (e.g., traders follow journalists) + random jitter.

**Option B (rejected):** Each persona randomly follows 30–80 others with no interest or archetype weighting.

**What we gained:**
- Realistic network structure. Personas with shared interests cluster together naturally (tech people follow tech people), which gives the ranking engine meaningful in-network signals to work with.
- The archetype affinity matrix encodes real-world social dynamics (journalists follow politicians, traders follow news outlets) that make the synthetic network feel alive.
- Provides a meaningful "out-of-network discovery" problem for the ranking engine — there are genuine community boundaries to bridge.

**What we gave up:**
- Complexity for a demo-scale network. For 500 personas, the Jaccard computation is O(n²) with n=500 → 250K pair evaluations. This runs in seconds, but the algorithmic sophistication is arguably over-engineered for the current scale.
- The archetype affinity values (0.05–0.20) are educated guesses, not empirically validated. They *feel* right but weren't derived from real social network data.
- Harder to onboard contributors — someone reading `follow-graph.ts` needs to understand Jaccard similarity and the affinity matrix, whereas random follows are self-explanatory.

**Revisit trigger:** If we needed 50,000+ personas, the O(n²) pairwise approach would need to be replaced with approximate nearest neighbor (ANN) or locality-sensitive hashing (LSH). At current scale, the overhead is negligible.

---

## T4 — Algorithmic Engagement Seeding vs. LLM-Driven Engagement

**Context:** After generating posts, we needed likes and reposts to give the ranking engine real engagement signals to score against.

**Option A (chosen):** Probabilistic engagement via `engagementProbability()` — topic overlap × in-network boost × base probability, rolled for each (persona, post) pair.

**Option B (rejected):** Ask Gemini "Would @dev_maya like this tweet about React hooks?" for each (persona, post) pair.

**What we gained:**
- Speed: 500 personas × ~3,000 posts = 1.5M engagement decisions. At 1.5s per API call, LLM-based engagement would take ~26 days. The algorithm runs in <2 seconds.
- Cost: $0 vs. potentially thousands of dollars in API calls.
- Tunability: The probability function's parameters (base rate, topic weight, network boost) are easy to adjust without re-running API calls.

**What we gave up:**
- Engagement *reasoning*. The LLM could decide "this trader wouldn't like this crypto tweet because they're a Bitcoin maximalist and the tweet is about Ethereum" — nuance that a topic-overlap score can't capture.
- Persona-voice consistency in engagement. Real engagement patterns reflect personality; our algorithm treats all personas with the same interests identically.

**Revisit trigger:** If we want to model controversial topics where personas with the *same* interests would have *opposite* reactions (e.g., political polarization), the engagement function needs persona-level sentiment or the LLM approach for a targeted subset.

---

## T5 — Sequential Gemini API Calls vs. Concurrent Batching

**Context:** Content generation requires 2 Gemini API calls per persona (tweets + threads), plus 2 more for replies and quote tweets. For 500 personas, that's ~2,000 API calls.

**Option A (chosen):** Sequential calls with a 1.5s delay between each (`API_DELAY_MS`), processing one persona at a time.

**Option B (rejected):** Concurrent batching — fire 5–10 API calls in parallel using `Promise.all()` or a concurrency pool.

**What we gained:**
- Rate limit safety. Gemini's free tier has strict rate limits (15 RPM for Flash). Sequential + delay guarantees we never hit 429 errors in a burst.
- Simple error isolation. If persona #47 fails, we log it, skip, and continue to #48. With concurrent batching, a rate limit error on one call could cascade and fail the entire batch.
- Predictable progress logging — easy to show "[47/500] @dev_maya: 6 tweets, 1 thread".

**What we gave up:**
- Speed. Sequential processing of 500 personas at ~3s per persona ≈ 25 minutes. With 5x concurrency, that's ~5 minutes.
- Full utilization of the API quota. The 1.5s delay is conservative; we could probably do 2x concurrency safely.

**Revisit trigger:** If seeding time becomes a bottleneck (e.g., we scale to 5,000 personas or need to re-seed frequently), implement a concurrency-limited pool (`p-limit` or `Promise.allSettled` with a semaphore) and adjust the delay dynamically based on 429 responses.

---

## T6 — Neon Serverless Postgres vs. Local PostgreSQL

**Context:** The project needs a PostgreSQL database for 15 models (users, posts, likes, follows, topics, preferences, etc.).

**Option A (chosen):** Neon serverless PostgreSQL — cloud-hosted, accessed via `@neondatabase/serverless` WebSocket driver.

**Option B (rejected):** Local PostgreSQL via Docker or native install.

**What we gained:**
- Zero local setup. No Docker, no `pg_ctl`, no port conflicts. Works from any machine with internet.
- Serverless compatibility. Neon's driver + Prisma 7's adapter works natively on Vercel Edge Functions.
- Database branching for safe schema experiments.

**What we gave up:**
- Latency. Every query goes over the network. Local Postgres has sub-millisecond latency; Neon adds ~20–50ms per query. During content seeding (thousands of inserts), this compounds. For 500 personas × 6 tweets = 3,000 individual `db.post.create()` calls, the latency overhead is ~60–150 seconds of pure network time.
- Offline development is impossible — if the internet goes down, the entire app is non-functional.
- Free tier limits (0.5 GB storage, 190 compute hours/month) could become a constraint at scale.

**Revisit trigger:** If seeding latency becomes painful, batch inserts (`createMany`) reduce round-trips. If the free tier runs out, a local Postgres for development + Neon for production is the standard migration path.

---

## T7 — Zod Double-Validation of Gemini Output vs. Trusting Structured Output Mode

**Context:** Gemini supports `responseJsonSchema` which constrains the model to output valid JSON matching a schema. We could trust this and skip client-side validation.

**Option A (chosen):** Send the Zod-derived JSON schema to Gemini AND re-validate the response with `schema.safeParse()` on our side.

**Option B (rejected):** Trust Gemini's structured output mode and cast the response directly to the TypeScript type.

**What we gained:**
- Defense in depth. LLMs are probabilistic — even in structured mode, they can produce malformed output, extra fields, or constraint violations (e.g., a tweet over 280 characters). The Zod validation catches these.
- Actionable error messages. When validation fails, we get specific Zod issue paths ("tweets[3].content too long") instead of cryptic runtime TypeErrors downstream.
- Future-proofing. If we switch LLM providers, the client-side validation still works.

**What we gave up:**
- A tiny amount of code that feels redundant. The `parseGeminiResponse` helper is ~25 lines that "shouldn't be needed" if Gemini's structured mode worked perfectly. Some would call this defensive programming; others would call it unnecessary.
- The Zod schema is converted to JSON Schema (for Gemini) and also used as a Zod schema (for validation) — two representations of the same contract. If they diverge (unlikely since both derive from the same Zod type), confusing bugs could result.

**Revisit trigger:** Never. This is a low-cost safety net. The day we remove it is the day Gemini returns a 400-character "tweet" and corrupts our database.

---

## T8 — Presentation-Layer Modesty (CSS Blur) vs. Ranking-Level Content Filtering

**Context:** The project owner's Muslim faith requires that human imagery (specifically, women's awrah) be obscured. We also want to blur sensitive content like gore. The question: should the ranking engine filter this content, or should the presentation layer handle it?

**Option A (chosen):** Ranking engine is completely unaware of modesty. A `<ModestMedia>` React component applies CSS `filter: blur()` on tagged media. Ranking scores are identical for modest and non-modest content.

**Option B (rejected):** Ranking-level filtering — demote or exclude posts with `modestySensitive: true` from the feed entirely.

**What we gained:**
- Ranking purity. The recommendation algorithm is unbiased by content policy — it ranks solely on engagement signals, relevance, and user preferences. This makes the system auditable and academically honest.
- Policy flexibility. Modesty is a *presentation concern*, not a *ranking concern*. If a different user doesn't want the blur, we'd only change the component — not the ranking pipeline.
- Text stays visible. Users can still read captions, alt text, and context even when images are blurred. Content isn't suppressed, just visually obscured.

**What we gave up:**
- Users will still see blurred *placeholders* for sensitive media, which some may find cluttering the feed. Ranking-level filtering would hide them entirely.
- The blur is a firm policy (no "reveal" toggle) — some users may find this inflexible.
- Requires accurate tagging at generation time. If the LLM fails to tag a sensitive image, the blur won't be applied. (Mitigated by defaulting `modestySensitive: true` in the database — conservative by default.)

**Revisit trigger:** If we add user-configurable content filters (beyond modesty), those would likely integrate into the ranking pipeline's filtering stage as a separate "content policy" layer — still distinct from relevance scoring.

---

## T9 — Prisma 7 (Bleeding Edge) vs. Prisma 5/6 (Stable)

**Context:** Prisma 7 dropped the Rust query engine in favor of a pure TypeScript driver, which dramatically improves cold-start performance on serverless platforms (Vercel).

**Option A (chosen):** Prisma 7.3.0 with the `@prisma/adapter-neon` driver adapter.

**Option B (rejected):** Prisma 5.x or 6.x — battle-tested, widely documented, stable API.

**What we gained:**
- ~40% faster cold starts on Vercel (no Rust binary to load).
- Native TypeScript driver adapter for Neon — cleaner integration than the older `@prisma/client` + external connection pooling.
- First-mover learning — understanding Prisma 7's API changes is valuable knowledge.

**What we gave up:**
- Constructor API instability. We hit a breaking change where `PrismaNeon` no longer accepts a `Pool` instance (Prisma 5/6 API) and instead requires `{ connectionString }`. Docs hadn't caught up; we debugged from type definitions. (See [Journal Entry 4](journal.md).)
- Smaller ecosystem of Stack Overflow answers, blog posts, and tutorials for Prisma 7-specific issues.
- Risk of additional breaking changes in minor versions during the 7.x lifecycle.

**Revisit trigger:** If Prisma 7 introduces a showstopper bug or the adapter-neon driver proves unreliable, downgrading to Prisma 6 + `@prisma/client` is a 1-hour migration (schema is version-agnostic).

---

## T10 — Text-Only Launch (Media Deferred) vs. Full Media Support from Day 1

**Context:** X is a heavily visual platform (images, videos, GIFs). Our synthetic network could generate image descriptions and URLs, but rendering and moderating images adds significant complexity.

**Option A (chosen):** Launch with text-only posts. The `MediaAttachment` model exists in the schema (future-ready), but no images are generated, stored, or rendered.

**Option B (rejected):** Generate synthetic images (via DALL-E/Midjourney API or stock photo URLs) from day one.

**What we gained:**
- Focused development. The ranking engine, feed, follow graph, and engagement mechanics are text-driven. Adding images wouldn't improve ranking quality — it would only improve visual appeal.
- Avoided a cascade of complexity: image generation costs, CDN/storage setup, responsive image rendering, the modesty blur component, and image-based content moderation — all deferred.
- The schema is ready for media (`MediaAttachment` table, `modestySensitive` field). When we add images, zero migrations are needed.

**What we gave up:**
- Visual realism. A text-only X clone looks incomplete — real X is dominated by images and videos. Demo/portfolio impressions suffer.
- The modesty policy (`<ModestMedia>` component) can't be demonstrated until media is added. It's designed but effectively dormant.
- Quote tweets and replies lack visual context that would exist in a real network.

**Revisit trigger:** After the ranking pipeline and full-stack UI are complete and functional, media becomes the highest-impact visual improvement. Phase 9 in the plan.

---

## T11 — Clerk (Managed Auth) vs. BetterAuth (Self-Hosted) — REVISED

**Context:** The platform needs user authentication (sign up, sign in, sessions) for real users to interact with the synthetic network.

**Original choice:** BetterAuth (self-hosted, TypeScript-first, stores auth in own DB).

**Revised choice:** Clerk (managed SaaS) — switched before any auth code was written.

**Why we switched:**
- Speed. Clerk saves ~1 full day of implementation (3–5 hrs vs 9–14 hrs). The core project differentiator is the ranking algorithm, not auth.
- Polished UI. `<SignIn />`, `<SignUp />`, `<UserButton />` are drop-in, familiar, and production-grade — no custom forms needed.
- Free tier. <100 users is comfortably within Clerk's free tier (up to 10k+ MAU).
- Keyless mode. Can run locally without even creating a Clerk account.

**What we gained:**
- Instant, professional auth UI that users recognize from other SaaS products.
- Battle-tested security (CSRF, rate limiting, bot detection, session rotation) out of the box.
- Zero auth tables in our schema — `Session`, `Account`, `Verification` models removed.

**What we gave up:**
- Vendor dependency. User identities live in Clerk's hosted store; ejecting later requires ~2–3 days of migration.
- Dual data residency. Real users exist in both Clerk and our Prisma `User` table, synced via webhook. If the webhook fails, data can drift.
- Less learning value for auth internals. (Acceptable trade-off — the ranking pipeline provides more than enough engineering depth.)

**Revisit trigger:** If Clerk's free tier is deprecated, pricing changes, or we need auth flows Clerk doesn't support, BetterAuth remains a viable self-hosted fallback using the same Prisma schema.

---

## T12 — One Gemini Call Per Persona vs. Batching Multiple Personas Per Call

**Context:** When generating tweets, we could send one prompt per persona ("Generate 6 tweets for @dev_maya") or batch multiple personas per prompt ("Generate tweets for @dev_maya, @crypto_chad, and @news_global in one call").

**Option A (chosen):** One persona per Gemini call.

**Option B (rejected):** Multi-persona batching (e.g., 5 personas per call, reducing total API calls by 5x).

**What we gained:**
- Higher content quality. When the LLM focuses on one persona, it maintains a consistent voice. Multi-persona prompts often produce blended or generic output.
- Simpler error handling. If one persona's generation fails, it doesn't take down the others.
- Cleaner prompt engineering. Each prompt is focused and stays well under token limits.

**What we gave up:**
- 5x more API calls (and therefore 5x more seeding time and 5x more chance of hitting rate limits).
- Higher total token usage. Each call has prompt overhead (system instructions, persona config) that would be amortized across multiple personas in a batch.

**Revisit trigger:** If we upgrade to a paid Gemini tier with higher rate limits and API call overhead becomes the bottleneck, batching 2–3 similar-archetype personas per call could be a reasonable compromise.

---

## Summary Table

| # | Tradeoff | Chose | Over | Key Cost |
|---|----------|-------|------|----------|
| T1 | Ranking approach | Heuristics | ML model | Can't learn non-linear signal interactions |
| T2 | Interest mapping | Static map | LLM classification | Can't handle novel interests |
| T3 | Follow graph | Jaccard + affinity | Random follows | Over-engineered for demo scale |
| T4 | Engagement seeding | Algorithmic | LLM-driven | No persona-level reasoning |
| T5 | API call pattern | Sequential | Concurrent | ~5x slower seeding |
| T6 | Database hosting | Neon (cloud) | Local Postgres | 20–50ms per-query latency |
| T7 | LLM output validation | Double-validate | Trust structured mode | Tiny code overhead |
| T8 | Modesty policy | Presentation blur | Ranking filter | Blurred placeholders still visible |
| T9 | ORM version | Prisma 7 (edge) | Prisma 5/6 (stable) | Sparse docs, API instability |
| T10 | Media support | Text-only launch | Full media | Visually incomplete |
| T11 | Authentication | Clerk (managed) | BetterAuth (self) | Vendor dependency, dual data residency |
| T12 | LLM batching | One persona/call | Multi-persona batch | 5x more API calls |
| T13 | Landing page animations | Motion fade-up + hover-lift | CSS-only or no animation | Client JS for presentational components |
| T14 | Landing auth UX | Page-level redirect to /feed | Conditional navbar (signed-in vs signed-out) | Landing page invisible to authenticated users |