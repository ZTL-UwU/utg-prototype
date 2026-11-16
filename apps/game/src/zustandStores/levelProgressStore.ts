import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TLayer } from '../app/screens/level-map/units';

function key(mapType: TLayer, levelId: number) {
  return `${mapType}-${levelId}`;
}

function unitKey(mapType: TLayer, mapUnitId: number) {
  return `unit-${mapType}-${mapUnitId}`;
}

interface LevelProgressState {
  attemptedLevels: Record<string, boolean>;
  pendingAnimations: Record<string, boolean>;
  pendingMapUnitAnimations: Record<string, boolean>;
  /** Education unit the level-select sheep stands on, kept where the player last sent it. */
  sheepUnitId: number | null;

  markAttempted: (mapType: TLayer, levelId: number) => void;
  isAttempted: (mapType: TLayer, levelId: number) => boolean;
  consumePendingAnimation: (mapType: TLayer, levelId: number) => boolean;

  queueMapUnitAnimation: (mapType: TLayer, mapUnitId: number) => void;
  consumeMapUnitPendingAnimation: (mapType: TLayer, mapUnitId: number) => boolean;

  setSheepUnit: (mapUnitId: number) => void;

  resetAllAttempts: () => void;
}

export const useLevelProgress = create<LevelProgressState>()(
  persist(
    (set, get) => ({
      attemptedLevels: {},
      pendingAnimations: {},
      pendingMapUnitAnimations: {},
      sheepUnitId: null,

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

      queueMapUnitAnimation: (mapType, mapUnitId) => {
        const k = unitKey(mapType, mapUnitId);
        if (get().pendingMapUnitAnimations[k]) return;
        set((s) => ({
          pendingMapUnitAnimations: { ...s.pendingMapUnitAnimations, [k]: true },
        }));
      },

      consumeMapUnitPendingAnimation: (mapType, mapUnitId) => {
        const k = unitKey(mapType, mapUnitId);
        if (!get().pendingMapUnitAnimations[k]) return false;
        set((s) => {
          const next = { ...s.pendingMapUnitAnimations };
          delete next[k];
          return { pendingMapUnitAnimations: next };
        });
        return true;
      },

      setSheepUnit: (mapUnitId) => set({ sheepUnitId: mapUnitId }),

      resetAllAttempts: () =>
        set({ attemptedLevels: {}, pendingAnimations: {}, pendingMapUnitAnimations: {} }),
    }),
    {
      name: 'utg-level-progress',
      partialize: (state) => ({
        attemptedLevels: state.attemptedLevels,
        sheepUnitId: state.sheepUnitId,
      }),
    },
  ),
);

// Dev cheat: wipes all "attempted" ring flags (clears the 'utg-level-progress' localStorage
// entry) so every level's ring renders unfilled again. Uncomment, save, then reload the app.
// useLevelProgress.getState().resetAllAttempts();
