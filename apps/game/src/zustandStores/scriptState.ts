import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ORTHO_ENUM = 'Arabic' | 'Latin' | 'Cyrillic';

interface ScriptState {
  currentScript: ORTHO_ENUM;
  setCurrentScript: (script: ORTHO_ENUM) => void;
}

export const scriptState = create<ScriptState>()(
  persist(
    (set) => ({
      currentScript: 'Arabic',
      setCurrentScript: (script) => set({ currentScript: script }),
    }),
    {
      name: 'utg-script',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
