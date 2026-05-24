import { create } from 'zustand';

interface CorrectLetterStore {
  correctLetter: string;
  setCorrectLetter: (a0: string) => void;
}

export const useCorrectLetterStore = create<CorrectLetterStore>((set) => ({
  correctLetter: undefined,
  setCorrectLetter: (letter) => set({ correctLetter: letter }),
}));

