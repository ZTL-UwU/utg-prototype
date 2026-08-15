import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TLayer } from '../app/screens/level-map/units';
import { api } from '../lib/api';
import { ensureRemoteReady, type RemoteStatus } from '../lib/remoteResource';
import { isLayer, isRewardType, type RewardType } from './rewardStore';

/** A reward this user owns, with the placement data the passport needs. */
export interface UserReward {
  id: number;
  type: RewardType;
  layer: TLayer | null;
  /** Null for the layer trophy. */
  level: number | null;
  image_url: string;
}

/** Mirrors RewardOut from the backend `/user/rewards/list` endpoint. */
interface ApiUserReward {
  id: number;
  type: string;
  layer: string;
  level: number | null;
  image: { url: string };
}

interface UserRewardState {
  status: RemoteStatus;
  error?: string;
  rewards: UserReward[];

  ownedRewardIds: number[];
  /** Awaiting the end-screen celebration. Unpersisted so a reload never replays it. */
  pendingCelebrations: Record<number, boolean>;
  /** Awaiting the passport shake. Separate queue: the end screen drains the other one. */
  unseenInPassport: Record<number, boolean>;

  fetchUserRewards: () => Promise<void>;

  /** Replace ownership from a backend response and queue the new ids for both animations. */
  syncRewards: (ownedIds: number[], newIds: number[]) => void;
  /** Replace ownership without queueing anything (login hydration). */
  setOwnedRewards: (ownedIds: number[]) => void;

  hasReward: (rewardId: number) => boolean;
  consumeCelebration: (rewardId: number) => boolean;
  consumeAllCelebrations: () => number[];
  consumeUnseen: (rewardId: number) => boolean;

  clearRewards: () => void;
}

function mapUserReward(reward: ApiUserReward): UserReward | null {
  if (!isRewardType(reward.type)) return null;

  return {
    id: reward.id,
    type: reward.type,
    layer: isLayer(reward.layer) ? reward.layer : null,
    level: reward.level ?? null,
    image_url: reward.image.url,
  };
}

export const useUserRewardStore = create<UserRewardState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      error: undefined,
      rewards: [],
      ownedRewardIds: [],
      pendingCelebrations: {},
      unseenInPassport: {},

      fetchUserRewards: async () => {
        const { status } = get();
        if (status === 'loading' || status === 'ready') return;

        set({ status: 'loading', error: undefined });
        try {
          const apiRewards = await api<ApiUserReward[]>('/user/rewards/list');
          const rewards = apiRewards
            .map(mapUserReward)
            .filter((reward): reward is UserReward => reward != null);

          const dropped = apiRewards.length - rewards.length;
          if (dropped > 0) {
            console.warn(`/user/rewards/list: dropped ${dropped} reward(s) of unknown type`);
          }

          set({
            status: 'ready',
            error: undefined,
            rewards,
            ownedRewardIds: rewards.map((reward) => reward.id),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load user rewards';
          set({ status: 'error', error: message, rewards: [] });
        }
      },

      syncRewards: (ownedIds, newIds) => {
        set((s) => {
          // Merge, so an animation a screen never played stays queued for the next one.
          const pendingCelebrations = { ...s.pendingCelebrations };
          const unseenInPassport = { ...s.unseenInPassport };
          for (const id of newIds) {
            pendingCelebrations[id] = true;
            unseenInPassport[id] = true;
          }

          return {
            // `ownedIds` is the backend's complete list
            ownedRewardIds: ownedIds,
            pendingCelebrations,
            unseenInPassport,
            // The POST returns ids only; go idle so the next ensure* refetches placement.
            status: newIds.length > 0 ? ('idle' as RemoteStatus) : s.status,
          };
        });
      },

      setOwnedRewards: (ownedIds) => set({ ownedRewardIds: ownedIds }),

      hasReward: (rewardId) => get().ownedRewardIds.includes(rewardId),

      consumeCelebration: (rewardId) => {
        if (!get().pendingCelebrations[rewardId]) return false;
        set((s) => {
          const next = { ...s.pendingCelebrations };
          delete next[rewardId];
          return { pendingCelebrations: next };
        });
        return true;
      },

      consumeAllCelebrations: () => {
        const ids = Object.keys(get().pendingCelebrations).map(Number);
        if (ids.length === 0) return [];
        set({ pendingCelebrations: {} });
        return ids;
      },

      consumeUnseen: (rewardId) => {
        if (!get().unseenInPassport[rewardId]) return false;
        set((s) => {
          const next = { ...s.unseenInPassport };
          delete next[rewardId];
          return { unseenInPassport: next };
        });
        return true;
      },

      clearRewards: () =>
        set({
          status: 'idle',
          rewards: [],
          ownedRewardIds: [],
          pendingCelebrations: {},
          unseenInPassport: {},
        }),
    }),
    {
      name: 'utg-user-rewards',
      partialize: (state) => ({ ownedRewardIds: state.ownedRewardIds }),
    },
  ),
);

/** Resolves when owned rewards are loaded; false if the fetch failed or logged out. */
export function ensureUserRewardsReady(): Promise<boolean> {
  return ensureRemoteReady({
    getStatus: () => useUserRewardStore.getState().status,
    subscribe: (listener) => useUserRewardStore.subscribe((state) => listener(state.status)),
    start: () => {
      void useUserRewardStore.getState().fetchUserRewards();
    },
  });
}

export default useUserRewardStore;
