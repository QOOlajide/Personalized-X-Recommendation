# Shift Future Roadmap

This file preserves the product and ML ideas explored after the current stable
base commit:

- Base commit to keep code at: `afaf8cb`
- Commit message: `Remove Clerk, add guest identity, preference tuning UI, and feed integration`

The goal is to keep the codebase at that stable checkpoint while preserving the
ideas and implementation direction for future work.

## Stable Base

The `afaf8cb` state is the preferred fallback because it already has:

- Clerk removed
- guest identity via cookie-backed viewer flow
- feed integration wired to the ranking pipeline
- algorithm preference tuning
- a strong demo loop without the later experimentation churn

## Product Priorities To Revisit

These are the most valuable product-facing improvements to resume later.

### 1. Explainability cards on each post

Core idea:

- Turn the one-line ranking hint into an expandable `"Why am I seeing this?"`
  card on `PostCard`
- Show factor breakdown using existing `FeedItem.factors` and
  `post.primaryReason`
- Keep the UI educational and interpretable rather than opaque

Expected contents:

- topic relevance
- network bonus / in-network signal
- popularity
- recency
- engagement velocity / trending signal

Files previously involved or likely to revisit:

- `src/components/post/PostCard.tsx`
- `src/components/post/WhyThisPost.tsx`
- `src/services/feed/get-feed.ts`

### 2. Per-topic tuning sliders

Core idea:

- Extend the current slider-based algorithm controls with topic-by-topic
  preference controls
- Allow users to tune categories directly rather than only global ranking
  weights

Planned architecture:

- backend already supports topic preference reads/writes
- client state should continue using Zustand
- live preview should continue using the existing override/preview pattern

Files previously involved or likely to revisit:

- `src/components/feed/FeedExperience.tsx`
- `src/components/feed/TopicPanel.tsx`
- `src/stores/use-feed-store.ts`
- `src/services/preferences/get-preferences.ts`
- `src/app/actions/preferences.ts`

### 3. Sidebar polish / route stubs

Core idea:

- Remove 404s from sidebar destinations by adding placeholder pages for:
  - `/explore`
  - `/notifications`
  - `/messages`
  - `/profile`
  - `/settings`

Purpose:

- keeps the product feeling coherent during demos
- reduces distraction while the core feed experience is still the focus

### 4. Feed UX completion

Still worth revisiting later:

- infinite scroll / cursor pagination
- thread view
- quote-tweet embed display
- compose box
- `"show less like this"` UI hookup
- feed composition charts before/after tuning

## Ranking / Feed Ideas Worth Preserving

### Stronger topic impact in scoring

An explored idea was to make topic sliders visibly affect ranking by adjusting
the topic relevance term in `src/services/ranking/scoring.ts`.

Key principle:

- neutral topic relevance should contribute near zero
- strongly liked/disliked topics should meaningfully move score
- this should remain interpretable and compatible with explainability UI

### Keep diversity defenses

Do not remove the diversity/filtering layer in Stage 3.

Reason:

- the project should remain educational about ranking tradeoffs
- diversity caps and exploration are part of the story, not an obstacle
- they are the defense against pure feedback-loop collapse

Primary file:

- `src/services/ranking/heuristic-filtering.ts`

## ML / Realism Direction

The ML direction to preserve is the hybrid approach documented in:

- `docs/research/ml-grounding-plan.md`
- `docs/research/behavioral-patterns-reference.md`

### The intended strategy

1. Simulate persona behavior using documented social-feed patterns
2. Calibrate/validate those patterns against public datasets
3. Train an interpretable ranking model on the resulting data

### Behavioral patterns to model

The most important patterns identified for Shift:

- popularity bias / herding
- homophily
- recency bias
- controversy / novelty amplification
- position bias
- feedback loops / filter bubbles

### Public datasets to use later

Primary dataset direction:

- `MIND` for impression logs and position-sensitive measurements

Secondary:

- `KuaiRand` for cleaner exposure/counterfactual analysis
- `MovieLens` for popularity-bias sanity checks

## Engagement Simulation Work That Was Started

One of the main ideas worth preserving was enriching synthetic engagement so the
feed is not trained or ranked on flat, unrealistic activity.

### Intended Phase 1

Upgrade engagement seeding from a simple topic-overlap rule to a multi-factor,
multi-round simulation with:

- topic match
- homophily
- recency decay
- popularity / herding
- controversy / novelty appeal
- network boost

### Supporting utility ideas

Useful companion scripts explored during this phase:

- a reseed-only script for engagement that does not regenerate LLM content
- a diagnostic script for engagement distribution / skew
- a topic distribution diagnostic for spotting empty sliders

These are worth rebuilding later if needed, but they should not block keeping
the codebase stable now.

## Practical Resume Order

When resuming work in the future, this is the recommended order:

1. Restore explainability cards
2. Restore per-topic sliders
3. Add sidebar placeholder routes
4. Re-seed fresh content timestamps so recency becomes visible in demos
5. Revisit enriched engagement simulation
6. Add behavior/impression logging
7. Train interpretable Stage 2 model
8. Calibrate against MIND / KuaiRand

## Guardrails For Future Work

- Keep the project educational and inspectable
- Prefer interpretable ranking over black-box complexity early
- Preserve the `"algorithm is the product"` framing
- Avoid expanding scope before the core feed demo loop feels excellent
- Use the stable guest-auth base as the anchor

## Reference Docs To Keep

These files should remain in the repo as the canonical future-looking research
references:

- `docs/research/ml-grounding-plan.md`
- `docs/research/behavioral-patterns-reference.md`
