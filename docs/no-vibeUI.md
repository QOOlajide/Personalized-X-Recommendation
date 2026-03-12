# Rule: Familiar, professional UI (no vibe coding)

## When to apply
- For ANY request that involves UI, components, layouts, pages, or flows.
- Especially when creating or refactoring React/Next.js/Tailwind UIs.

## Principles
- Follow Jakob’s Law: prefer familiar patterns users already know from popular apps (e.g., LeetCode, Notion, Linear, Vercel dashboard) over novel layouts.[^jakob]
- Reuse established UI patterns (nav bars, sidebars, tab bars, editor+preview split, forms, modals) instead of inventing new ones.[^patterns]
- Prioritize: clarity > consistency > aesthetics > cleverness.

## Before proposing a UI
ALWAYS:
1. Ask the user:
   - “What are you building, and what existing product does it feel closest to (e.g., LeetCode, Notion, Linear, Vercel, etc.)?”
2. Based on their answer and your own knowledge:
   - Infer 1–2 reference products whose layout is a good match.
   - Make that explicit: “I’ll loosely follow a `<reference>`-style layout.”

If the user doesn’t specify a reference, choose one yourself and say why.

## Layout & patterns
When generating UI code or descriptions:

- Choose ONE primary layout pattern per screen:
  - For coding tools: LeetCode-like — header, problem panel, editor, output/visualizer.
  - For dashboards: Vercel/Linear-like — top nav, left sidebar, main content.
  - For documents: Notion-like — simple top bar, content column, contextual side panel.

- Enforce a clear hierarchy:
  - One primary action (most visually prominent button).
  - 3–4 text styles max (H1, H2, body, code).
  - Align content to a simple grid; no “almost” alignment.

- Use design‑system thinking:
  - Use a consistent Button, Input, Card, Tabs, Modal across the app.
  - Reuse spacing, radii, and colors instead of ad‑hoc Tailwind classes.

## Micro‑interactions & feedback
For any interactive element you introduce, specify:

- Default, hover, active/pressed, and disabled states.
- Loading behavior for async actions (spinner, skeleton, or disabled button).
- Success and error feedback (where it appears, how it looks, copy text).

Prefer small, consistent transitions (150–200ms) over big fancy animations.

## Implementation help for the user
Whenever the user is building a new screen or feature:

1. Summarize the target:
   - “You’re building `<X>` that’s closest to `<reference product>`.”

2. Break the UI into:
   - Layout regions (e.g., header, sidebar, main, footer).
   - Key components (e.g., ProblemPanel, CodeEditorPane, ControlsBar, VisualizerPane).
   - Data/interaction flow (what triggers what).

3. Give a step‑by‑step plan:
   - Step 1: Skeleton layout (with placeholder divs/components).
   - Step 2: Wire up data and core interactions.
   - Step 3: Apply consistent design‑system classes (Tailwind + component lib).
   - Step 4: Add micro‑interactions and loading/error states.
   - Step 5: Quick QA checklist: alignment, states, keyboard/tab behavior.

4. Offer DevTools guidance if requested:
   - How to inspect a reference app’s layout, spacing, and components.
   - What to look for (grid, breakpoints, padding, font sizes) and how to map that to code.

## Tone
- Default to teaching mode: explain why a pattern is chosen, not just what code to use.
- Call out “vibe‑coded” smells (inconsistent spacing, random components, no loading/error states) and propose concrete fixes.

[^jakob]: Users prefer interfaces that follow familiar patterns (Jakob's Law).[jakob]
[^patterns]: Reusing known UI patterns improves UX and reduces cognitive load.[patterns]
