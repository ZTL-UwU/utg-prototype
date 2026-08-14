import { useAuthStore } from '../zustandStores/auth';
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

/** The fields of LevelResultCreateOut this module acts on. */
interface LevelResultOut {
  id: number;
  /** Every reward the user owns after this result. */
  reward_ids: number[];
  /** Only what this result just earned. */
  new_reward_ids: number[];
}

export type LevelResultOutcome =
  | { status: 'submitted'; newRewards: RewardSimple[] }
  | { status: 'skipped' }
  | { status: 'failed'; error: unknown };

/**
 * Record a completed level and take ownership of whatever it earned.
 */
export async function submitLevelResult(result: LevelResultIn): Promise<LevelResultOutcome> {
  // `/level-results` is authenticated, and a 401 inside `api` can clear the session
  // without retrying, so check up front rather than through the error path.
  if (!useAuthStore.getState().accessToken) {
    return { status: 'skipped' };
  }

  try {
    const submitted = await api<LevelResultOut>('/level-results', {
      method: 'POST',
      body: result,
    });

    useUserRewardStore.getState().syncRewards(submitted.reward_ids, submitted.new_reward_ids);

    await ensureRewardsReady();

    return { status: 'submitted', newRewards: resolveRewardsByIds(submitted.new_reward_ids) };
  } catch (error) {
    console.warn('Failed to submit level result', error);
    return { status: 'failed', error };
  }
}
