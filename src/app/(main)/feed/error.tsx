'use client';

/**
 * Feed error boundary.
 *
 * Next.js App Router automatically wraps each route segment with a React
 * Error Boundary when an error.tsx file is present. This catches unhandled
 * errors from both the Server Component (page.tsx) and any nested client
 * components, preventing the entire app from crashing.
 *
 * Must be a Client Component ('use client') because Error Boundaries
 * rely on React class component lifecycle methods under the hood.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function FeedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <h2 className="text-[17px] font-bold">Something went wrong</h2>
      <p className="mt-2 text-[15px] text-muted-foreground">
        We couldn&apos;t load your feed. This is usually temporary.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-full bg-primary px-5 py-2 text-[14px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
