import { create } from 'zustand';

interface KeyboardStore {
  showKeyboard: boolean;
  setShowKeyboard: (value: boolean) => void;
}

export const useKeyboardStore = create<KeyboardStore>((set) => ({
  showKeyboard: false,
  setShowKeyboard: (value) => set({ showKeyboard: value }),
}));
