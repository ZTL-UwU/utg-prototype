import { create } from 'zustand';

import { api } from '../lib/api';
import { ensureRemoteReady, type RemoteStatus } from '../lib/remoteResource';
import { useAuthStore } from './auth';
import { getAccuracyPercent } from './scoreManager';

/** Mirrors LevelResultOut from the backend `/level-results/list` endpoint. */
export interface LevelResult {
  id: number;
  level_id: number;
  star: number;
  score: number;
  correct: number;
  mistake: number;
}

interface ResultStore {
  status: RemoteStatus;
  error?: string;
  results: LevelResult[];
  fetchResults: () => Promise<void>;
  /**
   * Apply a server snapshot (GET `/list` or POST `/level-results`). Server rows win;
   * local-only optimistic completions are kept until a later snapshot includes them.
   */
  setResults: (results: LevelResult[]) => void;
  /** Optimistic completion so the next level can unlock before the POST returns. */
  markCompleted: (levelId: number) => void;
  hasCompletedLevel: (levelId: number) => boolean;
  /** Put a failed fetch back to `idle` so the next `ensureResultsReady` retries it. */
  clearError: () => void;
  /** Drop the previous session's results and allow a refetch. */
  clearResults: () => void;
}

/** Server snapshot plus any optimistic rows the snapshot does not yet contain. */
function applyServerResults(server: LevelResult[], local: LevelResult[]): LevelResult[] {
  const serverLevelIds = new Set(server.map((result) => result.level_id));
  const optimisticOnly = local.filter((result) => !serverLevelIds.has(result.level_id));
  return optimisticOnly.length === 0 ? server : [...server, ...optimisticOnly];
}

const useResultStore = create<ResultStore>((set, get) => ({
  status: 'idle',
  error: undefined,
  results: [],
  fetchResults: async () => {
    const { status } = get();
    if (status === 'loading' || status === 'ready') return;

    // Signed out is a known-empty history, not a failure: `error` is reserved for
    // "could not find out", which is what the progression locks fall open on.
    // `syncResultsWithSession` refetches once a session exists.
    if (!useAuthStore.getState().accessToken) {
      set({ status: 'ready', error: undefined, results: [] });
      return;
    }

    set({ status: 'loading', error: undefined });
    try {
      const results = await api<LevelResult[]>('/level-results/list');
      // A level-result POST may have landed mid-flight with fresher data; it wins.
      if (get().status !== 'loading') return;
      set({
        status: 'ready',
        error: undefined,
        results: applyServerResults(results, get().results),
      });
    } catch (err) {
      if (get().status !== 'loading') return;
      const message = err instanceof Error ? err.message : 'Failed to load level results';
      console.warn('Failed to load level results', err);
      set({ status: 'error', error: message });
    }
  },

  setResults: (results) =>
    set({
      status: 'ready',
      error: undefined,
      results: applyServerResults(results, get().results),
    }),

  markCompleted: (levelId) => {
    if (get().results.some((result) => result.level_id === levelId)) return;
    set((state) => ({
      results: [
        ...state.results,
        { id: -levelId, level_id: levelId, star: 0, score: 0, correct: 0, mistake: 0 },
      ],
    }));
  },

  hasCompletedLevel: (levelId) => get().results.some((result) => result.level_id === levelId),

  clearError: () => {
    if (get().status !== 'error') return;
    set({ status: 'idle', error: undefined });
  },

  clearResults: () => set({ status: 'idle', error: undefined, results: [] }),
}));

export interface ResultTotals {
  totalStars: number;
  correct: number;
  mistake: number;
  accuracy: number;
}

/**
 * Lifetime totals for the stats surfaces. Stars take the best attempt per level, so a
 * replay can only improve them; correct/mistake count every attempt.
 */
export function selectResultTotals(results: LevelResult[]): ResultTotals {
  const bestStars = new Map<number, number>();
  let correct = 0;
  let mistake = 0;

  for (const result of results) {
    bestStars.set(result.level_id, Math.max(bestStars.get(result.level_id) ?? 0, result.star));
    correct += result.correct;
    mistake += result.mistake;
  }

  let totalStars = 0;
  for (const star of bestStars.values()) totalStars += star;

  return { totalStars, correct, mistake, accuracy: getAccuracyPercent(correct, mistake) };
}

/**
 * Resolves when level results are loaded, false when the fetch failed. A previous
 * failure is retried rather than cached, so one bad request cannot strand a player
 * on empty progression for the rest of the session. Callers may ignore the result:
 * `lib/progression` reads the store's status directly and falls open on a failure, so
 * unknown progression never presents as locked content.
 */
export function ensureResultsReady(): Promise<boolean> {
  useResultStore.getState().clearError();
  return ensureRemoteReady({
    getStatus: () => useResultStore.getState().status,
    subscribe: (listener) => useResultStore.subscribe((state) => listener(state.status)),
    start: () => {
      void useResultStore.getState().fetchResults();
    },
  });
}

/**
 * Fetch as soon as a session exists and drop results when it ends. Only signed-in
 * transitions matter, so a token refresh (one access token swapped for another)
 * does not trigger a refetch. Returns an unsubscribe.
 */
export function syncResultsWithSession(): () => void {
  return useAuthStore.subscribe((state, previous) => {
    const signedIn = state.accessToken !== null;
    if (signedIn === (previous.accessToken !== null)) return;

    const { clearResults, fetchResults } = useResultStore.getState();
    clearResults();
    if (signedIn) void fetchResults();
  });
}

export default useResultStore;
