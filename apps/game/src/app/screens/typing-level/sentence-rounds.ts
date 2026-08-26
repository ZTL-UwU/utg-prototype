import { convertToCurrentScript } from '../../../utils/script';
import { resolveSentencesByStoryId } from '../../../zustandStores/sentenceStore';

export type SentenceRound = {
  sentenceId: number;
  sentence: string;
  activeLetterIdx: number;
};

/**
 * Every non-empty sentence in the story, in `sort_order` then id.
 * First item is the first sentence so `shift()` plays them in story order.
 */
export function generateSentenceRounds(storyId: number | null = null): SentenceRound[] {
  if (storyId == null) return [];

  return resolveSentencesByStoryId(storyId)
    .map((entry) => ({
      sentenceId: entry.id,
      sentence: convertToCurrentScript(entry.sentence.trim()),
      activeLetterIdx: 0,
    }))
    .filter((round) => round.sentence.length > 0);
}
