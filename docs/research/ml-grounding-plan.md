# ML & Realistic-Data Plan

A sequenced, plain-language plan for grounding Shift's recommendation engine in
real-world behavioral patterns, then learning the ranking from data.

Full background and citations: [`behavioral-patterns-reference.md`](./behavioral-patterns-reference.md).

---

## The goal

Make the feed's behavior **realistic and grounded**, not hand-guessed, and
demonstrate a real ML pipeline — without depending on real user traffic (which
we won't have enough of to train on).

The strategy is a **hybrid**:

1. **Simulate** persona engagement using documented behavioral patterns as the
   rules of behavior (gives us volume).
2. **Calibrate / validate** those rules against real public datasets (gives us
   realism).
3. **Train** an interpretable model on the resulting data, keeping the
   "Why am I seeing this?" explainability intact.

---

## The patterns that matter (ranked for a social feed)

From the research, in order of engagement impact for a feed like ours:

1. **Controversy / novelty amplification** — emotional/surprising content gets the most engagement.
2. **Position bias** — people click what's at the top, regardless of quality.
3. **Popularity bias (herding)** — popular gets more popular (rich-get-richer).
4. **Feedback loops / filter bubbles** — the above compound over time into echo chambers.
5. **Recency** — fresh content dominates (load-bearing in a Twitter-style feed).
6. **Homophily** — people engage with similar others (shapes the graph more than per-post ranking).

Bonus patterns to keep in mind later: cold-start, preference drift, serendipity,
creator (supply-side) incentives, exposure bias (MNAR).

---

## How this maps to the existing code

| Area | File today | What changes |
|------|-----------|--------------|
| Engagement simulation | `src/lib/seed/engagement.ts` | Currently one rule (topic overlap). Enrich with herding, homophily, recency, controversy/novelty. |
| Scoring (Stage 2) | `src/services/ranking/scoring.ts` | Already has the right factors. Add a learned model (logistic regression) to set the weights from data. |
| Diversity defenses (Stage 3) | `src/services/ranking/heuristic-filtering.ts` | Already implements exploration + diversity caps — the documented defense against feedback loops. Keep. |

The architecture already aligns with the literature; this is enrichment, not a rewrite.

---

## Dataset decision

- **MIND (Microsoft News)** — primary. Has impression logs (what was *shown* and
  where), which is what unlocks position-bias and CTR-by-position measurement.
  Closest public analog to our post feed.
- **KuaiRand** — for measuring filter-bubble formation (has randomly inserted
  exposures for clean counterfactuals).
- **MovieLens** — secondary sanity-check for popularity bias only (no impression
  logs, so it can't measure position bias).

---

## Sequenced build plan

### Phase 1 — Enrich the simulation (no new infrastructure)
Upgrade `engagement.ts` from "topic overlap" to a multi-factor engagement
probability using the parameter table below, with reasonable starting values.
This immediately produces more realistic synthetic data to work with.

### Phase 2 — Add behavior + position logging
Record real interaction signals in the app: impressions (which posts were shown
and at what position), clicks/expands, dwell/scroll time, likes/replies. This is
the plumbing required before any real-data calibration is meaningful — and it
powers the live "watch it adapt to me" demo.

### Phase 3 — Train the scoring model
Build the training pipeline: turn logged/simulated interactions into rows of
features + a yes/no engagement label, train **logistic regression** first
(interpretable; weights map straight onto the explainability cards), then
optionally **gradient-boosted trees** for non-linear interactions. Serve the
model's prediction as the Stage 2 score, with sliders still re-weighting on top.

### Phase 4 — Calibrate & validate against real data
Use MIND/KuaiRand to measure the real strength of each pattern (e.g. CTR-by-
position curve, recency half-life, popularity Gini growth) and feed those numbers
back into the simulation. Validate the trained model behaves sensibly on real
data.

### Phase 5 — (Optional) Expand
Second ML feature: "who to follow" recommendations. Then semantic search / spam
filter if desired.

---

## Simulation parameter table (Phase 1 starting point)

| Pattern | Simulation parameter | Calibrate later from |
|---------|---------------------|----------------------|
| Popularity (herding) | Exposure/engagement multiplier scaling with interaction count (power-law exponent α) | Gini increase per round (MovieLens) |
| Homophily | Intra-cluster engagement boost (×1.5–2.5) | Intra/inter-cluster CTR ratio (MIND) |
| Recency | Exponential decay half-life (per content type) | CTR-vs-age curve (MIND) |
| Controversy/novelty | Outrage/novelty multiplier on baseline engagement | MFT-lexicon CTR lift (MIND) |
| Position bias | Position examination probabilities θ₁…θₙ | CTR-by-position on impression logs (MIND) |
| Feedback loop | Rounds before diversity collapse; exploration rate ε | Gini trend / intra-list diversity over rounds |

---

## Honest caveats

- **Circularity:** a model trained on rules we invented just re-learns those
  rules. Real-data calibration (Phase 4) is what breaks this — until then, the
  value is the *pipeline*, not superhuman predictions.
- **Volume:** real visitor data alone will be far too small to train on; the
  simulation provides the volume, real datasets provide the realism.
- **Sequencing:** don't attempt real-data calibration before logging exists
  (Phase 2). Phase 1 stands on its own and is the right first step.
