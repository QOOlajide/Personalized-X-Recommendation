'use client';

import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import {
  useFeedStore,
  weightsDiffer,
  type Weights,
} from '../../stores/use-feed-store';

type SliderDef = {
  key: keyof Weights;
  label: string;
  low: string;
  high: string;
};

const SLIDERS: SliderDef[] = [
  { key: 'recencyWeight', label: 'Recency', low: 'Timeless', high: 'Fresh' },
  { key: 'popularityWeight', label: 'Popularity', low: 'Niche', high: 'Viral' },
  { key: 'networkWeight', label: 'Network', low: 'Discover', high: 'People you follow' },
  { key: 'diversityWeight', label: 'Diversity', low: 'Focused', high: 'Varied' },
];

/**
 * Algorithm tuning panel — the core "the algorithm is the product" control.
 *
 * Four sliders map directly to the ranking pipeline's preference weights.
 * Dragging a slider re-ranks the feed live (handled by the parent via the
 * store); Save persists, Reset restores the balanced 0.5 defaults.
 */
export function TuningPanel({
  onSave,
  onReset,
}: {
  onSave: () => void;
  onReset: () => void;
}) {
  const weights = useFeedStore((s) => s.weights);
  const savedWeights = useFeedStore((s) => s.savedWeights);
  const loading = useFeedStore((s) => s.loading);
  const setWeight = useFeedStore((s) => s.setWeight);

  const dirty = weightsDiffer(weights, savedWeights);

  return (
    <section
      aria-label="Algorithm tuning"
      className="border-b border-border px-4 py-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-bold">Tune your algorithm</h2>
          {loading && (
            <span className="text-[12px] text-muted-foreground">re-ranking…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || loading}
            className="rounded-full bg-primary px-3.5 py-1 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {SLIDERS.map(({ key, label, low, high }) => (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold">{label}</span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(weights[key] * 100)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={weights[key]}
              onChange={(e) => setWeight(key, Number(e.target.value))}
              aria-label={`${label} weight`}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{low}</span>
              <span>{high}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
