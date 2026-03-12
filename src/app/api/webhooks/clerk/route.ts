/**
 * Clerk Webhook Handler — syncs Clerk users to Prisma.
 *
 * When a user signs up or updates their profile in Clerk, this webhook
 * creates or updates a matching User row in our database so the ranking
 * pipeline, follow graph, and all app logic can reference them.
 *
 * Webhook events:
 *   - user.created  → insert new User row
 *   - user.updated  → update existing User row
 *   - user.deleted  → delete User row (cascades to posts, likes, etc.)
 *
 * @see https://clerk.com/docs/webhooks/sync-data
 */

import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error(
      "CLERK_WEBHOOK_SECRET is not set. " +
        "Add it to .env from the Clerk Dashboard → Webhooks."
    );
  }

  // Verify the webhook signature using Svix
  const wh = new Webhook(SIGNING_SECRET);
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    console.error("Webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const { id, email_addresses, first_name, last_name, image_url, username } =
        event.data;

      const email = email_addresses?.[0]?.email_address;
      if (!email) {
        return new Response("No email in payload", { status: 400 });
      }

      const name = [first_name, last_name].filter(Boolean).join(" ") || "User";
      const handle = username || `user_${id.slice(-8)}`;

      await db.user.upsert({
        where: { id },
        create: {
          id,
          email,
          name,
          handle,
          image: image_url ?? null,
          emailVerified: true, // Clerk handles verification
          isPersona: false,
        },
        update: {
          email,
          name,
          handle,
          image: image_url ?? null,
        },
      });

      break;
    }

    case "user.deleted": {
      const { id } = event.data;
      if (id) {
        await db.user.delete({ where: { id } }).catch(() => {
          // User might not exist in our DB yet — that's fine
        });
      }
      break;
    }

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  return new Response("OK", { status: 200 });
}
