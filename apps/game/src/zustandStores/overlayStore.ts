import { create } from 'zustand';

export type OverlayId = 'youtube-embeds' | 'auth' | 'menu';

interface OverlayStore {
  activeOverlay: OverlayId | null;
  show: (id: OverlayId) => void;
  hide: () => void;
}

export const useOverlayStore = create<OverlayStore>((set) => ({
  activeOverlay: null,
  show: (id) => set({ activeOverlay: id }),
  hide: () => set({ activeOverlay: null }),
}));
