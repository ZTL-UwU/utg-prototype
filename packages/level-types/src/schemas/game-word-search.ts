import { z } from 'zod';

/** Side length of the square word-search grid; words longer than this can't be placed. */
export const WORD_SEARCH_GRID_SIZE = 10;
/** ~30% of a 10×10 grid at an average 5 letters per word. */
export const WORD_SEARCH_MIN_WORDS = 6;
/** ~70% full; beyond this, random placement starts failing. */
export const WORD_SEARCH_MAX_WORDS = 15;

export const gameWordSearchPropsSchema = z
  .object({
    /** Pool of words; each play picks `wordCount` of them at random. */
    wordIds: z.array(z.number().int().positive()),
    /** Words hidden in each grid. */
    wordCount: z.number().int().min(WORD_SEARCH_MIN_WORDS).max(WORD_SEARCH_MAX_WORDS),
  })
  .refine((value) => value.wordIds.length >= value.wordCount, {
    message: 'Select at least as many words as are played',
    path: ['wordIds'],
  });

export type GameWordSearchProps = z.infer<typeof gameWordSearchPropsSchema>;

export function defaultGameWordSearchProps(): GameWordSearchProps {
  return {
    wordIds: [],
    wordCount: 10,
  };
}
