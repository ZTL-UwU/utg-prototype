import { useAuthStore } from '../zustandStores/auth';
import { ensureCourseCatalogReady } from '../zustandStores/courseStore';
import useResultStore, { type LevelResult } from '../zustandStores/resultStore';
import {
  ensureRewardsReady,
  resolveRewardsByIds,
  type RewardSimple,
} from '../zustandStores/rewardStore';
import { ensureUserRewardsReady, useUserRewardStore } from '../zustandStores/userRewardStore';
import { api } from './api';
import { grantRewardsForAttempt } from './guestRewards';

/** Mirrors LevelResultIn from the backend `/level-results` endpoint. */
export interface LevelResultIn {
  level: number;
  star: number;
  score: number;
  correct: number;
  mistake: number;
}

/** Mirrors LevelResultCreateOut from the backend `/level-results` POST. */
interface LevelResultCreateOut {
  // The user's whole history, not just the row just created.
  results: LevelResult[];
  // every reward this user owns, after this level
  reward_ids: number[];
  // only what this level earned
  new_reward_ids: number[];
}

export type LevelResultOutcome =
  | { status: 'submitted'; newRewards: RewardSimple[] }
  | { status: 'skipped' }
  | { status: 'failed'; error: unknown };

/**
 * Record a completed level and take ownership of whatever it earned. Never throws.
 * Guests keep the attempt and granted badges in localStorage instead of posting.
 * A 0-star finish is still stored for stats, but does not mark the level complete
 * or unlock the next one. Starred finishes unlock immediately, then a signed-in
 * POST's full result list replaces that stub when the server answers.
 */
export async function submitLevelResult(result: LevelResultIn): Promise<LevelResultOutcome> {
  const { accessToken, isGuest } = useAuthStore.getState();

  if (isGuest) {
    useResultStore.getState().recordAttempt(result);
    // The grant needs the level's layer, the reward catalog, and current ownership: the
    // rows the backend query joins. Granting before they load would silently skip badges
    // and, worse, re-award ones this guest already has.
    await Promise.all([ensureCourseCatalogReady(), ensureRewardsReady(), ensureUserRewardsReady()]);

    const newRewards = grantRewardsForAttempt(
      result,
      useResultStore.getState().results,
      useUserRewardStore.getState().ownedRewardIds,
    );
    useUserRewardStore.getState().grantLocalRewards(newRewards);
    return { status: 'submitted', newRewards };
  }

  if (!accessToken) {
    useResultStore.getState().recordAttempt(result);
    return { status: 'skipped' };
  }

  useResultStore.getState().markCompleted(result.level, result.star);

  try {
    const submitted = await api<LevelResultCreateOut>('/level-results', {
      method: 'POST',
      body: result,
    });

    // Before the await, so the results land even if the reward catalog is slow.
    useResultStore.getState().setResults(submitted.results);
    useUserRewardStore.getState().syncRewards(submitted.reward_ids, submitted.new_reward_ids);

    await ensureRewardsReady();

    return { status: 'submitted', newRewards: resolveRewardsByIds(submitted.new_reward_ids) };
  } catch (error) {
    console.warn('Failed to submit level result', error);
    return { status: 'failed', error };
  }
}
