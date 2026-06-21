# Behavioral Patterns in Recommendation Systems
## A Research Reference for Simulation, Calibration & Explainable Ranking

***

## Executive Summary

This report covers six well-documented behavioral patterns that shape engagement in modern social feed recommendation systems. Each pattern is defined precisely, its prevalence and magnitude quantified from primary literature, and the techniques large-scale systems use to handle it are described alongside practical guidance for measuring it from public datasets. The report closes with a ranked importance ordering, a dataset comparison, and several additional patterns that a sophisticated simulator should model.

***

## Pattern 1: Popularity Bias / Herding

### Definition

Popularity bias is the tendency of recommendation algorithms to disproportionately recommend items that are already popular, causing popular items to receive even more exposure and become more popular still — a preferential-attachment dynamic sometimes called the **Matthew Effect** ("rich-get-richer"). The bias has both a data-side source (popular items are over-represented in training logs) and a model-side source (collaborative filtering amplifies co-occurrence statistics).[^1][^2][^3]

### Prevalence

Popularity bias is **intentional in origin, emergent in magnitude**. Most platforms optimize for engagement, and popular items genuinely generate more short-term engagement. However, the feedback loop is emergent: the algorithm is not designed to exclude niche items, but the data-collection process is biased from the start because only exposed items get clicks, and exposure heavily favors already-popular items. Studies using Twitter and MovieLens show that recommending users to follow others *amplifies* popularity bias even more strongly than item recommendations.[^4]

### Importance / Magnitude

- Gini coefficient studies show that successive rounds of collaborative filtering or local-diffusion-based recommendation progressively widen item popularity dispersion — starting from a given Gini value and increasing it in every iteration.[^5]
- Average Recommendation Popularity (ARP), a standard metric, confirms that virtually all mainstream CF algorithms recommend items that are on average more popular than the items users rated in the training set.[^6]
- In typical evaluation datasets, the top 20% of popular items can account for 80–90% of all recommendations produced by unmodified matrix factorization models.[^1]
- Research in 2025 found that niche-focused users — who are often the most active raters — suffer the steepest deterioration in calibration and long-tail exposure over successive feedback loop iterations.[^7]

### How Real Systems Handle It

Systems take a **dual approach**: they tolerate some popularity boost (popular items *do* convert better short-term) but actively inject debiasing to prevent the long tail from dying:

- **Inverse Propensity Weighting (IPS):** Re-weight training samples by the inverse probability of each item being exposed; rare items that *do* get clicked are weighted up, correcting for their under-exposure. IPS-based methods are effective but sensitive to propensity estimation errors; power-law–based propensity models can over-penalize popular items.[^8][^9][^10]
- **Fair Sampling (FS):** Ensure each user and item has equal probability of selection as positive or negative training instances, removing the popularity-driven data imbalance without requiring explicit propensity estimation.[^11]
- **Diversity injection / calibrated blending:** Cap the fraction of popular items in the final slate; inject a fixed percentage of long-tail items regardless of model score.[^3]
- **Exploration budgets (multi-armed bandits):** Reserve 5–10% of impressions for items outside the high-confidence exploitation set.[^12]

### How to Measure It

| Metric | Formula / Approach | Source Dataset |
|--------|-------------------|----------------|
| **Gini coefficient** | Compute \(G = 1 - 2\int_0^1 C(x)\,dx\) over the distribution of recommendation counts per item | MovieLens, MIND |
| **ARP (Average Recommendation Popularity)** | Average number of training ratings for recommended items across all users[^6] | MovieLens |
| **APLT** | Average % of long-tail items (defined as bottom 80% by interaction count) in recommended lists[^6] | MovieLens |
| **Popularity rank correlation** | Spearman correlation between item popularity rank and position in output ranking[^13] | Any dataset |

To calibrate the feedback-loop strength for simulation, run multiple rounds of recommendations on your dataset, measure the Gini coefficient after each round, and fit the slope of Gini increase per iteration. This gives you a concrete "popularity amplification factor" to plug into your simulator.

***

## Pattern 2: Homophily

### Definition

Homophily is the sociological tendency for similar users to connect and interact with each other ("similarity breeds connection"). In recommendation contexts, it means users preferentially engage with content from, or similar to, others who resemble them in interests, ideology, or social group. Collaborative filtering amplifies homophily because its similarity computations explicitly reward shared preferences.[^14][^15]

### Prevalence

Homophily is both an **organic user behavior** and an **algorithmically amplified** effect. Social-graph-based recommenders use a technique called **social regularization**, which explicitly constrains user embeddings to be similar if two users are socially connected. This is an intentional design choice that boosts accuracy on average, but the side effect is that friends are made to appear far more similar than they actually are in latent feature space — well beyond the diagonal in before/after LF-similarity scatter plots.[^14]

Research on political homophily shows that as links form naturally in social networks through recommendations or indirect interaction, each new link disproportionately reinforces existing communities, making the network progressively more insular. YouTube's channel recommendation system has been shown to create algorithmically induced homophilous communities, including far-right communities, in both the US and Germany — driven by topic, language, and location signals rather than explicit political labels.[^16][^17]

### Importance / Magnitude

- Moral-emotional content spreads 20% more per additional moral-emotional word *within* ideologically homophilous networks, but this amplification effect is dramatically weaker *between* groups — a direct quantification of how homophily constrains information diffusion.[^18]
- A 2020 study found that filter bubbles concern **up to 10% of users** on Twitter, as measured by the fraction of recommendation lists where all suggested content falls within the user's existing community.[^19]
- Statistical physics analysis of user-user CF on last.fm data identified three distinct behavioral phases: disorder (diverse exposure), consensus (shared taste), and **polarization** (users cluster into isolated groups, each converging on a single item type). Real social networks operate near or inside the polarization phase boundary when similarity bias is strong.[^20]

### How Real Systems Handle It

- **Cross-community link recommendations:** Explicitly recommend connections to users outside the current community while maintaining partial similarity, as shown to reduce network homophily in acceptance experiments.[^16]
- **Diversity-aware ranking:** Add a diversity term to the ranking objective that penalizes slates dominated by a single topic cluster.
- **Out-of-network sourcing:** Twitter's algorithm deliberately includes tweets from users you don't follow (sourced via graph traversal and topic models) to counteract in-network homophily.[^21]

### How to Measure It

From a dataset with user-item interactions and any user attribute (genre preferences, ideological cluster, topic cluster):

1. **Intra-community CTR ratio:** For each user, separate recommended items into "same cluster" vs. "different cluster." Compute the ratio of engagement rates. If intra-community CTR / inter-community CTR > 1.5, strong homophily is present.
2. **Latent feature similarity shift:** In a model that uses social regularization, compare pairwise cosine similarity of user embeddings before and after training. The gap between friend-pair similarity and random-pair similarity is the amplification signal.[^14]
3. **Moral contagion score on MIND:** MIND's click logs can be segmented by news category; measure whether clicks on politically categorized content cluster by user history category.

***

## Pattern 3: Recency Effect

### Definition

The recency effect is the tendency of recommendation systems (and users) to disproportionately favor fresh content over older content of equal intrinsic quality. In sequential recommendation models (especially RNN-based), this manifests as overly high weight on the last few interactions in a session, which crowds out long-term user interests.[^22][^23]

### Prevalence

The recency effect is **both intentional (for news/social feeds) and an emergent failure mode (for stable preferences)**. Platforms like X explicitly reward "engagement velocity" — the rate of engagement accumulation in the first 15–30 minutes after posting. YouTube's 2016 DNN architecture introduced an "example age" feature specifically to capture the time-dependent behavior of videos and bias toward fresh content, because older popular videos were otherwise systematically over-recommended.[^24][^25]

For news recommendations, the recency-importance tradeoff is a fundamental design tension: a story's importance only becomes clear as it ages, but by then its freshness score has decayed, leading to systematic under-recommendation of high-importance stories discovered late.[^26]

### Importance / Magnitude

- On a large-scale long-form video streaming platform, selectively injecting recent watch history at inference time (reducing the personalization feedback loop from daily to **intra-day**) produced a statistically significant **0.47% increase in key engagement metrics**, described as among the most substantial single-feature gains in that platform's recent experimentation history.[^27]
- A dataset study on retail products estimated a **half-life of ~43 days** for user preference relevance — meaning an interaction from 43 days ago carries only half the weight of a current interaction under an exponential decay model.[^28]
- High recency bias in RNN-based sequential recommenders measurably reduces serendipity (the model repeats recent items rather than surfacing surprises) and degrades long-term recommendation performance across all evaluated models; mitigating recency bias with recency dropout consistently improved metrics.[^22]

### How Real Systems Handle It

- **Example age features (YouTube):** Feeding the age of a training example as a feature allows the model to learn and correct for the systematic over-representation of old-but-popular items in training data.[^25]
- **Exponential time decay:** Weight each interaction by \(e^{-\lambda(t_{\text{now}} - t_{\text{interaction}})}\) where \(\lambda = \ln(2)/h\) and \(h\) is the half-life in days.[^29][^28]
- **Recency dropout:** During training, randomly mask recent items in session sequences, forcing the model to predict from older history and reducing recency overfitting.[^23]
- **Engagement velocity scoring:** X uses short-window engagement rate (first 15 minutes) as a ranking feature alongside absolute engagement, giving new content a temporary boost window.[^24]

### How to Measure It

Using MIND (which has timestamps):

1. **Temporal CTR decay curve:** Plot click-through rate of articles against hours since publication. Fit an exponential decay to get empirical \(\lambda\) (and thus half-life \(h\)).
2. **Interaction age distribution in model predictions:** For any trained sequential model, compute the average age (in days) of the top-3 interactions most attended to by the model. High recency bias → this average is very small.
3. **Recency bias metric (RBM):** The metric proposed by  directly quantifies how much a sequential model concentrates on recent items vs. distributing attention across the full session history.[^22]

On MovieLens: timestamps exist, but since ratings are not tied to impression logs, you can only measure user interaction recency, not content publication freshness — a key limitation.

***

## Pattern 4: Engagement-Driven Amplification of Controversy and Novelty

### Definition

Engagement-optimizing recommenders amplify content that generates strong affective reactions — surprise, anger, moral outrage, disgust — because such content produces the most reliable clicks, comments, shares, and dwell time per impression. This creates a systematic bias toward **controversial, emotionally provocative, and novel content**, irrespective of its accuracy or social benefit. The phenomenon is emergent: platforms intend to maximize engagement, not to spread misinformation, but the behavioral truth is that outrage-evoking content, including misinformation, generates higher engagement signals than factually accurate but less emotionally charged content.[^30][^31]

### Prevalence

This pattern is **pervasive and thoroughly documented**:

- Facebook's own internal research (revealed via Frances Haugen) showed its algorithm was amplifying divisive and emotionally charged content because that content generated the most engagement. Internal documents stated: *"Misinformation, toxicity, and violent content are inordinately prevalent among reshares"*.[^32][^33]
- In 2018, Facebook reconfigured its recommendation algorithm in response to declining engagement, which led outrageous and sensationalized content to go viral at higher rates.[^32]
- TikTok accounts given an initial interest in masculinity or loneliness were shown **four times as many misogynistic videos** — rising from 13% to 56% of recommended content — within a short audit period.[^34]
- A TikTok sock-puppet audit found strong amplification of content aligned with bot interests, with **rapid reinforcement typically occurring within the first 200 videos watched**, and a strong negative correlation between amplification intensity and content diversity over time.[^35]

### Importance / Magnitude

- Each additional **moral-emotional word** in a social media post increases its retweet rate by approximately **20%**.[^18]
- Misinformation news links were consistently associated with **more moral outrage** than factually accurate URLs in studies spanning Twitter (~90,000 URLs) and Facebook (~9,900 URLs). On Facebook, misinformation was more strongly associated with outrage than with *any other* affective reaction.[^36]
- Misinformation exploits outrage across multiple platforms, time periods, and classification schemes — outrage is a stable and predictable feature of misinformation spread that persists even when content changes.[^31]
- A control framework using the LIAR2 dataset demonstrated up to **76% reduction in misinformation propagation** by penalizing extreme negative sentiment and novelty in content scoring, with minimal engagement loss.[^37]
- Recency and novelty together explain a significant fraction of viral spread; "fake information spreads faster and further" in part because it more reliably provokes the anger-disgust-surprise cluster that maximizes shares.[^30]

### How Real Systems Handle It

- **Composite engagement scoring (not pure CTR):** X/Twitter's open-sourced algorithm uses a weighted sum of engagement types: `reply_engaged_by_author` (+75), `reply` (+13.5), `good_profile_click` (+12), `retweet` (+1), `fav/like` (+0.5), and crucially `negative_feedback_v2` (-74). By treating mutes, blocks, and "not interested" signals as strong negatives, the system provides some self-correcting pressure against purely outrage-driven viral content.[^38]
- **Integrity filters:** Separate models score content for misinformation signals, spam, and policy violations; items above thresholds are suppressed regardless of engagement score.[^21]
- **Watch-time and completion rate instead of pure CTR:** YouTube shifted to optimizing for watch time and video completion, which dampens pure click-bait that users abandon after a second, while still rewarding genuinely engaging content.[^39][^25]

### How to Measure It

Using MIND (with article text and click logs):

1. **Sentiment / moral-emotion scoring:** Apply a sentiment model or Moral Foundations Theory lexicon (MFT) to article headlines. Bin articles by outrage-score quintile and compute CTR per quintile. Measure the slope — a positive slope confirms amplification.[^40]
2. **Category-level engagement lift:** MIND includes news categories (politics, health, sports, etc.). Compare average CTR for politically-categorized articles vs. lifestyle articles as a proxy for controversy premium.
3. **Novelty-CTR correlation:** Measure cosine distance between an article's content embedding and the user's historical click history. Bin by novelty quintile and measure engagement. High novelty + high controversy items should show the strongest engagement lift.

For your simulation: encode each LLM-generated persona post with a controversy/novelty score and add a multiplier to its baseline engagement probability proportional to this score.

***

## Pattern 5: Position Bias (Primacy Effect in Lists)

### Definition

Position bias is the tendency of users to click items in a ranked list based on their **position** rather than their intrinsic relevance — items at the top of a list receive more clicks simply because they are examined first, independent of quality. This creates a self-reinforcing feedback loop: top-ranked items accumulate clicks, models train on those clicks as relevance signals, and items are ranked even higher, receiving even more clicks.[^41][^42]

### Prevalence

Position bias is **universal** across search, recommendation, and advertising systems. It is an emergent property of human visual scanning behavior (top-to-bottom) and has been documented in Google Search, YouTube, news feeds, e-commerce, and social timelines. It is perhaps the single most studied bias in the learning-to-rank literature.[^43][^44]

### Importance / Magnitude

- A widely cited heuristic from click-log analysis: **position 1 gets ~30% CTR vs. ~5% CTR for the same item in position 5** — a 6× differential attributable purely to position. Causal estimates from regression discontinuity designs on search ad data are more conservative but still show statistically significant position effects.[^45][^41]
- Google's Position-Based Model (PBM) confirms that click probability at position \(k\) is proportional to the product of item relevance and a position-specific examination probability \(\theta_k\), where \(\theta_k\) decays rapidly with \(k\).[^44]
- Without correction, training on click data causes models to **overestimate CTR for bottom positions** (they see fewer clicks than the model's pure relevance score predicts) and underestimate CTR for top positions.[^46]
- Position debiasing in a large-scale e-commerce experiment demonstrated that spreading visibility more evenly across the assortment **significantly improved assortment utilization with no degradation in user engagement or revenue metrics**.[^47]

### How Real Systems Handle It

- **Inverse Propensity Weighting for position:** Model examination probability \(\theta_k\) as a function of position \(k\), then re-weight the loss of each click observation by \(1/\theta_k\). This is the standard IPS approach for position bias, used by Google (Google Drive recommendations) and implemented in Unbiased Learning-to-Rank (ULTR) frameworks.[^8]
- **Randomized position experiments (RandTopN / RandPair):** Occasionally randomize the positions of items to collect counterfactual click data that is not confounded by the production ranking. Google used this to estimate \(\theta_k\) empirically.[^44]
- **Dual-model gradient interpolation:** A position-aware model and a position-unaware model are combined with a mixing weight \(\epsilon\) that minimizes the discrepancy between predicted and actual CTR at each position.[^48]
- **Separating positional features from content features:** Google Search learned to separate positional signals from content-quality signals in ranking models, preventing position from being conflated with relevance.[^43]

### How to Measure It

**MIND is the ideal dataset for this** because it includes full impression logs — for each impression, you know which articles were shown, in what order, and which were clicked.

1. **Empirical CTR by position:** Group impressions by position 1–N. Plot CTR vs. position. Fit an exponential decay: \(\text{CTR}(k) \approx \theta_1 \cdot e^{-\alpha(k-1)}\) or a power law \(\theta_1 / k^\beta\) to estimate the position bias decay parameter.[^44]
2. **RandPair counterfactual estimate:** If MIND has any natural variation in item position across impressions (the same article appearing in different positions for different users), run a within-article regression of CTR on position to isolate the causal position effect.
3. **AUC degradation test:** Train a model on raw (position-biased) clicks and another on IPW-corrected clicks. The ranking quality gap measures how much position bias is distorting the learned relevance scores.

MovieLens has no impression logs and therefore **cannot be used to measure position bias at all** — this is one of its major limitations for this use case.

***

## Pattern 6: Feedback Loops, Filter Bubbles, and Echo Chambers

### Definition

Feedback loops are the compounding, time-dynamic process through which the five patterns above interact and reinforce each other. A **filter bubble** refers to algorithmic content selection that progressively narrows a user's information environment — the algorithm does not show them content that would challenge their existing preferences or beliefs. An **echo chamber** is the sociological outcome: a user's information environment where they only encounter like-minded sources, which may be driven by algorithmic filtering, self-selection, or both. The two are related but distinct: filter bubbles are algorithm-caused, while echo chambers can be self-reinforcing without algorithmic intervention.[^49][^50][^32]

### Prevalence and the Debate

The existence of filter bubbles and echo chambers is **confirmed** by systematic reviews (2019–2025), though their magnitude is debated. Some research argues that personalization algorithms *increase* within-user content diversity compared to non-personalized ranking, because they surface content the user would not have discovered through their social network alone. However:[^51][^52][^49]

- Echo chambers and filter bubbles are confirmed to exist and raise diversity and fairness concerns.[^51]
- Dynamic feedback loop simulations on MovieLens and similar datasets show that niche-focused users lose the most calibration and long-tail exposure over iterative recommendation cycles, with their preferences progressively converging toward popular-item patterns.[^7]
- Deep filter bubbles in short-video recommendation (modeled after TikTok) are documented: strong amplification occurs within ~200 videos, rapidly decreasing content diversity.[^53][^35]

### Importance / Magnitude

- A filter bubble study on Twitter found that up to **10% of users** experience recommendations where all suggested content falls within their existing community.[^19]
- Feedback dynamics in CF systems progressively misalign recommendations with the most valuable users (niche-focused), creating systematic inequality: popular-focused users gain steady accuracy while niche-focused users see the steepest deterioration.[^7]
- A statistical physics model of CF on last.fm showed the system gravitating toward a polarization phase when both similarity bias and popularity bias exceed threshold values, with users spontaneously splitting into groups each converging on a single item.[^20]

### How Real Systems Counteract It

- **Continuous exploration (epsilon-greedy, UCB, Thompson Sampling):** Reserve a fraction of impressions (typically 5–10%) for non-optimal items to prevent degenerate convergence. Research confirms that continuous random exploration and linear growth in candidate pool size are the strongest remedies against degenerate feedback.[^54][^55][^12]
- **Diversity injection in re-ranking:** After model-based scoring, a diversity constraint (e.g., Maximum Marginal Relevance, or a Determinantal Point Process) is applied to the final slate to ensure topic/source variety.[^56]
- **Dynamic candidate pool expansion:** Adding new items to the candidate pool at a linear or superlinear rate prevents any single item from dominating.[^57][^54]
- **Cross-community link recommendations:** For social graphs, recommending connections outside the user's current community (while preserving some similarity) reduces network homophily and is empirically shown to broaden exposure.[^16]
- **Causal adjustment (CAFL) and dynamic propensity re-weighting (DPR):** These techniques use do-calculus and tracked exposure distributions to correct for the growing bias introduced by prior recommendation decisions.[^57]

### How to Measure It

1. **Intra-session diversity (ILD):** Average pairwise distance between content embeddings in a user's recommended feed. Track ILD across simulated time steps — a declining ILD indicates filter bubble formation.
2. **Gini coefficient over time:** Run your simulator for T rounds; measure the Gini coefficient of the item exposure distribution after each round. An increasing Gini = growing popularity feedback loop / filter bubble.
3. **Cross-community exposure ratio:** For each user, compute the fraction of recommended items from outside their primary topic/ideological cluster. Measure how this ratio changes across time steps in simulation.
4. **KuaiRand is ideal here:** Its randomly inserted exposures provide counterfactual data to estimate how recommendations would have diverged from random exposure, enabling clean measurement of filter bubble formation.[^58]

***

## Summary Table

| Pattern | Prevalence | Effect Strength | How Real Systems Handle It | Key Measurement |
|---------|-----------|----------------|---------------------------|-----------------|
| **Popularity bias** | Universal; intentional + emergent | Top 20% of items receive 80–90% of CF recommendations[^1] | IPS re-weighting, fair sampling, calibrated blending, exploration budgets | Gini coefficient, ARP, APLT over training rounds[^6][^5] |
| **Homophily** | Universal in social feeds; amplified by CF | Social regularization creates far-more-similar latent features than raw social ties[^14]; ~10% of users in full filter bubbles[^19] | Cross-community recommendations, diversity-aware ranking, out-of-network sourcing | Intra-/inter-cluster CTR ratio; LF-sim before/after social regularization |
| **Recency effect** | Universal; intentional in news/social; failure mode in stable-preference domains | Intra-day personalization → +0.47% engagement[^27]; ~43-day preference half-life[^28] | Example-age features, time-decay weighting, engagement velocity scoring | Exponential decay fit on CTR vs. age curve; Recency Bias Metric[^22] |
| **Controversy / novelty amplification** | Pervasive; emergent side effect of engagement optimization | +20% retweet rate per moral-emotional word[^18]; misinformation exploits outrage systematically[^31] | Composite engagement weights with negative feedback penalty; integrity filters; watch-time optimization | MFT lexicon CTR lift by outrage quintile[^40]; novelty-CTR correlation |
| **Position bias** | Universal in list-based feeds | ~6× CTR ratio position 1 vs. position 5 (naïve estimate)[^41]; causal estimates smaller but significant[^45] | IPS for position (ULTR), dual-model interpolation, random position experiments | Empirical CTR-by-position curve on MIND impression logs; \(\theta_k\) decay fit |
| **Feedback loops / filter bubbles** | Universal; magnitude debated | Up to 10% of users in full filter bubbles[^19]; niche users lose most calibration over time[^7] | ε-greedy/bandit exploration, DPP diversity injection, candidate pool expansion, causal re-weighting | ILD over time, Gini trend across simulation rounds, cross-community ratio |

***

## Ranked by Engagement Impact in a Modern Social Feed

The following ranking is for a **social media feed** context (not e-commerce or music streaming, which have different dynamics).

1. **Engagement-driven amplification of controversy / novelty** — *Strongest driver of short-term viral engagement.* The signal is the most direct: moral-emotional content measurably outperforms neutral content in shares, replies, and dwell time. Every engagement-optimized system monetizes this whether it intends to or not. Its effect on platform health (misinformation, polarization) is also the most consequential.[^36][^31][^18]

2. **Position bias** — *Mechanistically dominant in any list-based feed.* A 6× CTR differential between position 1 and 5 dwarfs most content-quality effects in raw magnitude. It directly determines what gets clicked and trained on in every iteration. All other patterns compound through this mechanism because impressions *are* the ranked list.[^42][^41]

3. **Popularity bias** — *The algorithmic gravity well.* In the long run, popularity bias is the primary force that determines the "shape" of item exposure distributions and is the root cause of long-tail invisibility. It amplifies in every feedback loop iteration and intersects with controversy amplification (popular items are often controversial).[^1][^7]

4. **Feedback loops / filter bubbles** — *The temporal compound of all other patterns.* Ranked fourth because it is a second-order effect — it emerges from the interaction of patterns 1–3 over time rather than being a primary signal. Its impact is high in cumulative terms (it determines long-run ecosystem health) but lower in per-impression terms than the first three.[^54][^7]

5. **Recency effect** — *High impact in news and short-video contexts, moderate in others.* In a Twitter-style social feed, recency is load-bearing: a tweet from yesterday is nearly invisible. But unlike controversy, recency does not have an asymmetric amplification property — it decays neutrally rather than selectively amplifying harmful content.[^27][^29]

6. **Homophily** — *Important structurally, lower in per-item marginal engagement.* Homophily shapes *who* users engage with and determines the social graph structure that the CF algorithms then exploit. But at the level of individual item ranking, it is less impactful than position, popularity, or emotional valence — it is a background constraint rather than a per-item booster.[^20][^14]

***

## Dataset Comparison: MovieLens vs. MIND vs. Alternatives

### MovieLens

MovieLens (100K, 1M, 10M, 20M, 25M variants from GroupLens) contains **explicit ratings** (1–5 stars) from users on movies, with timestamps. Its properties:[^59][^60]

- **Strengths:** Dense, well-studied benchmark; user-item matrices available at multiple scales; timestamps enable recency modeling; ratings are interpretable.
- **Limitations for your use case:**
  - No impression logs — you cannot observe *what was shown but not clicked*. This makes position bias completely unmeasurable and popularity bias measurement confounded (non-interactions may be "not shown" rather than "not liked").[^61]
  - Explicit ratings are a poor proxy for social feed engagement, which is driven by implicit signals (clicks, shares, dwell time).
  - No content text, so controversy / novelty scoring requires augmentation.
  - No social graph, so homophily measurement is indirect.

**Best for:** Calibrating baseline CF behavior, popularity bias (Gini/ARP metrics), and temporal preference decay (half-life estimation from rating timestamps).

### Microsoft MIND

MIND contains ~160,000 English news articles and 15 million+ impression logs from 1 million anonymized users of Microsoft News. Each impression log includes: the list of articles shown (with position), which were clicked, the user's prior click history, and timestamps. Article content (headline, abstract, body, category, entities) is also included.[^62][^63]

- **Strengths for your use case:**
  - **Full impression logs** = directly measurable position bias, selection bias, and CTR-by-position curves.
  - Article-level content enables controversy/novelty scoring via NLP (sentiment, MFT lexicon, content embeddings).
  - Category labels enable homophily measurement (do users in category X click category X articles more?).
  - Timestamps enable recency effect quantification.
  - Large scale (1M users) with negative examples (shown but not clicked), enabling proper unbiased evaluation.
- **Limitations:**
  - News consumption behavior may differ from social media (less social graph signal; users follow topics not people).
  - No social graph between users (cannot measure homophily at the person-to-person level).
  - Recency dynamics are faster (news decays in hours; social content decays in minutes to days).

**Best for:** Position bias, recency decay, novelty/controversy amplification, and filter bubble formation. **MIND is far superior to MovieLens for your hybrid simulation/calibration use case.**

### Superior Alternatives for Social-Media-Style Implicit Feedback

| Dataset | Scale | Signals | Position Bias | Social Graph | Best For |
|---------|-------|---------|---------------|--------------|----------|
| **Twitter RecSys Challenge 2020** | 160M tweets, ~160M interactions[^64] | Like, retweet, reply, retweet-with-comment; timestamps | Partial (timeline position metadata) | Follower graph | Controversy amplification, homophily, engagement weighting calibration |
| **KuaiRec** | 1,411 users, 3,327 videos (near-fully observed)[^65][^66] | Watch ratio, like, follow, comment; no missing values | Not directly (no impression ordering) | Weak social graph | Unbiased preference estimation, eliminating exposure bias in evaluation |
| **KuaiRand** | ~27,000 users, 7,583 videos[^58] | 12 feedback signals; **randomly exposed items inserted into feeds** | Direct causal estimates possible | Weak | Unbiased sequential evaluation, counterfactual filter bubble measurement |
| **VK-LSVD** | 10M users, 20M videos, 40B+ interactions[^67] | Watch time, likes, dislikes, shares; rich content embeddings | Indirect (contextual metadata) | Socio-demographics | Large-scale popularity and temporal dynamics |
| **Reddit Engage Corpus** | Subreddit-level social recommendation[^68] | Post/comment history; upvotes | No | Subreddit communities | Homophily (community-level), filter bubbles |

**Recommendation for your project:** Use **MIND** as your primary calibration dataset for position bias, recency decay, and controversy amplification. Supplement with **KuaiRand** for unbiased counterfactual evaluation of filter bubble formation. Treat MovieLens as a secondary sanity-check for CF popularity bias only.

***

## Additional Patterns a Sophisticated Simulator Should Model

Beyond the six core patterns, the following are well-documented in the literature and should be incorporated at minimum as tunable parameters:

### 7. Cold-Start Asymmetry

New items with no interaction history receive near-zero impressions in standard CF systems because they have no embedding or co-occurrence signal. This creates a systematic disadvantage for new content that is independent of its quality. In a social network simulator, new persona posts and new user accounts both suffer cold-start; the simulator should model an initial "random exploration" phase during which items receive a flat boost before the personalized signal kicks in.[^69][^3]

### 8. Temporal Drift / Preference Shift

User preferences drift over time — interests evolve seasonally, culturally, and in response to events. Matrix factorization embeddings trained on older data become stale. TimeSVD++ and GRU-based models attempt to capture this by making user and item embeddings time-dependent. For your simulation, model each persona's interests as a slow random walk in embedding space rather than a static vector.[^70][^71]

### 9. Serendipity / Novelty–Engagement Tradeoff

Recommendations that are *too* similar to past preferences produce diminishing returns — users disengage when the feed feels stale. Beyond-accuracy metrics (serendipity, novelty, surprise) capture the marginal value of unexpected content. This tradeoff is distinct from controversy amplification: novelty is positive serendipity, while controversy is negative-emotion novelty. In your simulation, model a "discovery coefficient" that boosts engagement for content outside the user's immediate neighborhood, up to a threshold beyond which the content is too alien.[^72][^73]

### 10. Creator/Provider Incentives (Supply-Side Effects)

In real social networks, content creators observe which types of content get amplified and adjust their posting behavior accordingly — a supply-side feedback loop. If controversy drives reach, creators produce more controversial content. This is an emergent second-order effect not captured by pure user-behavior modeling. For an X-style simulation, modeling LLM-persona "posting strategies" that adapt to observed engagement signals would make the simulation more realistic.[^54]

### 11. Exposure Bias / Missing-Not-At-Random (MNAR)

Non-interactions in implicit feedback datasets are not random negatives — they represent items the user either didn't want or simply wasn't shown. This MNAR structure means CF models trained naively on implicit feedback systematically learn the *historical exposure policy* rather than true user preferences. For calibration against real datasets, apply IPS or use a fully-observed dataset like KuaiRec where near all items have been viewed.[^65][^61]

***

## Practical Notes for Your Hybrid Simulation

For each pattern, the recommended simulation parameter and calibration approach are:

| Pattern | Simulation Parameter | Calibrate From |
|---------|---------------------|----------------|
| Popularity bias | Item exposure multiplier scaling with interaction count (power law exponent α) | Gini coefficient increase per round on MovieLens |
| Homophily | Intra-cluster engagement boost factor (e.g., ×1.5–×2.5) | Intra-/inter-community CTR ratio on MIND |
| Recency | Exponential decay half-life h (days) per content type | CTR-vs-age decay curve on MIND |
| Controversy/novelty | Outrage score multiplier on baseline CTR | MFT lexicon × CTR quintile regression on MIND |
| Position bias | Position-specific examination probabilities θ₁...θₙ | Empirical CTR-by-position on MIND impression logs |
| Feedback loop | Number of rounds before diversity collapse; exploration rate ε | Gini trend across rounds; ILD decline |

Starting with **logistic regression** is appropriate for the scoring stage — it is interpretable and will naturally surface the relative contribution of each of these signals as feature weights. Gradient-boosted trees (e.g., LightGBM) can then be used to capture non-linear interactions (e.g., the interaction between position bias and recency that amplifies fresh-but-popular content). Both are standard baselines in industrial recommendation literature.[^25][^8]

---

## References

1. [A Survey on Popularity Bias in Recommender Systems](https://arxiv.org/abs/2308.01118) - Recommender systems help people find relevant content in a personalized way. One main promise of suc...

2. [User-centered Evaluation of Popularity Bias in Recommender Systems](https://dl.acm.org/doi/fullHtml/10.1145/3450613.3456821)

3. [Cold Start, Popularity Bias, and Temporal Drift Failure Modes](https://www.systemoverflow.com/learn/ml-recommendation-systems/collaborative-filtering/cold-start-popularity-bias-and-temporal-drift-failure-modes)

4. [Investigating the impact of recommender systems on user-based and item-based popularity bias](https://www.sciencedirect.com/science/article/abs/pii/S0306457321001436) - Recommender Systems are decision support tools that adopt advanced algorithms in order to help users...

5. [arXiv:1106.0330v1  [physics.soc-ph]  1 Jun 2011](https://arxiv.org/pdf/1106.0330.pdf)

6. [Managing Popularity Bias in Recommender Systems with ...](https://arxiv.org/pdf/1901.07555.pdf)

7. [Analyzing fairness, popularity bias, and user group disparities](https://avesis.cumhuriyet.edu.tr/yayin/21685a19-0d26-4801-8421-9ee5c453bbce/dynamic-feedback-loops-in-recommender-systems-analyzing-fairness-popularity-bias-and-user-group-disparities) - Ensuring equitable treatment of different user groups in recommender systems is a key challenge, and...

8. [Attribute-based Propensity for Unbiased Learning in Recommender Systems: Algorithm and Case Studies](https://dl.acm.org/doi/pdf/10.1145/3394486.3403285)

9. [Inverse Propensity scoring - Medium](https://medium.com/@anandut2001/inverse-propensity-scoring-964bcec0eb73) - Inverse Propensity Scoring (IPS) is a core idea in causal inference, debiasing, and counterfactual l...

10. [Accurate and Diverse Recommendations via Propensity-Weighted ...](https://arxiv.org/html/2512.20896v1)

11. [arXiv:2502.13840v2  [cs.IR]  18 Apr 2025](https://www.arxiv.org/pdf/2502.13840.pdf)

12. [How do you balance exploration and exploitation in ... - Milvus](https://milvus.io/ai-quick-reference/how-do-you-balance-exploration-and-exploitation-in-recommendations) - One practical approach is using multi-armed bandit algorithms. For example, the epsilon-greedy metho...

13. [Large Language Models as Recommender Systems: A Study of Popularity Bias](https://arxiv.org/html/2406.01285v1)

14. [Poster 252](https://um.org/umap2020/posters/poster-252/index.html) - Fairness and Diversity in Social-Based Recommender Systems Dimitris Sacharidis, Carine Pierrette Muk...

15. [[PDF] Enhancing Collaborative Filtering with Friendship Information](https://iris.unito.it/retrieve/e27ce42b-b283-2581-e053-d805fe0acbaa/umap2017-2pages.pdf) - We are interested in analyzing the impact of “group-based” friendship relations, which social scienc...

16. [[PDF] Counteracting Filter Bubbles with Homophily-Aware Link ...](https://par.nsf.gov/servlets/purl/10357298)

17. [Birds of a Feather Get Recommended Together: Algorithmic Homophily in YouTube’s Channel Recommendations in the United States and Germany - Jonas Kaiser, Adrian Rauchfleisch, 2020](https://journals.sagepub.com/doi/10.1177/2056305120969914) - Algorithms and especially recommendation algorithms play an important role online, most notably on Y...

18. [Emotion shapes the diffusion of moralized content in social networks](https://www.pnas.org/doi/10.1073/pnas.1618923114) - We show that the expression of moral emotion is key for the spread of moral and political ideas in o...

19. [[PDF] Community-based Recommendations on Twitter: Avoiding The Filter ...](https://cnam.hal.science/hal-02465790v1/document) - Our results show that filter bubbles concern up to 10% of users and our model based on similarities ...

20. [Effect of collaborative-filtering-based recommendation algorithms on ...](https://link.aps.org/doi/10.1103/PhysRevE.108.054304) - In the present paper we study how a user-user collaborative-filtering algorithm affects the behavior...

21. [Twitter's Recommendation Algorithm](https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm) - Twitter aims to deliver you the best of what’s happening in the world right now. This blog is an int...

22. [Measuring Recency Bias In Sequential Recommendation ...](https://arxiv.org/html/2409.09722v1)

23. [[2201.11016] Recency Dropout for Recurrent ... - ar5iv - arXiv](https://ar5iv.labs.arxiv.org/html/2201.11016) - Recurrent recommender systems have been successful in capturing the temporal dynamics in users’ acti...

24. [How Does the X (Twitter) Algorithm Work in 2026?](https://www.conbersa.ai/learn/what-is-twitter-algorithm) - The X (Twitter) algorithm ranks tweets in the For You feed using engagement signals, relevance scori...

25. [Deep Neural Networks for YouTube Recommendations - Paul Covington, Jay Adams, Emre Sargin](https://dparra.sitios.ing.uc.cl/classes/recsys-2016-2/students/DNNyoutube_FdelRio.pdf)

26. [[PDF] Optimizing the recency-relevance-diversity trade-offs in non ...](https://pure.mpg.de/rest/items/item_3217382_3/component/file_3333262/content)

27. [A Lightweight Approach for Real-Time Recommendation Freshness](https://arxiv.org/html/2512.14734v1)

28. [[PDF] Exponential Decay Function-Based Time-Aware Recommender ...](https://thesai.org/Downloads/Volume13No10/Paper_71-Exponential_Decay_Function_Based_Time_Aware_Recommender_System.pdf) - Thus, in this paper, time-aware recommendation systems are investigated using two common methods (Bi...

29. [[PDF] Temporal Popularity-Based Recommender Systems for e-Commerce](https://www.scitepress.org/Papers/2025/142869/142869.pdf)

30. [[PDF] Response to 'Social media, misinformation and harmful algorithms ...](https://www.fph.org.uk/media/hoejpp0s/social-media-consultation-fph-response.pdf)

31. [Misinformation exploits outrage to spread online](https://www.science.org/doi/10.1126/science.adl2829) - We tested a hypothesis that misinformation exploits outrage to spread online, examining generalizabi...

32. [Misinformation on Social Media: Social Media Algorithms](https://library.queens.edu/misinformation-on-social-media/algorithms) - Internal documents stated, "Misinformation, toxicity, and violent content are inordinately prevalent...

33. [The Algorithm Arms Race: Why TikTok, Meta and YouTube Push the Most Extreme Content](https://www.youtube.com/watch?v=t6QSaKE_G7s) - Every time you open TikTok, Instagram, Facebook, or YouTube, powerful algorithms decide what you see...

34. [Preventing the Algorithmic Amplification of Extremist Content](https://www.globalvoices.org.au/post/algorithmic-auditing-for-social-media-companies-preventing-the-algorithmic-amplification-of-extremi) - Curtin University Fellow, Amelie, explores introducing mandatory independent auditing under the Onli...

35. [Dynamics of Algorithmic Content Amplification on TikTok - arXiv](https://arxiv.org/html/2503.20231v1) - Although TikTok's algorithm preserves some content diversity, we find a strong negative correlation ...

36. [The role of moral outrage in the spread of misinformation](https://tmb.apaopen.org/pub/nwpo88ls/release/1) - Keywords: misinformation, social media, affective sciences, social psychology

37. [a Closed-loop Approach for Misinformation Mitigation over Social ...](https://arxiv.org/html/2511.12393v1)

38. [I read the X (Twitter) algorithm source for 4 days and built a ...](https://dev.to/septim_labs/i-read-the-x-twitter-algorithm-source-for-4-days-and-built-a-claude-code-sub-agent-that-scores-1ipb) - Twitter's recommendation algorithm has been open-source since March 2023. I spent four days reading....

39. [Deep Neural Networks for YouTube Recommendations](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/) - In this paper, we describe the system at a high level and focus on the dramatic performance improvem...

40. [Examining the Role of Moral Foundations in User Engagement with ...](https://arxiv.org/html/2502.12009v1) - Our broad research objective is to understand which emotional and moral elements are related to the ...

41. [What is Position Bias in Recommendation Systems?](https://www.systemoverflow.com/learn/ml-recommendation-systems/position-bias-feedback-loops/what-is-position-bias-in-recommendation-systems) - <div style="padding: 14px 16px; background: f8f8f8; border: 2px solid 000; border-left: 4px solid 93...

42. [Aman's AI Journal • Recommendation Systems](https://aman.ai/recsys/position-bias/) - Aman's AI Journal | Course notes and learning material for Artificial Intelligence and Deep Learning...

43. [Feedback Loops and Position Bias in Ranking Systems](https://www.systemoverflow.com/learn/ml-training-infrastructure/training-serving-skew/feedback-loops-and-position-bias-in-ranking-systems) - <p style="margin-bottom: 6px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-s...

44. [[PDF] Position Bias Estimation for Unbiased Learning to Rank in Personal ...](https://static.googleusercontent.com/media/research.google.com/en/pubs/archive/46485.pdf)

45. [Position Effects in Search Advertising and their Moderators](https://www.gsb.stanford.edu/faculty-research/publications/measuring-position-effects-search-advertising-regression-discontinuity) - We investigate the causal effect of position in search engine advertising listings on outcomes such ...

46. [Edinburgh Research Explorer](https://www.pure.ed.ac.uk/ws/portalfiles/portal/376820432/Nudging_Neural_Click_TANISKIDOU_DOA05082023_AFV_CC_BY.pdf)

47. [Reducing Popularity Influence by Addressing Position Bias - arXiv](https://arxiv.org/html/2412.08780v1)

48. [[Papierüberprüfung] Mitigate Position Bias with Coupled ...](https://www.themoonlight.io/de/review/mitigate-position-bias-with-coupled-ranking-bias-on-ctr-prediction) - The paper titled "Mitigate Position Bias with Coupled Ranking Bias on CTR Prediction" investigates a...

49. [Filter Bubbles in Recommender Systems: Fact or Fallacy](https://arxiv.org/html/2307.01221)

50. [How Can Recommender Systems Contribute to Mitigate Echo ...](https://takuti.me/note/recsys-2021-echo-chambers-and-filter-bubbles/) - As I summarized in "User-Centricity Matters: My Reading List from RecSys 2021", the field of recomme...

51. [Understanding Echo Chambers in Recommender Systems](https://thesai.org/Publications/ViewPaper?Volume=16&Issue=10&Code=IJACSA&SerialNo=71) - Echo chambers refer to the phenomenon in which individuals are consistently exposed to content that ...

52. [Filter Bubbles, Echo Chambers, and Online News ...](https://5harad.com/papers/bubbles.pdf)

53. [Uncovering the Deep Filter Bubble: Narrow Exposure in Short-Video Recommendation](https://arxiv.org/html/2403.04511)

54. [Degenerate Feedback Loops in Recommender Systems](https://ar5iv.labs.arxiv.org/html/1902.10730) - Machine learning is used extensively in recommender systems deployed in products. The decisions made...

55. [Core Bandit Algorithms: Epsilon Greedy, UCB, and Thompson ...](https://www.systemoverflow.com/learn/ml-recommendation-systems/diversity-exploration/core-bandit-algorithms-epsilon-greedy-ucb-and-thompson-sampling) - Three classic algorithms solve the bandit problem with different exploration strategies. Epsilon gre...

56. [Mitigating filter bubbles: Diverse and explainable recommender systems - Umar Tahir Kidwai, Nadeem Akhtar, Mohammad Nadeem, Roobaea Salim Alroobaea, 2024](https://journals.sagepub.com/doi/10.3233/JIFS-219416) - In recent years, the surge in online content has necessitated the development of intelligent recomme...

57. [Degenerate Feedback Loops in Recommender Systems](https://www.emergentmind.com/topics/degenerate-feedback-loops) - Mitigation techniques such as exposure-aware modeling, exploration strategies, and causal adjustment...

58. [KuaiRand | An Unbiased Sequential Recommendation Dataset with ...](https://kuairand.com) - KuaiRand is an unbiased sequential recommendation dataset collected from the recommendation logs of ...

59. [UDC 004.891.3(045) DOI:10.18372/1990-5548.84.20192 ...](https://jrnl.nau.edu.ua/index.php/ESU/article/download/20192/27298)

60. [GitHub - CassandraDurr/recommender_systems: Recommender systems on MovieLens data using explicit ratings, and curated implicit feedback data.](https://github.com/CassandraDurr/recommender_systems/) - Recommender systems on MovieLens data using explicit ratings, and curated implicit feedback data. - ...

61. [Modeling Dynamic Missingness of Implicit Feedback for ... - PMC - NIH](https://pmc.ncbi.nlm.nih.gov/articles/PMC6453574/) - Implicit feedback is widely used in collaborative filtering methods for recommendation. It is well k...

62. [MIND: A Large-scale Dataset for News Recommendation - Microsoft](https://www.microsoft.com/en-us/research/publication/mind-a-large-scale-dataset-for-news-recommendation/) - News recommendation is an important technique for personalized news service. Compared with product a...

63. [Microsoft News Recommendation Dataset - Azure Open Datasets](https://learn.microsoft.com/sv-se/azure/open-datasets/dataset-microsoft-news) - Lär dig hur du använder datauppsättningen Microsoft News Recommendation i Azure Open Datasets.

64. [arXiv:2004.13715v3 [cs.SI] 7 Oct 2020](https://arxiv.org/pdf/2004.13715.pdf)

65. [KuaiRec: A Fully-observed Dataset for Recommender Systems](https://arxiv.org/abs/2202.10842v2) - Recommender systems are usually developed and evaluated on the historical user-item logs. However, m...

66. [KuaiRec | A Fully-observed Dataset for Recommender Systems ...](https://kuairec.com) - KuaiRec is a real-world dataset collected from the recommendation logs of the video-sharing mobile a...

67. [VK-LSVD: A Large-Scale Industrial Dataset for Short-Video Recommendation](https://arxiv.org/pdf/2602.04567v1.pdf)

68. [The Engage Corpus: A Social Media Dataset for Text- ...](https://aclanthology.org/2022.lrec-1.200/) - Daniel Cheng, Kyle Yan, Phillip Keung, Noah A. Smith. Proceedings of the Thirteenth Language Resourc...

69. [What is the cold-start problem in recommender systems? - Milvus](https://milvus.io/ai-quick-reference/what-is-the-coldstart-problem-in-recommender-systems) - The cold-start problem in recommender systems refers to the challenge of providing accurate recommen...

70. [Temporal dynamics in recommendation systems can be modeled by ...](https://milvus.io/ai-quick-reference/how-can-temporal-dynamics-be-modeled-in-recommendation-systems) - Temporal dynamics in recommendation systems can be modeled by explicitly accounting for how user pre...

71. [Submitted 14 August 2024](https://peerj.com/articles/cs-2533.pdf)

72. [International Journal of](https://ijisae.org/index.php/IJISAE/article/download/6212/5007/11333)

73. [Beyond-accuracy: a review on diversity, serendipity, and fairness in ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC10762851/) - This review paper focuses on addressing these dimensions in GNN-based recommender systems, going bey...

