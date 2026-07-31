import { Assets } from 'pixi.js';
import { create } from 'zustand';

import { api } from '../lib/api';
import { ensureRemoteReady, type RemoteStatus } from '../lib/remoteResource';

/**
 * Sentinel Pixi bundle name for sentence catalog readiness.
 * Sentences have no media — the bundle is always empty, but listing it in
 * `assetBundles` lets navigation await `ensureSentencesReady()` first.
 */
export const REMOTE_SENTENCES_BUNDLE = 'remote-sentences';

/** Mirrors SentenceSimpleOut from the backend `/sentences/list-simple` endpoint. */
export interface SentenceSimple {
  id: number;
  sentence: string;
}

interface SentenceStore {
  status: RemoteStatus;
  error?: string;
  sentences: SentenceSimple[];
  fetchSentences: () => Promise<void>;
}

/** Resolve backend sentence IDs to SentenceSimple entries (order preserved; missing IDs skipped). */
export function resolveSentencesByIds(sentenceIds: number[]): SentenceSimple[] {
  const byId = new Map(useSentenceStore.getState().sentences.map((s) => [s.id, s]));
  return sentenceIds.flatMap((id) => {
    const sentence = byId.get(id);
    return sentence ? [sentence] : [];
  });
}

function registerSentencesBundle(): void {
  // Always register so navigation can safely `loadBundle('remote-sentences')`.
  Assets.addBundle(REMOTE_SENTENCES_BUNDLE, []);
}

const useSentenceStore = create<SentenceStore>((set, get) => ({
  status: 'idle',
  error: undefined,
  sentences: [],
  fetchSentences: async () => {
    const { status } = get();
    if (status === 'loading' || status === 'ready') return;

    set({ status: 'loading', error: undefined });
    try {
      const sentences = await api<SentenceSimple[]>('/sentences/list-simple');
      registerSentencesBundle();
      set({ status: 'ready', error: undefined, sentences });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sentences';
      registerSentencesBundle();
      set({
        status: 'error',
        error: message,
        sentences: [],
      });
    }
  },
}));

/**
 * Resolves when the sentences list is ready.
 * Returns false if the fetch failed.
 */
export function ensureSentencesReady(): Promise<boolean> {
  return ensureRemoteReady({
    getStatus: () => useSentenceStore.getState().status,
    subscribe: (listener) => useSentenceStore.subscribe((state) => listener(state.status)),
    start: () => {
      void useSentenceStore.getState().fetchSentences();
    },
  });
}

export default useSentenceStore;
