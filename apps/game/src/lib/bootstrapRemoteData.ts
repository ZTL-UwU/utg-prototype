import useCourseStore from '../zustandStores/courseStore';
import useResultStore, { syncResultsWithSession } from '../zustandStores/resultStore';
import useRewardStore from '../zustandStores/rewardStore';
import useSentenceStore from '../zustandStores/sentenceStore';
import { syncUserRewardsWithSession, useUserRewardStore } from '../zustandStores/userRewardStore';
import useWordStore from '../zustandStores/wordStore';

/**
 * Kick off course + word + sentence + reward catalog fetches without blocking navigation.
 * Level results and owned rewards are user-scoped: they load here for an already-persisted
 * session (signed-in from the server, guest from localStorage), and the session syncs
 * pick up any later login or guest start.
 */
export function bootstrapRemoteData(): void {
  void useCourseStore.getState().fetchCourseStructure();
  void useWordStore.getState().fetchWords();
  void useSentenceStore.getState().fetchSentences();
  void useRewardStore.getState().fetchRewards();

  syncResultsWithSession();
  void useResultStore.getState().fetchResults();

  syncUserRewardsWithSession();
  void useUserRewardStore.getState().fetchUserRewards();
}
