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

export function getStarCount(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy > 90) return 3;
  if (accuracy > 70) return 2;
  if (accuracy > 50) return 1;
  return 0;
}

interface ScoreManagerState {
  correctCount: number;
  mistakeCount: number;
  highestAccuracy: number;
  totalStars: number;
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
      totalStars: 0,
      recordCorrect: () => set((state) => ({ correctCount: state.correctCount + 1 })),
      recordMistake: () => set((state) => ({ mistakeCount: state.mistakeCount + 1 })),
      reset: () => set({ correctCount: 0, mistakeCount: 0, highestAccuracy: 0, totalStars: 0 }),
      addSession: (correct: number, mistakes: number) =>
        set((state) => {
          const sessionAccuracy = getSessionAccuracy(correct, mistakes);
          const sessionStars = getStarCount(sessionAccuracy);
          return {
            correctCount: state.correctCount + correct,
            mistakeCount: state.mistakeCount + mistakes,
            highestAccuracy: Math.max(state.highestAccuracy, sessionAccuracy),
            totalStars: state.totalStars + sessionStars,
          };
        }),
    }),
    {
      name: 'utg-typing-score',
      partialize: (state) => ({
        correctCount: state.correctCount,
        mistakeCount: state.mistakeCount,
        highestAccuracy: state.highestAccuracy,
        totalStars: state.totalStars,
      }),
    },
  ),
);
