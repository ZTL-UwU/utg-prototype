import { sound } from '@pixi/sound';
import { Assets } from 'pixi.js';
import { create } from 'zustand';

import { engine } from '../engine/getEngine';
import { api } from '../lib/api';
import { ensureRemoteReady, type RemoteStatus } from '../lib/remoteResource';

/** Pixi Assets bundle name for remote word images + audio. */
export const REMOTE_WORDS_BUNDLE = 'remote-words';

/** Alias used with `Texture.from` / `Assets.load` for a word image. */
export function getWordImageAlias(wordId: number): string {
  return `remote-words/${wordId}`;
}

/** Alias for the clip saying the target letter and then the word (education levels). */
export function getWordEducationAudioAlias(wordId: number): string {
  return `remote-words-education-audio/${wordId}`;
}

/** Alias for the clip saying only the word (typing and game levels). */
export function getWordStandardAudioAlias(wordId: number): string {
  return `remote-words-standard-audio/${wordId}`;
}

/**
 * Play a word clip, resolving when it finishes.
 *
 * Resolves immediately when the word has no such recording: words without audio never get
 * a bundle entry, so `sound.exists` is the reliable guard. `Assets.resolver.hasKey` is not —
 * it is true the moment the bundle is registered, whether or not the file ever loaded, and
 * `sfx.play` throws synchronously on an unloaded alias.
 */
export async function playWordAudio(alias: string): Promise<void> {
  if (!sound.exists(alias)) return;
  const instance = await engine().audio.sfx.play(alias);
  await new Promise<void>((resolve) => {
    instance.once('end', resolve);
    instance.once('stop', resolve);
  });
}

/** Mirrors WordSimpleOut from the backend `/words/list-simple` endpoint. */
export interface WordSimple {
  id: number;
  word: string;
  target_letter: string | null;
  is_tutorial_word: boolean;
  image_url: string | null;
  /** Letter + word, spoken. Used by education levels. */
  education_audio_url: string | null;
  /** Word only, spoken. Used by typing and game levels. */
  standard_audio_url: string | null;
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

/** Resolve backend word IDs to WordSimple entries (order preserved; missing IDs skipped). */
export function resolveWordsByIds(wordIds: number[]): WordSimple[] {
  const byId = new Map(useWordStore.getState().words.map((word) => [word.id, word]));
  return wordIds.flatMap((id) => {
    const word = byId.get(id);
    return word ? [word] : [];
  });
}

function registerWordsBundle(words: WordSimple[]): void {
  const entries: { alias: string; src: string }[] = [];

  for (const word of words) {
    if (word.image_url) {
      entries.push({
        alias: getWordImageAlias(word.id),
        src: word.image_url,
      });
    }
    if (word.education_audio_url) {
      entries.push({
        alias: getWordEducationAudioAlias(word.id),
        src: word.education_audio_url,
      });
    }
    if (word.standard_audio_url) {
      entries.push({
        alias: getWordStandardAudioAlias(word.id),
        src: word.standard_audio_url,
      });
    }
  }

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
