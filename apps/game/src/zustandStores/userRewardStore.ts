import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserRewardState {
  /** Complete set of reward ids the user owns, as last reported by the backend. */
  ownedRewardIds: number[];
  /**
   * Rewards earned but not yet celebrated. In-memory only: a reload should never
   * replay an animation, and ownership is already recorded separately.
   */
  pendingCelebrations: Record<number, boolean>;

  /** Replace ownership from a backend response and queue the new ids for celebration. */
  syncRewards: (ownedIds: number[], newIds: number[]) => void;
  /** Replace ownership without queueing anything (login hydration). */
  setOwnedRewards: (ownedIds: number[]) => void;

  hasReward: (rewardId: number) => boolean;
  consumeCelebration: (rewardId: number) => boolean;
  /** Drain every queued id at once, for the end screen. */
  consumeAllCelebrations: () => number[];

  clearRewards: () => void;
}

export const useUserRewardStore = create<UserRewardState>()(
  persist(
    (set, get) => ({
      ownedRewardIds: [],
      pendingCelebrations: {},

      syncRewards: (ownedIds, newIds) => {
        set((s) => {
          // Merge rather than replace, so a celebration the end screen never got
          // to play is still waiting for the next view that drains the queue.
          const pendingCelebrations = { ...s.pendingCelebrations };
          for (const id of newIds) {
            pendingCelebrations[id] = true;
          }
          // `ownedIds` is the backend's complete list, so replacing it is what
          // keeps previously earned rewards without diffing anything here.
          return { ownedRewardIds: ownedIds, pendingCelebrations };
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

      clearRewards: () => set({ ownedRewardIds: [], pendingCelebrations: {} }),
    }),
    {
      name: 'utg-user-rewards',
      partialize: (state) => ({ ownedRewardIds: state.ownedRewardIds }),
    },
  ),
);

export default useUserRewardStore;
