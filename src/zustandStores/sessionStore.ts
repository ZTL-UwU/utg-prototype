import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface SessionStore {
  levelType: 'education' | 'typing' | null;
  correct: number;
  mistakes: number;
  startSession: (type: 'education' | 'typing') => void;
  recordCorrect: () => void;
  recordMistake: () => void;
  reset: () => void;
}

const useSessionStore = create<SessionStore>()(
  subscribeWithSelector((set) => ({
    levelType: null,
    correct: 0,
    mistakes: 0,
    startSession: (type) => set({ levelType: type, correct: 0, mistakes: 0 }),
    recordCorrect: () => set((state) => ({ correct: state.correct + 1 })),
    recordMistake: () => set((state) => ({ mistakes: state.mistakes + 1 })),
    reset: () => set({ levelType: null, correct: 0, mistakes: 0 }),
  })),
);

export default useSessionStore;
