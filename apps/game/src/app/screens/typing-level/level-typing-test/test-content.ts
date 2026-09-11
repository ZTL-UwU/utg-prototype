import type { TypingTestMode, TypingTestProps } from '@utg/level-types';

import {
  convertKeyboardLettersToCurrentScript,
  convertToCurrentScript,
} from '../../../../utils/script';
import { resolveWordsByIds } from '../../../../zustandStores/wordStore';
import { generateSentenceRounds } from '../sentence-rounds';

/** Characters of prompt text built per page; the next page is built when this one is typed out. */
const PAGE_LENGTH = 150;
const LETTER_CLUSTER_MIN = 4;
const LETTER_CLUSTER_MAX = 5;

/** Endless prompt text for one mode; every call returns the next page. */
export type PromptSource = {
  next: () => string;
};

function shuffle<T>(items: readonly T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function letterPool(props: TypingTestProps): string[] {
  return convertKeyboardLettersToCurrentScript(props.letters);
}

function wordPool(props: TypingTestProps): string[] {
  return resolveWordsByIds(props.wordIds)
    .map((word) => convertToCurrentScript(word.word.trim(), { autoCapitalize: false }))
    .filter((word) => word.length > 0);
}

/** Each story's sentences in story order; stories with none are dropped so none is picked. */
function storyPool(props: TypingTestProps): string[][] {
  return props.storyIds
    .map((storyId) => generateSentenceRounds(storyId).map((round) => round.sentence))
    .filter((sentences) => sentences.length > 0);
}

function hasContent(mode: TypingTestMode, props: TypingTestProps): boolean {
  if (mode === 'letters') return letterPool(props).length > 0;
  if (mode === 'words') return wordPool(props).length > 0;
  return storyPool(props).length > 0;
}

/** Modes the admin gave content for; the settings popup offers only these. */
export function availableModes(props: TypingTestProps): TypingTestMode[] {
  return (['letters', 'words', 'sentences'] as const).filter((mode) => hasContent(mode, props));
}

function randomIndex(count: number): number {
  return Math.floor(Math.random() * count);
}

function randomClusterSize(): number {
  return LETTER_CLUSTER_MIN + randomIndex(LETTER_CLUSTER_MAX - LETTER_CLUSTER_MIN + 1);
}

/** Random letters grouped into short clusters, so the page reads like pseudo-words. */
function nextLetterPage(pool: string[]): string {
  const clusters: string[] = [];
  let length = 0;

  while (length < PAGE_LENGTH) {
    const size = randomClusterSize();
    let cluster = '';
    for (let i = 0; i < size; i += 1) {
      cluster += pool[randomIndex(pool.length)];
    }
    clusters.push(cluster);
    length += cluster.length + 1;
  }

  return clusters.join(' ');
}

function nextShuffledPage(pool: string[]): string {
  const picked: string[] = [];
  let length = 0;

  while (length < PAGE_LENGTH) {
    for (const entry of shuffle(pool)) {
      picked.push(entry);
      length += entry.length + 1;
      if (length >= PAGE_LENGTH) break;
    }
  }

  return picked.join(' ');
}

/** A random story other than `current`, unless it is the only one. */
function nextStoryIndex(current: number, count: number): number {
  if (count === 1) return 0;
  const index = randomIndex(count - 1);
  return index >= current ? index + 1 : index;
}

/**
 * One random story in story order, so the text reads as prose. When it runs out the page
 * ends there and the next page starts another story, so a page never mixes two.
 */
function createStoryPromptSource(stories: string[][]): PromptSource {
  let storyIdx = randomIndex(stories.length);
  let sentenceIdx = 0;

  return {
    next: () => {
      if (sentenceIdx >= stories[storyIdx].length) {
        storyIdx = nextStoryIndex(storyIdx, stories.length);
        sentenceIdx = 0;
      }

      const story = stories[storyIdx];
      const picked: string[] = [];
      let length = 0;
      while (length < PAGE_LENGTH && sentenceIdx < story.length) {
        const sentence = story[sentenceIdx];
        sentenceIdx += 1;
        picked.push(sentence);
        length += sentence.length + 1;
      }
      return picked.join(' ');
    },
  };
}

export function createPromptSource(mode: TypingTestMode, props: TypingTestProps): PromptSource {
  if (mode === 'sentences') {
    const stories = storyPool(props);
    return stories.length > 0 ? createStoryPromptSource(stories) : { next: () => '' };
  }

  const pool = mode === 'letters' ? letterPool(props) : wordPool(props);
  if (pool.length === 0) return { next: () => '' };
  if (mode === 'letters') return { next: () => nextLetterPage(pool) };
  return { next: () => nextShuffledPage(pool) };
}
