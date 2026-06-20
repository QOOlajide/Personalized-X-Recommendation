/**
 * Feed store — client state for the live, re-rankable timeline.
 *
 * Holds the currently displayed feed items plus two copies of the algorithm
 * weights: `weights` (the live draft the sliders mutate) and `savedWeights`
 * (what's persisted server-side). The gap between them drives the "unsaved
 * changes" indicator and the Save button's enabled state.
 *
 * Seeded once per mount from server-rendered data via `seed`, so the first
 * paint already shows the personalized feed with no flash or refetch.
 */

import { create } from "zustand";
import type { FeedItem } from "../services/feed/get-feed";

export interface Weights {
  recencyWeight: number;
  popularityWeight: number;
  networkWeight: number;
  diversityWeight: number;
}

export interface FeedState {
  items: FeedItem[];
  weights: Weights;
  savedWeights: Weights;
  /** True while a live preview / save request is in flight. */
  loading: boolean;
  /** True once seeded from server data. */
  initialized: boolean;

  seed: (items: FeedItem[], weights: Weights) => void;
  setItems: (items: FeedItem[]) => void;
  setWeight: (key: keyof Weights, value: number) => void;
  setWeights: (weights: Weights) => void;
  markSaved: () => void;
  setLoading: (loading: boolean) => void;
}

export const BALANCED_WEIGHTS: Weights = {
  recencyWeight: 0.5,
  popularityWeight: 0.5,
  networkWeight: 0.5,
  diversityWeight: 0.5,
};

const BALANCED = BALANCED_WEIGHTS;

export const useFeedStore = create<FeedState>((set) => ({
  items: [],
  weights: { ...BALANCED },
  savedWeights: { ...BALANCED },
  loading: false,
  initialized: false,

  seed: (items, weights) =>
    set({
      items,
      weights: { ...weights },
      savedWeights: { ...weights },
      loading: false,
      initialized: true,
    }),

  setItems: (items) => set({ items }),

  setWeight: (key, value) =>
    set((state) => ({ weights: { ...state.weights, [key]: value } })),

  setWeights: (weights) => set({ weights: { ...weights } }),

  markSaved: () => set((state) => ({ savedWeights: { ...state.weights } })),

  setLoading: (loading) => set({ loading }),
}));

/** True when the live draft differs from what's persisted. */
export function weightsDiffer(a: Weights, b: Weights): boolean {
  return (
    a.recencyWeight !== b.recencyWeight ||
    a.popularityWeight !== b.popularityWeight ||
    a.networkWeight !== b.networkWeight ||
    a.diversityWeight !== b.diversityWeight
  );
}
