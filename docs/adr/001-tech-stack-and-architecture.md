# ADR-001: Technology Stack and Architecture Decisions

**Status:** Accepted  
**Date:** 2026-02-05  
**Decision Makers:** Project Owner + AI Pair Programmer  

---

## Context

We are building a personalized reimplementation of the X (formerly Twitter) recommendation algorithm. The system requires:

1. An end-to-end ranking pipeline inspired by X's open-sourced architecture
2. A preference-driven personalization layer with explicit user controls
3. A synthetic social network seeded by LLM-generated personas (~500 initially)
4. A full-stack web application mirroring the X experience (feed, profiles, follow graph, likes, reposts, replies, trends, notifications)
5. An auditable, explainable ranking system
6. A presentation-layer modesty policy (Muslim-first design principle)

This ADR captures all major technology and architecture decisions made before implementation begins.

---

## Decisions

### D1: Full-Stack TypeScript (Single Language)

**Decision:** Use TypeScript for both frontend and backend via Next.js App Router. No Python/FastAPI backend.

**Alternatives Considered:**
- Mixed stack (Next.js frontend + FastAPI backend)
- Pure Python (Django/FastAPI for everything)

**Rationale:**
- Single language across the entire stack reduces cognitive overhead and context switching
- Next.js Server Actions and Route Handlers provide sufficient backend capability for this project
- Type safety end-to-end (Prisma → Zod → React) eliminates an entire class of bugs
- Simplified deployment on Vercel (single project, no separate API service)
- The ranking pipeline (heuristic-based, not ML) does not require Python's scientific computing ecosystem
- Better alignment with the project owner's preferred stack

**Consequences:**
- All ranking logic must be implemented in TypeScript (no numpy/scipy/sklearn)
- Heuristic-based scoring is well-suited to TypeScript; if ML were needed, this would be revisited

---

### D2: Next.js 16 with App Router

**Decision:** Use Next.js 16.1.6 with the App Router (not Pages Router).

**Rationale:**
- App Router is the standard for new Next.js projects (React Server Components, Server Actions, nested layouts)
- Server Components reduce client-side JavaScript for data-heavy pages (feed, profiles)
- Server Actions simplify form handling and mutations without dedicated API routes
- Route Handlers available for webhook endpoints or external integrations
- React 19.2.4 compatibility with concurrent features

**Consequences:**
- Must follow Server Component / Client Component boundary rules carefully
- Default to Server Components; only use `'use client'` for interactivity, hooks, or browser APIs

---

### D3: Prisma 7 ORM

**Decision:** Use Prisma 7.3.0 for database access.

**Alternatives Considered:**
- Drizzle ORM (lighter weight, SQL-first)
- Raw SQL with pg driver

**Rationale:**
- Prisma 7 removed the Rust-based query engine, resulting in faster cold starts on serverless (critical for Vercel)
- Mature ecosystem: migrations, studio, type-safe client generation
- Excellent TypeScript integration (generated types from schema)
- Native support for Neon's serverless driver adapter
- Familiar DX with declarative schema definition

**Consequences:**
- Schema-first approach (define models in `schema.prisma`, generate client)
- Must configure `driverAdapters` for Neon serverless compatibility

---

### D4: Neon Serverless PostgreSQL

**Decision:** Use Neon for PostgreSQL hosting (development and production).

**Alternatives Considered:**
- Local PostgreSQL (via Docker or native install)
- Supabase (Postgres + extras)
- Vercel Postgres

**Rationale:**
- No local database install required; accessible from any machine
- Free tier is generous (0.5 GB storage, 190 hours compute/month) — more than sufficient for 500 personas
- Serverless driver (`@neondatabase/serverless`) works natively with Prisma 7's driver adapter
- Connection pooling built-in (PgBouncer) — essential for serverless environments
- Branching feature allows safe schema experimentation

**Consequences:**
- Requires Neon account and connection string in `.env`
- Must use `@neondatabase/serverless` driver adapter with Prisma
- Slightly higher latency than local PostgreSQL during development (acceptable trade-off)

---

### D5: Clerk for Authentication (revised from BetterAuth)

**Decision:** Use Clerk (hosted SaaS) for user authentication. Originally BetterAuth was chosen, but was replaced before any auth code was written.

**Alternatives Considered:**
- BetterAuth (open-source, self-hosted, TypeScript-first) — original choice
- Auth.js / NextAuth v5 (open-source, widely used)

**Why BetterAuth was replaced:**
- Clerk saves ~1 full day of implementation time (3–5 hrs vs 9–14 hrs for equivalent features)
- Drop-in `<SignIn />`, `<SignUp />`, `<UserButton />` components provide polished, familiar UI without custom design
- Free tier covers <100 users comfortably — no cost for a portfolio project
- The core differentiator of this project is the ranking algorithm, not auth plumbing

**Rationale for Clerk:**
- Pre-built, production-grade auth UI (Google OAuth, email/password, magic links)
- First-class Next.js 16 App Router support (`clerkMiddleware()` in `proxy.ts`)
- Keyless mode for instant local development (no account required to run)
- Session management, JWT, and security handled externally — less surface area to maintain

**User sync strategy:**
- Clerk manages user identities externally
- A webhook at `/api/webhooks/clerk` syncs `user.created`, `user.updated`, `user.deleted` events to the Prisma `User` table
- The `User.id` field accepts both Clerk IDs (real users) and auto-generated CUIDs (LLM personas)

**Consequences:**
- Vendor dependency on Clerk (mitigated: free tier, and auth code is isolated to middleware + layout + webhook)
- User data lives in two places (Clerk + Prisma) — webhook keeps them in sync
- Ejecting to self-hosted auth later requires ~2–3 days of migration work
- `Session`, `Account`, `Verification` models removed from Prisma schema (Clerk handles these)

---

### D6: Gemini 3 Flash for LLM Generation

**Decision:** Use Google Gemini 3 Flash as the primary LLM for persona and content generation. Gemini 3 Pro reserved for complex reasoning tasks if needed.

**Rationale:**
- User's explicit choice
- Gemini 3 Flash has a generous free tier, reducing costs during development and persona seeding
- Sufficient quality for generating realistic personas, tweets, replies, and engagement patterns
- `@google/genai` SDK provides a clean TypeScript API

**Consequences:**
- Requires Google AI API key in `.env`
- All persona generation prompts must be designed for Gemini's capabilities
- Content quality depends on prompt engineering; may need iteration

---

### D7: Heuristic-Based Ranking Pipeline (4-Stage)

**Decision:** Implement a heuristic (rule-based) ranking pipeline, not an ML model. The pipeline mirrors X's 4-stage architecture:

1. **Candidate Sourcing** (~1,500 posts) — Pull recent posts from in-network (followed users) and out-of-network (similar interests)
2. **Scoring** — Apply weighted heuristic scoring based on engagement signals, recency, author relationship, topic relevance
3. **Heuristic Filtering** — Rule-based diversity enforcement (author caps, topic saturation limits, freshness thresholds)
4. **Feed Construction** (~50 posts) — Final assembly with position-based adjustments

**Alternatives Considered:**
- ML-based scoring (TensorFlow.js, ONNX runtime)
- Hybrid (heuristic sourcing + ML scoring)

**Rationale:**
- Heuristic approach is transparent, debuggable, and explainable — directly supports the "auditable" requirement
- No ML training infrastructure needed (no training data, no model serving)
- Users can directly see how weight changes affect ranking (impossible with opaque ML models)
- TypeScript is well-suited for rule-based logic; ML would push toward Python
- Faster to implement and iterate; can always add ML scoring later as an enhancement

**Scoring Factors:**
- In-Network relevance (followed users): ~50% weight
- Out-of-Network discovery (interest similarity): ~50% weight
- Engagement prediction heuristics: like probability, reply probability, repost probability
- Recency decay (exponential time-based decay)
- Author diversity (cap posts per author per feed page)
- Topic balance (prevent topic saturation)

**Consequences:**
- Ranking quality depends entirely on heuristic design — requires careful tuning
- Explainability is a first-class feature (every score can be decomposed into factors)
- "Why am I seeing this?" is trivially implementable since all factors are named and weighted

---

### D8: Presentation-Layer Modesty Policy

**Decision:** Implement a Muslim-first presentation-layer policy that blurs human imagery by default. This is strictly a visual concern — the ranking engine is completely unaware of this policy.

**Design Principles:**

| Principle | Implementation |
|-----------|---------------|
| Ranking neutrality | The ranking engine never filters, demotes, or promotes based on `modestySensitive`. Zero ranking impact. |
| Presentation-layer only | CSS `filter: blur()` applied via a `<ModestMedia>` React component wrapping `next/image`. |
| Text always visible | Only `<img>` / `<video>` elements are blurred. Text, alt text, and captions remain readable. |
| Default-on, no reveal toggle | Blur is always applied to media tagged `modestySensitive`. This is a firm policy, not a spoiler. |
| Tagged at generation time | LLM tags media during content creation. Human-containing media is marked `modestySensitive: true`. |
| Conservative default | `modestySensitive` defaults to `true` in the database. Only explicitly non-human media (infographics, nature, calligraphy) is set to `false`. |
| Accessible | Screen readers receive full alt text. `aria-label` communicates that visual content is intentionally obscured. |

**Analogy:** This mirrors how Islamic media (e.g., dawah videos) blur people visually while preserving full context through narration and text.

**Consequences:**
- No identity-based ranking or filtering — the ranking engine has zero awareness of modesty
- All media in the UI routes through the `<ModestMedia>` component — no bypass
- Since the project starts text-only (see D9), this component is deferred to when media support is added

---

### D9: Text-Only Posts Initially (Media Deferred)

**Decision:** Launch with text-only posts. The `MediaAttachment` model and `modestySensitive` field will be in the schema from day one, but no images will be generated or rendered in the initial implementation.

**Rationale:**
- Focuses initial effort on the ranking engine, which is the core of the project
- Avoids complexity of image generation/sourcing before the feed is working
- Schema is ready for media when the time comes — no migrations needed
- `<ModestMedia>` component can be built and tested in isolation when media is added

**Consequences:**
- Tweet cards will be text-only initially
- The modesty policy is designed but not active until media is added
- Media support becomes a future enhancement phase

---

### D9b: Neon Auth Disabled

**Decision:** Do not enable Neon Auth. Neon is used strictly as "just Postgres."

**Rationale:** We use Clerk (D5) for authentication. Enabling Neon Auth would create a redundant, conflicting auth layer. Neon's only role is database hosting.

---

### D10: npm Package Manager

**Decision:** Use npm as the package manager.

**Rationale:**
- Ships with Node.js — no additional installation
- Widely supported, stable, well-documented
- `package-lock.json` provides deterministic installs

---

### D11: Supporting Libraries

| Library | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| Tailwind CSS | 4.0 | Utility-first styling | Performance, DX, v4 with CSS-first config |
| shadcn/ui | 3.x | Component library | Copy-don't-import model, Radix primitives, Tailwind styling |
| Zustand | 5.x | Client-side state | Lightweight, no boilerplate, atomic selectors |
| Zod | 4.x | Runtime validation | Type-safe schemas, Server Action input validation |
| Framer Motion | 11.x | Animations | Complex orchestration for feed transitions, page loads |

---

## Summary

| # | Decision | Choice |
|---|----------|--------|
| D1 | Backend approach | Full-stack TypeScript (Next.js only) |
| D2 | Framework | Next.js 16 App Router |
| D3 | ORM | Prisma 7 |
| D4 | Database hosting | Neon serverless PostgreSQL |
| D5 | Authentication | Clerk (revised from BetterAuth) |
| D6 | LLM provider | Gemini 3 Flash / Pro |
| D7 | Ranking approach | Heuristic 4-stage pipeline |
| D8 | Modesty policy | Presentation-layer CSS blur (ranking-neutral) |
| D9 | Media strategy | Text-only initially, media deferred |
| D10 | Package manager | npm |
| D11 | Supporting libs | Tailwind 4, shadcn 3, Zustand 5, Zod 4, Framer Motion 11 |
