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

function sentencePool(props: TypingTestProps): string[] {
  return generateSentenceRounds(props.storyId).map((round) => round.sentence);
}

export function poolForMode(mode: TypingTestMode, props: TypingTestProps): string[] {
  if (mode === 'letters') return letterPool(props);
  if (mode === 'words') return wordPool(props);
  return sentencePool(props);
}

/** Modes the admin gave content for; the settings popup offers only these. */
export function availableModes(props: TypingTestProps): TypingTestMode[] {
  return (['letters', 'words', 'sentences'] as const).filter(
    (mode) => poolForMode(mode, props).length > 0,
  );
}

function randomClusterSize(): number {
  const span = LETTER_CLUSTER_MAX - LETTER_CLUSTER_MIN + 1;
  return LETTER_CLUSTER_MIN + Math.floor(Math.random() * span);
}

/** Random letters grouped into short clusters, so the page reads like pseudo-words. */
function nextLetterPage(pool: string[]): string {
  const clusters: string[] = [];
  let length = 0;

  while (length < PAGE_LENGTH) {
    const size = randomClusterSize();
    let cluster = '';
    for (let i = 0; i < size; i += 1) {
      cluster += pool[Math.floor(Math.random() * pool.length)];
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

export function createPromptSource(mode: TypingTestMode, props: TypingTestProps): PromptSource {
  const pool = poolForMode(mode, props);
  if (pool.length === 0) return { next: () => '' };

  if (mode === 'letters') return { next: () => nextLetterPage(pool) };
  if (mode === 'words') return { next: () => nextShuffledPage(pool) };

  // Sentences stay in story order and wrap around, so the text still reads as prose.
  let index = 0;
  return {
    next: () => {
      const picked: string[] = [];
      let length = 0;
      while (length < PAGE_LENGTH) {
        const sentence = pool[index % pool.length];
        index += 1;
        picked.push(sentence);
        length += sentence.length + 1;
      }
      return picked.join(' ');
    },
  };
}
