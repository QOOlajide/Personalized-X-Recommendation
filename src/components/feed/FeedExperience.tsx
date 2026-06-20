'use client';

import { useEffect, useRef } from 'react';
import { PostCard } from '../post/PostCard';
import { TuningPanel } from './TuningPanel';
import {
  useFeedStore,
  BALANCED_WEIGHTS,
  type Weights,
} from '../../stores/use-feed-store';
import {
  previewFeed,
  updateAlgorithmPreference,
  resetAlgorithmPreference,
} from '../../app/actions/preferences';
import type { FeedItem } from '../../services/feed/get-feed';

const PREVIEW_DEBOUNCE_MS = 250;

/**
 * Client orchestrator for the live feed.
 *
 * Seeds the store from server-rendered data, then owns the live-preview
 * loop: whenever the draft weights change, it debounces a `previewFeed`
 * call and swaps in the re-ranked items. Save/Reset persist via Server
 * Actions. The timeline renders straight from the store.
 */
export function FeedExperience({
  initialItems,
  initialWeights,
}: {
  initialItems: FeedItem[];
  initialWeights: Weights;
}) {
  // Seed once, synchronously, so the first paint (and child components)
  // already see the personalized feed — no flash, no refetch.
  const seeded = useRef(false);
  if (!seeded.current) {
    useFeedStore.getState().seed(initialItems, initialWeights);
    seeded.current = true;
  }

  const items = useFeedStore((s) => s.items);
  const weights = useFeedStore((s) => s.weights);
  const setItems = useFeedStore((s) => s.setItems);
  const setLoading = useFeedStore((s) => s.setLoading);

  // Live preview: re-rank whenever the draft weights change. The initial
  // (seeded) weights are skipped — the server already ranked those.
  const skipFirst = useRef(true);
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await previewFeed({ preferences: weights });
      if (cancelled) return;
      if (res.ok) setItems(res.data.items);
      setLoading(false);
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [weights, setItems, setLoading]);

  async function handleSave() {
    setLoading(true);
    const res = await updateAlgorithmPreference(weights);
    if (res.ok) useFeedStore.getState().markSaved();
    setLoading(false);
  }

  async function handleReset() {
    // Updating the draft triggers the live-preview effect (refetch + items),
    // and marks the panel clean against the new defaults.
    useFeedStore.getState().setWeights(BALANCED_WEIGHTS);
    useFeedStore.getState().markSaved();
    await resetAlgorithmPreference();
  }

  return (
    <>
      <TuningPanel onSave={handleSave} onReset={handleReset} />

      {items.length === 0 ? (
        <div className="border-b border-border px-4 py-12 text-center">
          <h2 className="text-[17px] font-bold">Your feed is empty</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">
            The database hasn&apos;t been seeded yet, or there are no posts to
            rank. Run the seed scripts to populate the synthetic network.
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Timeline">
            {items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </section>
          <div className="border-t border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
            You&apos;re all caught up
          </div>
        </>
      )}
    </>
  );
}
