import { getViewer } from '../../../lib/auth/viewer';
import { getFeedForUser } from '../../../services/feed/get-feed';
import { getAlgorithmPreference } from '../../../services/preferences/get-preferences';
import { DEFAULT_PREFERENCES } from '../../../services/ranking/types';
import { FeedExperience } from '../../../components/feed/FeedExperience';

/**
 * Feed page — Server Component.
 *
 * Fetches a personalized feed and the viewer's saved algorithm weights (an
 * anonymous guest identified by cookie — no login required), then hands off
 * to the client `FeedExperience`, which renders the live, slider-tunable
 * timeline. Errors propagate to error.tsx; loading is handled by loading.tsx.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/server-components
 */
export default async function FeedPage() {
  const viewer = await getViewer();

  const [{ items }, weights] = viewer
    ? await Promise.all([
        getFeedForUser(viewer.id),
        getAlgorithmPreference(viewer.id),
      ])
    : [{ items: [] }, DEFAULT_PREFERENCES];

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-0 z-30 flex h-[53px] items-center border-b border-border bg-background/80 px-4 backdrop-blur">
        <div className="flex flex-col">
          <h1 className="text-[17px] font-bold leading-tight">Home</h1>
          <span className="text-[13px] text-muted-foreground">
            For you · Personalized
          </span>
        </div>
      </header>

      {/* Composer placeholder */}
      <section className="border-b border-border px-4 py-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            G
          </div>
          <div className="flex-1">
            <div className="text-[15px] text-muted-foreground">
              What&apos;s happening?
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-[13px] text-muted-foreground">
                Composer coming soon
              </div>
              <button
                type="button"
                className="rounded-full bg-primary px-4 py-1.5 text-[14px] font-bold text-primary-foreground disabled:opacity-50"
                disabled
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </section>

      <FeedExperience initialItems={items} initialWeights={weights} />
    </>
  );
}
