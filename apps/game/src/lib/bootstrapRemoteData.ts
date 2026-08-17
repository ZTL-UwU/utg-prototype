import useCourseStore from '../zustandStores/courseStore';
import useResultStore, { syncResultsWithSession } from '../zustandStores/resultStore';
import useRewardStore from '../zustandStores/rewardStore';
import useSentenceStore from '../zustandStores/sentenceStore';
import useWordStore from '../zustandStores/wordStore';

/**
 * Kick off course + word + sentence + reward catalog fetches without blocking navigation.
 * Level results are user-scoped: they fetch here for an already-persisted session, and
 * `syncResultsWithSession` picks up any later login.
 */
export function bootstrapRemoteData(): void {
  void useCourseStore.getState().fetchCourseStructure();
  void useWordStore.getState().fetchWords();
  void useSentenceStore.getState().fetchSentences();
  void useRewardStore.getState().fetchRewards();

  syncResultsWithSession();
  void useResultStore.getState().fetchResults();
}
