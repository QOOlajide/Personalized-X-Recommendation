# UI Design System Plan

<!-- Paste the Perplexity response below this line -->
Phase 1 – Clone the X shell (layout + rhythm)
Set up the 3‑column layout

In DevTools on X, inspect the main app container and note:

Layout: confirm it’s display: flex with centered content.
​

Max width: note max-width (e.g. ~1280px).
​

Column widths: measure left, center, right columns (e.g. ~275px / 600px / 350px).
​

In your layout component, copy this as Tailwind:

Shell: className="flex justify-center max-w-[1280px] mx-auto w-full"

Left: className="hidden xl:block w-[275px] flex-shrink-0"

Center: className="flex-1 max-w-[600px] border-x"

Right: className="hidden 2xl:block w-[350px] flex-shrink-0"

Match the timeline column

Inspect the center column:

Note padding-left/right in px (likely 16–20).
​

Note border-left/right color and opacity.
​

Implement:

className="flex-1 max-w-[600px] border-x border-border px-4" (tweak px- to match the number you saw).

Copy tweet card spacing

Inspect a tweet row:

Note padding (vertical/horizontal) and display: flex + avatar gap.
​

Note border-bottom color.

Implement your tweet component container:

className="flex gap-3 px-4 py-3 border-b border-border"

Copy avatar + text sizing

Inspect avatar:

Note width/height (e.g. 40px or 48px).
​

Implement:

Avatar: className="h-10 w-10 rounded-full" (adjust to your measurement).

Inspect name/handle/body:

Note font-size for name and body (likely ~15px) and weight for name.
​

Implement:

Name: className="text-[15px] font-semibold"

Handle/timestamp: className="text-[15px] text-muted-foreground"

Body: className="text-[15px] leading-snug"

Copy engagement row

Inspect the reply/retweet/like row:

Note max-width of the row (e.g. ~425px), justify-content: space-between, and icon wrapper padding.
​

On hover, note the background-color and color for each button.

Implement:

Row wrapper: className="mt-2 flex justify-between max-w-[425px] text-muted-foreground"

Button: className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-primary/10 hover:text-primary transition"

Icon: className="h-4 w-4"

Count: className="text-[13px]"

Sticky header

Inspect the “Home” header:

Confirm position: sticky; top: 0;, note backdrop-filter: blur(...) and semi‑transparent background, plus border-bottom.
​

Implement:

className="sticky top-0 z-30 flex items-center h-[53px] px-4 backdrop-blur bg-background/80 border-b"

Sidebar nav + Post button

Inspect a nav item:

Note gap between icon/text, border-radius, padding, and font size.
​

Implement:

Nav item: className="flex items-center gap-4 px-3 py-2 rounded-full hover:bg-accent"

Label: className="text-[18px] font-medium" and add font-semibold for active.

Inspect “Post” button:

Note height, border-radius, font size.
​

Implement:

className="mt-4 w-full h-[52px] rounded-full bg-primary text-primary-foreground text-[17px] font-bold"

Right sidebar cards

Inspect a trending card:

Note border-radius, padding, background-color.
​

Implement:

Card: className="rounded-2xl bg-muted/40 border border-border px-4 py-3"

Heading: className="text-[20px] font-bold mb-3"

Typography + color tokens

Inspect body:

Copy the font-family stack into Tailwind theme.fontFamily.sans.
​

Inspect:

Background, border, muted text, primary blue hex values.

Convert those hex colors to HSL/OKLCH and put in your Tailwind theme:

--background, --foreground, --border, --muted-foreground, --primary.

Use them via utilities: bg-background, border-border, text-muted-foreground, text-primary.

At this point, your app should look like X.



Phase 2 – Interaction systems from other apps
Algorithm tuning panel (Spotify / Instagram)

Reference Spotify equalizer and Instagram Your Algorithm.

Implement:

Add a “Tune feed” icon/button in the center header (like a funnel).

When clicked on desktop: open a right‑side slide‑in panel (overlay over your right column).

Panel layout:

Heading: “Tune your feed”.

Vertical list of sliders:

For each: label + small description + slider (min, max, default).

Hook sliders to global state (Zustand) that re‑runs your ranking logic on change.

“Why am I seeing this?” (Facebook/Instagram style)

Reference “Why am I seeing this ad?” in Facebook and inline “Recommended because you listened to…” in Spotify.

Implement:

Add a new item in the tweet three‑dot menu: “Why this post?”.

Inline label under the body:

A line like: Suggested · high match with "AI startups" styled as muted small text.

Popover:

Clicking “Why this post?” opens a small popover just above the tweet with your factor breakdown (e.g., 60% follow, 25% topic, 15% recency).

Optional: “Open in tuning panel” link in the popover to open a detailed breakdown in the right‑side panel.

Discourse/feed composition visualization (Apple Screen Time)

Reference Apple Screen Time category bars.

Implement:

Create a simple chart component (e.g., stacked horizontal bar):

X‑axis: 100% of feed.

Segments: topics (tech, politics, etc.), each with a color.

Show two states:

“Current feed” (computed from the last ranking run).

“After adjustments” (what it would look like with current slider state).

Place this chart:

At the top of the tuning panel (“Your feed composition”).

Optional: in a separate “Insights” page reachable from your profile.

Topic interest management (X Topics + Instagram)

Reference Twitter/X Topics and Instagram Your Algorithm topics.

Implement:

Create an “Interests” screen accessible from:

Settings.

A link in the tuning panel (“Manage topics”).

Layout:

Section “Your topics”: list of topics as rows or chips with a Follow toggle.

Section “Suggested topics”: same pattern with “Follow” buttons.

For intensity:

Only for followed topics, show a small control:

Either a 3‑step toggle: “Less / Normal / More”.

Or a compact slider with 3–4 discrete steps.

Wire these topic weights into your ranking function inputs.

Notifications (GitHub / Discord style triage)

Reference GitHub notifications for filters and grouping and Discord’s mentions inbox.

Implement:

In your notifications center (center column when tab is active):

At the top, add filter pills: “All”, “Mentions”, “Replies”, “Follows”, “Likes”.

Each notif row shows:

Leading icon by type (reply arrow, heart, etc.).

Short sentence: “Alice liked your post”.

Add a separate “Mentions” tab:

Only @mentions and replies, similar to Discord/ X “Mentions”.

Keep card spacing identical to tweet rows so it feels native.



Phase 3 – Branding + clarity ✅ FINALIZED

App name: **Shift**
Logo: Balance-pivot icon (a tilted beam with two weights and a blue pivot point)
Style: **Subtle 3D** (soft gradient + shadow depth) — FINALIZED
Component: `src/components/LogoIcon.tsx` — use `style="3d"` everywhere, configurable `size`

Color palette (from Figma):
- Background: `#0A0A0A`
- Foreground/White: `#FFFFFF`
- Accent Blue (primary): `#3B82F6`

Branding integration:

- Place `<LogoIcon size={32} showBackground={false} />` where X's logo would be (top of left nav).
- Use "Shift" as the text name in the left nav beside the icon.
- Use Accent Blue `#3B82F6` as `--primary` in the Tailwind theme.

Surface the "this is tunable" story

Add microcopy in key places:

Header subtitle in tuning panel: "Every slider here directly changes your feed ranking."

In the explainability popover: "These scores come from your tuning settings and topic interests."

In your profile/about page:

One clear sentence: "Shift is an educational clone of X's feed with exposed, user‑tunable ranking."




Phase 4 – Implementation order (to reduce overwhelm)
Do it in this order so you always have a stable base:

Clone X shell: layout, typography tokens, tweet card spacing.

Add basic notifications that look like X.

Add algorithm tuning panel UI with working sliders (even if the ranking changes are naive at first).

Add “Why this post?” explanations (even simple factor percentages).

Add topic interests (toggle + simple weight).

Add composition chart in the tuning panel.

Polish branding (icon + name). ✅ DONE — "Shift" + balance-pivot logo finalized.
