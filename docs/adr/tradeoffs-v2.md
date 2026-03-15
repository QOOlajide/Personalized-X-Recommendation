# Engineering Tradeoffs — Volume 2

> Continuation of [tradeoffs.md](tradeoffs.md) (T1–T12).  
> Same format: Context → Options → Gains → Costs → Revisit trigger.

---

## T13 — Motion Fade-Up + Hover-Lift vs. CSS-Only or No Animation

**Context:** The landing page had 6 static sections. We wanted visual polish without over-animating or bloating the bundle.

**Option A (chosen):** `motion` library (formerly Framer Motion) with `whileInView` fade-up on scroll and `whileHover` lift (y: −4) on cards. All 6 landing components became `"use client"`.

**Option B (rejected):** Pure CSS (`@keyframes` + `IntersectionObserver` via custom hook) or no animation at all.

**What we gained:**
- Declarative API — `initial`, `whileInView`, `whileHover`, `viewport={{ once: true }}` read like specs, not imperative code.
- Hardware-accelerated transforms via Web Animations API. Spring physics and interruptible keyframes come free.
- Staggered card entrances with index-based delay (`delay: i * 0.1`) for a polished, sequential reveal.

**What we gave up:**
- Client JS for 6 components that were previously zero-JS Server Components. Motion is tree-shakable (~15 KB gzipped for what we use), but it's still a bundle cost.
- Duplicated animation tokens (`fadeUp`, `visible`, `transition`) in each component file.

**Revisit trigger:** If Lighthouse flags excessive JS on the landing page, consider extracting animations into a thin client wrapper and keeping section content as Server Components, or replacing with CSS `@starting-style` + `IntersectionObserver` (zero-JS approach).

---

## T14 — Page-Level Auth Redirect vs. Conditional Navbar for Signed-In Users

**Context:** Authenticated users on `/` saw auth buttons that looped (Clerk detected the session and bounced them back). We needed to handle the signed-in-on-landing-page case.

**Option A (chosen):** Server-side `auth()` + `redirect('/feed')` at top of landing page. Navbar always shows "Log in" / "Sign up" — no Clerk conditional rendering.

**Option B (rejected):** Keep landing accessible to all. Use `<Show when="signed-in">` in Navbar to swap buttons ("Go to feed" + `UserButton` for signed-in; "Log in" + "Sign up" for signed-out).

**What we gained:**
- Simpler Navbar — no Clerk imports, no conditional rendering, pure presentational.
- Clear user intent: signed-in users want the feed, not marketing copy. Server-side redirect is instantaneous (no flash of wrong UI).
- No redundancy between Navbar "Go to feed" and Hero "Try the feed" CTAs.

**What we gave up:**
- Authenticated users can never see the landing page (e.g., to share it or re-read features). Minor — they can use incognito or sign out.
- The redirect adds one `auth()` call per landing page visit. Negligible latency (~20ms) but non-zero.

**Revisit trigger:** If we add marketing pages authenticated users should see (e.g., `/pricing`, `/changelog`), move to a layout-level approach rather than per-page redirects.

---

## T15 — ML Ranking Model vs. Heuristic Scoring — REVISED (overrides T1)

**Context:** T1 chose heuristic scoring for transparency and simplicity. After building the full 4-stage pipeline and seeing it work end-to-end, the decision was revisited. The project's ambition grew — a heuristic-only system feels like a tutorial, not a real recommendation engine.

**Original choice (T1):** Hand-tuned weighted heuristics in TypeScript.

**Revised choice:** Train an ML model to replace Stage 2 (scoring). Stages 1, 3, and 4 stay as-is.

**Why we're switching:**
- Non-linear signal capture. Heuristics can't learn feature interactions (e.g., "this user engages with tech tweets only in the morning"). An ML model can.
- Cold-start intelligence. A model can learn from sparse signals across similar users; heuristics need explicit per-user weights.
- Résumé and portfolio impact. An ML-powered system with explainability is a stronger differentiator.
- The heuristic pipeline already serves as training data infrastructure — scored posts with engagement outcomes are exactly what a model needs.

**What we gain:**
- More accurate, personalized ranking that improves with data.
- A real training/evaluation loop — model metrics, A/B comparison against heuristics.
- The explainability UI ("Why this post?") becomes more interesting when it's decomposing a model's decision, not just showing hardcoded weights.

**What we give up:**
- Simplicity. ML adds training infrastructure, model serving, and evaluation — complexity the heuristic approach avoided.
- Pure transparency. A neural net's weights aren't human-readable the way `recencyWeight * 0.8` is. We'll need SHAP values or similar feature-attribution methods to maintain explainability.
- TypeScript-only stack may not hold. Depending on the model choice, Python tooling (PyTorch, scikit-learn) or ONNX runtime may be needed.

**Revisit trigger:** If the ML model doesn't meaningfully outperform heuristics on engagement prediction, or if explainability quality drops below what users expect, the heuristic pipeline remains fully functional as a fallback.
