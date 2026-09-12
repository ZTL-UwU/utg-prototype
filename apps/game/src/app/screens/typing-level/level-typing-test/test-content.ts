import type { TypingTestMode, TypingTestProps } from '@utg/level-types';

import { convertKeyboardLettersToCurrentScript } from '../../../../utils/script';
import { makeRow } from '../level-desert/letter-row';
import { generateRoundsDictionary, type Round } from '../level-word';
import { generateSentenceRounds } from '../sentence-rounds';

/** Characters of prompt text built per page; the next page is built when this one is typed out. */
const PAGE_LENGTH = 150;
const LETTER_ROW_SIZE = 6;

/** Endless prompt content for one mode; every call returns the next item. */
export type PromptSource<T> = {
  next: () => T;
};

function letterPool(props: TypingTestProps): string[] {
  return convertKeyboardLettersToCurrentScript(props.letters);
}

/** Every configured word once, in random order. */
function wordRounds(props: TypingTestProps): Round[] {
  return generateRoundsDictionary(props.wordIds, props.wordIds.length).filter(
    (round) => round.word.length > 0,
  );
}

/** Each story's sentences in story order; stories with none are dropped so none is picked. */
function storyPool(props: TypingTestProps): string[][] {
  return props.storyIds
    .map((storyId) => generateSentenceRounds(storyId).map((round) => round.sentence))
    .filter((sentences) => sentences.length > 0);
}

function hasContent(mode: TypingTestMode, props: TypingTestProps): boolean {
  if (mode === 'letters') return letterPool(props).length > 0;
  if (mode === 'words') return wordRounds(props).length > 0;
  return storyPool(props).length > 0;
}

/** Modes the admin gave content for; the settings popup offers only these. */
export function availableModes(props: TypingTestProps): TypingTestMode[] {
  return (['letters', 'words', 'sentences'] as const).filter((mode) => hasContent(mode, props));
}

function randomIndex(count: number): number {
  return Math.floor(Math.random() * count);
}

/** Rows of random letters, one tile each. */
export function createLetterSource(props: TypingTestProps): PromptSource<string[]> {
  const pool = letterPool(props);
  return { next: () => (pool.length > 0 ? makeRow(pool, LETTER_ROW_SIZE) : []) };
}

/** Every word once in random order, then a fresh shuffle. */
export function createWordSource(props: TypingTestProps): PromptSource<Round | undefined> {
  let rounds: Round[] = [];
  return {
    next: () => {
      if (rounds.length === 0) rounds = wordRounds(props);
      return rounds.pop();
    },
  };
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
function createStoryPromptSource(stories: string[][]): PromptSource<string> {
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

export function createSentenceSource(props: TypingTestProps): PromptSource<string> {
  const stories = storyPool(props);
  return stories.length > 0 ? createStoryPromptSource(stories) : { next: () => '' };
}
