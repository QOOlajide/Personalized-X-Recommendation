/**
 * Feed loading skeleton.
 *
 * Next.js automatically wraps the page in a React Suspense boundary
 * when a loading.tsx file is present. This shows immediately while
 * the Server Component (page.tsx) awaits the ranking pipeline and
 * database queries.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */
export default function FeedLoading() {
  return (
    <>
      {/* Header skeleton */}
      <header className="sticky top-0 z-30 flex h-[53px] items-center border-b border-border bg-background/80 px-4 backdrop-blur">
        <div className="flex flex-col gap-1">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        </div>
      </header>

      {/* Post skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 border-b border-border px-4 py-3"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-2 flex gap-8">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 w-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
