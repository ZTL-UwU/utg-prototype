import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TMapType = 'typing' | 'education';

function key(mapType: TMapType, levelId: number) {
  return `${mapType}-${levelId}`;
}

interface LevelProgressState {
  attemptedLevels: Record<string, boolean>;
  pendingAnimations: Record<string, boolean>;

  markAttempted: (mapType: TMapType, levelId: number) => void;
  isAttempted: (mapType: TMapType, levelId: number) => boolean;
  consumePendingAnimation: (mapType: TMapType, levelId: number) => boolean;
  resetAllAttempts: () => void;
}

export const useLevelProgress = create<LevelProgressState>()(
  persist(
    (set, get) => ({
      attemptedLevels: {},
      pendingAnimations: {},

      markAttempted: (mapType, levelId) => {
        const k = key(mapType, levelId);
        if (get().attemptedLevels[k]) return;
        set((s) => ({
          attemptedLevels: { ...s.attemptedLevels, [k]: true },
          pendingAnimations: { ...s.pendingAnimations, [k]: true },
        }));
      },

      isAttempted: (mapType, levelId) => !!get().attemptedLevels[key(mapType, levelId)],

      consumePendingAnimation: (mapType, levelId) => {
        const k = key(mapType, levelId);
        if (!get().pendingAnimations[k]) return false;
        set((s) => {
          const next = { ...s.pendingAnimations };
          delete next[k];
          return { pendingAnimations: next };
        });
        return true;
      },

      resetAllAttempts: () => set({ attemptedLevels: {}, pendingAnimations: {} }),
    }),
    {
      name: 'utg-level-progress',
      partialize: (state) => ({ attemptedLevels: state.attemptedLevels }),
    },
  ),
);

// Dev cheat: wipes all "attempted" ring flags (clears the 'utg-level-progress' localStorage
// entry) so every level's ring renders unfilled again. Uncomment, save, then reload the app.
// useLevelProgress.getState().resetAllAttempts();
