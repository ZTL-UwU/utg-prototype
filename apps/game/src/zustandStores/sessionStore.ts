import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { TLayer } from '../app/screens/level-map/units';

interface SessionStore {
  /** Counts the levels started, so state kept between a level's rounds knows a new attempt. */
  attempt: number;
  levelType: TLayer | null;
  correct: number;
  mistakes: number;
  startSession: (type: TLayer) => void;
  recordCorrect: () => void;
  recordMistake: () => void;
  /** Count several mistakes at once, such as the targets left when time runs out. */
  recordMistakes: (count: number) => void;
  reset: () => void;
}

const useSessionStore = create<SessionStore>()(
  subscribeWithSelector((set) => ({
    attempt: 0,
    levelType: null,
    correct: 0,
    mistakes: 0,
    startSession: (type) =>
      set((state) => ({ attempt: state.attempt + 1, levelType: type, correct: 0, mistakes: 0 })),
    recordCorrect: () => set((state) => ({ correct: state.correct + 1 })),
    recordMistake: () => set((state) => ({ mistakes: state.mistakes + 1 })),
    recordMistakes: (count) => set((state) => ({ mistakes: state.mistakes + count })),
    reset: () => set({ levelType: null, correct: 0, mistakes: 0 }),
  })),
);

export default useSessionStore;
