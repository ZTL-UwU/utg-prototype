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

interface LevelResultOut {
  id: number;
  level_id: number;
  star: number;
  score: number;
  correct: number;
  mistake: number;
}

/** Mirrors LevelResultCreateOut from the backend `/level-results` POST. */
interface LevelResultCreateOut {
  results: LevelResultOut[];
  // every reward this user owns, after this level
  reward_ids: number[];
  // only what this level earned
  new_reward_ids: number[];
}

export type LevelResultOutcome =
  | { status: 'submitted'; newRewards: RewardSimple[] }
  | { status: 'skipped' }
  | { status: 'failed'; error: unknown };

/** Record a completed level and take ownership of whatever it earned. Never throws. */
export async function submitLevelResult(result: LevelResultIn): Promise<LevelResultOutcome> {
  // Authenticated: a 401 inside `api` can clear the session without retrying.
  if (!useAuthStore.getState().accessToken) {
    return { status: 'skipped' };
  }

  try {
    const submitted = await api<LevelResultCreateOut>('/level-results', {
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
