/**
 * Viewer resolution — anonymous, login-free identity.
 *
 * The app has no sign-up: every visitor is a guest, identified by a
 * `guestId` cookie minted in `proxy.ts`. This gives each visitor their own
 * stable identity (and therefore their own persisted algorithm tuning)
 * without any account creation.
 *
 * Resolution order:
 *   1. `guestId` cookie            → that guest (the normal case)
 *   2. DEMO_USER_ID env override   → demo viewer (e.g. before the cookie exists)
 *   3. First persona in the DB     → demo viewer (unseeded-cookie fallback)
 *   4. Nothing (empty DB)          → null
 *
 * Browsing the feed needs no User row — the ranking pipeline simply finds
 * no follows/preferences and falls back to defaults. A row is created
 * lazily (see `ensureGuestUser`) only when a guest *saves* a preference,
 * which is the first time a foreign key to `User` is required.
 */

import { cookies } from "next/headers";
import { db } from "../db";

export const GUEST_COOKIE = "guestId";

export interface Viewer {
  id: string;
  isGuest: boolean;
}

// The demo persona id is stable for the life of a server instance; cache it
// to avoid a lookup on the rare cookie-less request.
let cachedDemoId: string | null = null;

async function resolveDemoViewerId(): Promise<string | null> {
  if (process.env.DEMO_USER_ID) return process.env.DEMO_USER_ID;
  if (cachedDemoId) return cachedDemoId;

  const persona = await db.user.findFirst({
    where: { isPersona: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  cachedDemoId = persona?.id ?? null;
  return cachedDemoId;
}

/**
 * Resolve the current viewer. Returns null only when there is no cookie
 * and no users exist at all (e.g., an unseeded environment).
 */
export async function getViewer(): Promise<Viewer | null> {
  const store = await cookies();
  const guestId = store.get(GUEST_COOKIE)?.value;
  if (guestId) return { id: guestId, isGuest: true };

  const demoId = await resolveDemoViewerId();
  if (!demoId) return null;
  return { id: demoId, isGuest: true };
}

/**
 * Ensure a `User` row exists for a guest before writing anything that
 * references it by foreign key (preferences, posts, etc.). Idempotent.
 */
export async function ensureGuestUser(id: string): Promise<void> {
  const short = id.replace(/-/g, "").slice(0, 12);
  await db.user.upsert({
    where: { id },
    create: {
      id,
      name: "Guest",
      handle: `guest_${short}`,
      email: `${id}@guest.local`,
      emailVerified: false,
      isPersona: false,
    },
    update: {},
  });
}
