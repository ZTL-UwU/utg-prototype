import { Assets } from 'pixi.js';
import { create } from 'zustand';

import { api } from '../lib/api';
import { ensureRemoteReady, type RemoteStatus } from '../lib/remoteResource';

/** Pixi Assets bundle name for remote word images. */
export const REMOTE_WORDS_BUNDLE = 'remote-words';

/** Alias used with `Texture.from` / `Assets.load` for a word image. */
export function getWordImageAlias(wordId: number): string {
  return `remote-words/${wordId}`;
}

/** Mirrors WordSimpleOut from the backend `/words/list-simple` endpoint. */
export interface WordSimple {
  id: number;
  word: string;
  target_letter: string | null;
  is_tutorial_word: boolean;
  image_url: string | null;
  audio_url: string | null;
}

interface WordStore {
  status: RemoteStatus;
  error?: string;
  words: WordSimple[];
  fetchWords: () => Promise<void>;
}

/** Tutorial word for a letter, if one was fetched from the backend. */
export function getTutorialWordForLetter(letter: string): WordSimple | undefined {
  return useWordStore
    .getState()
    .words.find((word) => word.is_tutorial_word && word.target_letter === letter);
}

function registerWordsBundle(words: WordSimple[]): void {
  const entries = words
    .filter((word): word is WordSimple & { image_url: string } => Boolean(word.image_url))
    .map((word) => ({
      alias: getWordImageAlias(word.id),
      src: word.image_url,
    }));

  // Always register so navigation can safely `loadBundle('remote-words')`.
  Assets.addBundle(REMOTE_WORDS_BUNDLE, entries);

  if (entries.length > 0) {
    void Assets.backgroundLoadBundle(REMOTE_WORDS_BUNDLE);
  }
}

const useWordStore = create<WordStore>((set, get) => ({
  status: 'idle',
  error: undefined,
  words: [],
  fetchWords: async () => {
    const { status } = get();
    if (status === 'loading' || status === 'ready') return;

    set({ status: 'loading', error: undefined });
    try {
      const words = await api<WordSimple[]>('/words/list-simple');
      registerWordsBundle(words);
      set({ status: 'ready', error: undefined, words });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load words';
      registerWordsBundle([]);
      set({
        status: 'error',
        error: message,
        words: [],
      });
    }
  },
}));

/**
 * Resolves when the words list is ready.
 * Returns false if the fetch failed.
 */
export function ensureWordsReady(): Promise<boolean> {
  return ensureRemoteReady({
    getStatus: () => useWordStore.getState().status,
    subscribe: (listener) => useWordStore.subscribe((state) => listener(state.status)),
    start: () => {
      void useWordStore.getState().fetchWords();
    },
  });
}

export default useWordStore;
