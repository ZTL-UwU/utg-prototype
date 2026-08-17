import { create } from 'zustand';

import { api } from '../lib/api';
import { ensureRemoteReady, type RemoteStatus } from '../lib/remoteResource';
import { useAuthStore } from './auth';

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
   * Replace the list from a backend response. The level-result POST returns the
   * user's whole history, so this is a wholesale swap, not a merge.
   */
  setResults: (results: LevelResult[]) => void;
  /** Drop the previous session's results and allow a refetch. */
  clearResults: () => void;
}

const useResultStore = create<ResultStore>((set, get) => ({
  status: 'idle',
  error: undefined,
  results: [],
  fetchResults: async () => {
    const { status } = get();
    if (status === 'loading' || status === 'ready') return;

    // User-scoped. error status to keep ensureResultsReady trying
    // `syncResultsWithSession` resets it to idle on success
    if (!useAuthStore.getState().accessToken) {
      set({ status: 'error', error: 'Not signed in', results: [] });
      return;
    }

    set({ status: 'loading', error: undefined });
    try {
      const results = await api<LevelResult[]>('/level-results/list');
      // A level-result POST may have landed mid-flight with fresher data; it wins.
      if (get().status !== 'loading') return;
      set({ status: 'ready', error: undefined, results });
    } catch (err) {
      if (get().status !== 'loading') return;
      const message = err instanceof Error ? err.message : 'Failed to load level results';
      set({ status: 'error', error: message, results: [] });
    }
  },

  // Ready even if the bootstrap fetch failed: a successful POST is authoritative.
  setResults: (results) => set({ status: 'ready', error: undefined, results }),

  clearResults: () => set({ status: 'idle', error: undefined, results: [] }),
}));

/** Resolves when level results are loaded; false if the fetch failed or logged out. */
export function ensureResultsReady(): Promise<boolean> {
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
