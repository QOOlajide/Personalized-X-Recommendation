# Shift

**A personalized feed with exposed, user-tunable ranking** — an educational reimplementation of the X (Twitter) recommendation algorithm where the algorithm _is_ the product.

Built with a synthetic social network of LLM-generated personas, Shift lets you experiment with how timelines, trends, and virality emerge under different algorithmic preferences. Every post in your feed carries an explanation of why it's there, and you can reshape the entire feed in real time with preference sliders.

> **Try it live:** [personalized-x-recommendation.vercel.app](https://personalized-x-recommendation.vercel.app/) — Sign up, sign in, and head to `/feed` to see the X-style timeline.

---

## Quick Start (no setup needed)

1. Visit **[personalized-x-recommendation.vercel.app](https://personalized-x-recommendation.vercel.app/)**
2. **Sign up** with email or OAuth (powered by Clerk — no API keys needed on your end)
3. **Sign in** and you'll be redirected to `/feed`
4. Browse the X-style feed with mock posts, explore the sidebar, and check back for upcoming features like algorithm tuning sliders and "Why this post?" explanations

---

## What Makes This Different

| Typical X Clone | Shift |
|-----------------|-------|
| Feed is `ORDER BY created_at DESC` | 4-stage ranking pipeline: sourcing → scoring → diversity filtering → explainable feed |
| No algorithm — everyone sees the same thing | 5 weighted scoring factors driven by per-user preference sliders |
| Empty database until users create content | ~500 LLM-generated personas with distinct writing styles, interests, and engagement patterns |
| No transparency into feed ordering | "Why am I seeing this?" on every post with factor-level breakdowns |
| No anti-filter-bubble mechanisms | Author diversity caps, topic saturation limits, freshness floors, exploration injection |

---

## Architecture

### Ranking Pipeline (4 Stages)

```
Candidate Sourcing  →  Scoring  →  Heuristic Filtering  →  Feed Construction
   (~1,500 posts)     (weighted)     (rule-based)            (~50 posts)
```

**Stage 1 — Candidate Sourcing:** Pulls recent posts from followed users (in-network) and users with overlapping topic interests (out-of-network).

**Stage 2 — Scoring:** Each candidate receives a composite score based on:
- Recency (exponential time decay)
- Popularity (log-scaled engagement)
- Network bonus (followed vs. discovered)
- Topic relevance (user's topic preference weights vs. post topics)
- Engagement velocity (recent engagement acceleration)

User preference sliders (`recencyWeight`, `popularityWeight`, `networkWeight`, `diversityWeight`) dynamically reweight these factors.

**Stage 3 — Heuristic Filtering:** Enforces feed diversity to prevent filter bubbles:
- Author diversity cap (max N posts per author per page)
- Topic saturation limit (no more than M% from one topic)
- Freshness floor (guarantees some recent content)
- Exploration injection (surfaces out-of-interest posts)

**Stage 4 — Feed Construction:** Final ordering, truncation to page size, and generation of per-post `RankingExplanation` records (the "Why am I seeing this?" data).

### Synthetic Social Network

The system generates a realistic social network using Google Gemini:

- **Personas** — ~500 LLM-generated users across archetypes (tech founders, journalists, traders, activists, meme accounts, etc.), each with unique writing styles, interests, and posting frequencies.
- **Follow graph** — Built using Jaccard similarity on topic interests plus an archetype affinity matrix (e.g., traders follow journalists and other traders).
- **Content** — Tweets, multi-post threads, replies, and quote tweets generated per persona, matching their voice and interests.
- **Engagement** — Likes and reposts distributed based on topic overlap between personas and posts.

### Preference-Driven Personalization

Users tune the algorithm using explicit controls:
- **Recency vs. Popularity** — Prefer fresh content or high-engagement content
- **Friends vs. Global** — Network weight: followed users vs. discovery
- **Niche vs. Viral** — Topic depth vs. broad appeal
- **Diversity level** — How varied the feed topics should be
- **Per-topic weights** — Granular control over individual topics (tech, politics, culture, sports, etc.)

Changes take effect immediately — the feed re-ranks live as sliders move.

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | 22 LTS |
| Language | TypeScript | 5.9.x |
| Framework | Next.js (App Router) | 16.1.6 |
| Database | Neon Serverless PostgreSQL | 16+ |
| ORM | Prisma | 7.3.0 |
| Auth | Clerk | 7.x |
| Styling | Tailwind CSS | 4.0 |
| Components | shadcn/ui | 3.x |
| State | Zustand | 5.x |
| Validation | Zod | 4.x |
| LLM | Google Gemini 3 Flash | Latest |
| Testing | Vitest | 4.x |

All technology decisions are documented in [`docs/adr/001-tech-stack-and-architecture.md`](docs/adr/001-tech-stack-and-architecture.md).

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma              # 15 models: User, Post, Follow, Like, Repost, Topic, etc.
│   └── migrations/                # Prisma migration history
├── src/
│   ├── app/                       # Next.js App Router pages and layouts
│   │   ├── (main)/                # Authenticated shell: 3-column X-style layout
│   │   │   ├── layout.tsx         # Left sidebar + center column + right sidebar
│   │   │   └── feed/page.tsx      # Timeline with mock posts
│   │   ├── sign-in/               # Clerk custom sign-in page
│   │   └── sign-up/               # Clerk custom sign-up page
│   ├── components/
│   │   ├── LogoIcon.tsx           # Shift balance-pivot logo (flat + 3D variants)
│   │   ├── LeftSidebar.tsx        # Nav: Home, Explore, Notifications, Messages, Profile, Settings
│   │   └── RightSidebar.tsx       # Search, Trending, Who to follow
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── gemini.ts          # Gemini client singleton
│   │   │   ├── persona-generator.ts  # LLM persona generation
│   │   │   ├── content-generator.ts  # Tweet/thread/reply/QT generation
│   │   │   └── schemas/           # Zod schemas for LLM structured output
│   │   ├── schemas/               # Input validation schemas (user, post, preference)
│   │   ├── seed/
│   │   │   ├── topics.ts          # 20 topics + ~150-entry interest-to-topic map
│   │   │   ├── follow-graph.ts    # Jaccard similarity + archetype affinity
│   │   │   └── engagement.ts      # Engagement probability + distribution
│   │   ├── db.ts                  # Prisma client with Neon adapter
│   │   └── utils.ts               # Shared utilities
│   ├── scripts/
│   │   ├── seed-personas.ts       # Generate and insert personas via Gemini
│   │   └── seed-content.ts        # Full content pipeline: topics → follows → content → engagement
│   └── services/
│       └── ranking/
│           ├── types.ts           # Shared types (CandidatePost, ScoredPost, FeedPost, etc.)
│           ├── candidate-sourcing.ts  # Stage 1: in-network + out-of-network sourcing
│           ├── scoring.ts         # Stage 2: multi-factor scoring with preference weights
│           ├── heuristic-filtering.ts # Stage 3: diversity enforcement
│           ├── feed-construction.ts   # Stage 4: final assembly + explanations
│           └── index.ts           # Pipeline orchestrator: generateFeed(userId)
├── docs/
│   ├── Context.md                 # Project requirements and challenges
│   ├── UI/                        # UI design system plan + branding
│   ├── adr/                       # Architecture Decision Records
│   ├── journal.md                 # Development log (bugs, fixes, lessons)
│   └── tests.md                   # Testing strategy
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── next.config.ts
```

---

## Local Development

### Prerequisites

- **Node.js 22 LTS** or higher
- **npm** (ships with Node.js)
- **Neon account** — Free tier at [neon.tech](https://neon.tech) (serverless PostgreSQL)
- **Google AI API key** — For Gemini access at [aistudio.google.com](https://aistudio.google.com)

### 1. Clone and Install

```bash
git clone https://github.com/<your-username>/personalized-x-recommendation.git
cd personalized-x-recommendation
npm ci
```

### 2. Configure Environment

Create a `.env` file in the project root with the following variables:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# LLM (Google Gemini)
GEMINI_API_KEY=your-gemini-api-key

# Auth (Clerk) — keyless mode works without these, but needed for production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Seeder tuning (optional — defaults shown)
SEED_PERSONA_COUNT=20
SEED_TWEETS_PER_PERSONA=6
SEED_THREADS_PER_PERSONA=1
SEED_REPLIES_PER_PERSONA=2
SEED_QTS_PER_PERSONA=1
SEED_API_DELAY_MS=1500
```

### 3. Set Up the Database

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Seed the Synthetic Network

```bash
# Step 1: Generate personas (calls Gemini API)
npx tsx src/scripts/seed-personas.ts

# Step 2: Generate content, follow graph, and engagement (calls Gemini API)
npx tsx src/scripts/seed-content.ts
```

> **Note:** Seeding calls the Gemini API and may take several minutes depending on `SEED_*` counts and `SEED_API_DELAY_MS`.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Run Tests

```bash
npm run test:run
```

---

## Roadmap

### Completed

- [x] **Architecture decisions** — 11 ADRs documented
- [x] **Database schema** — 15 models with full indexing strategy
- [x] **Persona generation** — Gemini-powered with retry logic, batch generation, handle de-duplication
- [x] **Content generation** — Tweets, threads, replies, quote tweets, follow graph, engagement seeding
- [x] **Ranking engine** — All 4 stages implemented and unit tested
- [x] **Authentication** — Clerk: custom sign-in/sign-up pages, route protection via proxy.ts, user sync webhook
- [x] **Deployment** — Live on Vercel with Neon PostgreSQL
- [x] **Core UI shell** — X-style 3-column layout, left nav with Shift logo, right sidebar (trending + who to follow), dark theme matching X's colors

### In Progress

- [ ] **Feed integration** — Wire mock posts to real ranking pipeline, connect to database
- [ ] **Algorithm tuning panel** — Preference sliders that re-rank the feed in real time

### Planned

- [ ] **Explainability UI** — "Why am I seeing this?" cards with factor breakdowns
- [ ] **Topic interests** — Follow/unfollow topics, intensity controls (Less / Normal / More)
- [ ] **Feed composition chart** — Visual breakdown of topic distribution in your feed
- [ ] **Notifications** — GitHub/Discord-style triage with filter pills
- [ ] **Social features** — Profiles, follow/unfollow, follow suggestions
- [ ] **Behavioral simulation** — Ongoing persona activity, engagement cascades, interest drift
- [ ] **Sensitivity/modesty layer** — Presentation-layer CSS blur for media (ranking-neutral)

---

## Key Design Decisions

1. **Heuristic ranking, not ML** — Transparent, debuggable, and explainable. Every score decomposes into named, weighted factors. If the system used ML, "Why am I seeing this?" would be impossible to implement meaningfully.

2. **User-programmable algorithm** — Preference sliders don't just filter — they change the mathematical weights in the scoring function. This is the core differentiator from a standard social media app.

3. **Synthetic-first, real-user-compatible** — The network starts populated with LLM personas. Real users sign up and interact _alongside_ personas, so the feed is never empty.

4. **Anti-filter-bubble by design** — Heuristic filtering (Stage 3) actively prevents the algorithm from creating echo chambers through diversity enforcement rules.

5. **Presentation-layer modesty policy** — When media is added, a Muslim-first design principle applies CSS blur to human imagery. This is strictly visual — the ranking engine has zero awareness of it. Designed to also cover sensitive content (gore, surgeries).

---

## Documentation

| Document | Purpose |
|----------|---------|
| [`docs/Context.md`](docs/Context.md) | Project requirements and challenges |
| [`docs/UI/design-system-plan.md`](docs/UI/design-system-plan.md) | UI design system plan and branding guide |
| [`docs/adr/001-tech-stack-and-architecture.md`](docs/adr/001-tech-stack-and-architecture.md) | All 11 technology and architecture decisions |
| [`docs/journal.md`](docs/journal.md) | Development log: bugs encountered, fixes applied, lessons learned |
| [`docs/tests.md`](docs/tests.md) | Testing strategy and conventions |
| [`docs/general_coding_guidelines.md`](docs/general_coding_guidelines.md) | Coding standards for the project |

---

## License

This project is for educational and portfolio purposes. It is a reimplementation inspired by X's open-sourced algorithm architecture, not affiliated with X Corp.
