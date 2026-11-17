import { randomShuffle } from '../../../engine/utils/random';
import { convertToCurrentScript } from '../../../utils/script';
import {
  getWordStandardAudioAlias,
  playWordAudio,
  resolveWordsByIds,
  type WordSimple,
} from '../../../zustandStores/wordStore';

/** One word to type, and how far into it the player is. */
export type WordRound = {
  wordId: number;
  word: string;
  activeLetterIdx: number;
  hasImage: boolean;
  hasStandardAudio: boolean;
};

/**
 * Plays the word-only recording as a round starts, so the player hears the word then types
 * it. Fire-and-forget: playback must never gate input, and words without a standard
 * recording are simply silent.
 */
export function playRoundAudio(round: WordRound): void {
  if (!round.hasStandardAudio) return;
  void playWordAudio(getWordStandardAudioAlias(round.wordId));
}

/**
 * Picks `roundCount` random words from the pool, covering as many distinct target letters as
 * possible: one random word per letter first, then the remaining words fill any extra rounds.
 */
export function generateWordRounds(wordIds: number[] = [], roundCount = 5): WordRound[] {
  const perLetter: WordSimple[] = [];
  const rest: WordSimple[] = [];
  const coveredLetters = new Set<string>();
  for (const word of randomShuffle(resolveWordsByIds(wordIds))) {
    const letter = word.target_letter;
    if (letter && !coveredLetters.has(letter)) {
      coveredLetters.add(letter);
      perLetter.push(word);
    } else {
      rest.push(word);
    }
  }

  const picked = [...perLetter, ...rest].slice(0, roundCount);
  return randomShuffle(picked).map((word) => ({
    wordId: word.id,
    word: convertToCurrentScript(word.word.trim(), { autoCapitalize: false }),
    activeLetterIdx: 0,
    hasImage: !!word.image_url,
    hasStandardAudio: !!word.standard_audio_url,
  }));
}
