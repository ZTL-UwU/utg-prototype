import { create } from 'zustand';

type FeedbackStore = {
  isOpen: boolean;
  screenshot: HTMLCanvasElement | null;
  open: (screenshot: HTMLCanvasElement) => void;
  close: () => void;
};

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  isOpen: false,
  screenshot: null,
  open: (screenshot) => set({ isOpen: true, screenshot }),
  close: () => set({ isOpen: false, screenshot: null }),
}));
