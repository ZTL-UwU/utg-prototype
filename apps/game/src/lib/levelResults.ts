import { useAuthStore } from '../zustandStores/auth';
import useResultStore, { type LevelResult } from '../zustandStores/resultStore';
import {
  ensureRewardsReady,
  resolveRewardsByIds,
  type RewardSimple,
} from '../zustandStores/rewardStore';
import { useUserRewardStore } from '../zustandStores/userRewardStore';
import { api } from './api';

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
 * Marks the level complete immediately so the next one can unlock, then replaces
 * that stub with the POST's full result list when the server answers.
 */
export async function submitLevelResult(result: LevelResultIn): Promise<LevelResultOutcome> {
  useResultStore.getState().markCompleted(result.level);

  // Authenticated: a 401 inside `api` can clear the session without retrying.
  if (!useAuthStore.getState().accessToken) {
    return { status: 'skipped' };
  }

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
