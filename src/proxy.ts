import { NextResponse, type NextRequest } from "next/server";

/**
 * Guest identity middleware (Next.js 16 `proxy`).
 *
 * The app is login-free. On a visitor's first request we mint a `guestId`
 * and persist it as an httpOnly cookie so the same visitor keeps a stable
 * identity (and their saved algorithm tuning) across sessions.
 *
 * Middleware is the only place that can both read the incoming request and
 * set a cookie that is also visible to Server Components on this same
 * render — so the brand-new id is forwarded on the request as well.
 */

const GUEST_COOKIE = "guestId";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export default function proxy(request: NextRequest) {
  if (request.cookies.get(GUEST_COOKIE)?.value) {
    return NextResponse.next();
  }

  const guestId = crypto.randomUUID();

  // Make the new id available to this request's Server Components...
  request.cookies.set(GUEST_COOKIE, guestId);
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // ...and persist it on the client for every subsequent request.
  response.cookies.set(GUEST_COOKIE, guestId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files; run for everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
