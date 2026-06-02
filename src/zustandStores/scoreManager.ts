import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export function getAccuracyPercent(correctCount: number, mistakeCount: number) {
  const total = correctCount + mistakeCount;
  if (total === 0) {
    return 0;
  }

  return Math.round((correctCount / total) * 100);
}

function getSessionAccuracy(correct: number, mistakes: number) {
  return getAccuracyPercent(correct, mistakes);
}

interface ScoreManagerState {
  correctCount: number;
  mistakeCount: number;
  highestAccuracy: number;
  recordCorrect: () => void;
  recordMistake: () => void;
  reset: () => void;
  addSession: (correct: number, mistakes: number) => void;
}

export const useScoreManager = create<ScoreManagerState>()(
  persist(
    (set) => ({
      correctCount: 0,
      mistakeCount: 0,
      highestAccuracy: 0,
      recordCorrect: () => set((state) => ({ correctCount: state.correctCount + 1 })),
      recordMistake: () => set((state) => ({ mistakeCount: state.mistakeCount + 1 })),
      reset: () => set({ correctCount: 0, mistakeCount: 0, highestAccuracy: 0 }),
      addSession: (correct: number, mistakes: number) =>
        set((state) => {
          const sessionAccuracy = getSessionAccuracy(correct, mistakes);
          return {
            correctCount: state.correctCount + correct,
            mistakeCount: state.mistakeCount + mistakes,
            highestAccuracy: Math.max(state.highestAccuracy, sessionAccuracy),
          };
        }),
    }),
    {
      name: 'utg-typing-score',
      partialize: (state) => ({
        correctCount: state.correctCount,
        mistakeCount: state.mistakeCount,
        highestAccuracy: state.highestAccuracy,
      }),
    },
  ),
);
