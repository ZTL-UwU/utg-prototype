import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ScoreManagerState {
  correctCount: number;
  mistakeCount: number;
  recordCorrect: () => void;
  recordMistake: () => void;
  reset: () => void;
}

export const useScoreManager = create<ScoreManagerState>()(
  persist(
    (set) => ({
      correctCount: 0,
      mistakeCount: 0,
      recordCorrect: () => set((state) => ({ correctCount: state.correctCount + 1 })),
      recordMistake: () => set((state) => ({ mistakeCount: state.mistakeCount + 1 })),
      reset: () => set({ correctCount: 0, mistakeCount: 0 }),
    }),
    {
      name: 'utg-typing-score',
      partialize: (state) => ({
        correctCount: state.correctCount,
        mistakeCount: state.mistakeCount,
      }),
    },
  ),
);
