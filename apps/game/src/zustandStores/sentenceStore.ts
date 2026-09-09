import { Assets } from 'pixi.js';
import { create } from 'zustand';

import { api } from '../lib/api';
import { ensureRemoteReady, type RemoteStatus } from '../lib/remoteResource';

/** Pixi Assets bundle name for remote sentence audio. */
export const REMOTE_SENTENCES_BUNDLE = 'remote-sentences';

/** Alias used with `@pixi/sound` / `Assets.load` for a sentence audio clip. */
export function getSentenceAudioAlias(sentenceId: number): string {
  return `remote-sentences-audio/${sentenceId}`;
}

/** Mirrors SentenceSimpleOut from the backend `/sentences/list-simple` endpoint. */
export interface SentenceSimple {
  id: number;
  sentence: string;
  story_id: number | null;
  sort_order: number | null;
  audio_url: string | null;
}

/**
 * Mirrors StorySimpleOut from the backend `/stories/list-simple` endpoint. Its
 * `sentence_ids` is ignored — sentences are resolved locally by story_id.
 */
export interface StorySimple {
  id: number;
  name: string;
}

interface SentenceStore {
  status: RemoteStatus;
  error?: string;
  sentences: SentenceSimple[];
  stories: StorySimple[];
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

/** Resolve sentences belonging to a story, ordered by sort_order then id. */
export function resolveSentencesByStoryId(storyId: number): SentenceSimple[] {
  return useSentenceStore
    .getState()
    .sentences.filter((sentence) => sentence.story_id === storyId)
    .sort((a, b) => {
      const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.id - b.id;
    });
}

/** Resolve a backend story id to its record. */
export function resolveStoryById(storyId: number): StorySimple | undefined {
  return useSentenceStore.getState().stories.find((story) => story.id === storyId);
}

function registerSentencesBundle(sentences: SentenceSimple[]): void {
  const entries: { alias: string; src: string }[] = [];

  for (const sentence of sentences) {
    if (sentence.audio_url) {
      entries.push({
        alias: getSentenceAudioAlias(sentence.id),
        src: sentence.audio_url,
      });
    }
  }

  // Always register so navigation can safely `loadBundle('remote-sentences')`.
  Assets.addBundle(REMOTE_SENTENCES_BUNDLE, entries);

  if (entries.length > 0) {
    void Assets.backgroundLoadBundle(REMOTE_SENTENCES_BUNDLE);
  }
}

const useSentenceStore = create<SentenceStore>((set, get) => ({
  status: 'idle',
  error: undefined,
  sentences: [],
  stories: [],
  fetchSentences: async () => {
    const { status } = get();
    if (status === 'loading' || status === 'ready') return;

    set({ status: 'loading', error: undefined });
    try {
      const [sentences, stories] = await Promise.all([
        api<SentenceSimple[]>('/sentences/list-simple'),
        // Story names only decorate the ski level; never fail the sentence catalog over them.
        api<StorySimple[]>('/stories/list-simple').catch((err: unknown) => {
          console.warn('/stories/list-simple: story names unavailable', err);
          return [] as StorySimple[];
        }),
      ]);
      registerSentencesBundle(sentences);
      set({ status: 'ready', error: undefined, sentences, stories });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sentences';
      registerSentencesBundle([]);
      set({
        status: 'error',
        error: message,
        sentences: [],
        stories: [],
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
