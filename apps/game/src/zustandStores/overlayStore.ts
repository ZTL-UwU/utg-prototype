import { create } from 'zustand';

import type { PasswordResetParams } from '../lib/passwordReset';

export type OverlayId = 'youtube-embeds' | 'auth' | 'menu';

type ShowOptions = {
  /** Credentials from a reset-password link; the auth overlay opens on the reset form. */
  passwordReset?: PasswordResetParams;
  /** In-app href the auth overlay continues to once the player is in. */
  returnTo?: string;
};

interface OverlayStore {
  activeOverlay: OverlayId | null;
  passwordReset: PasswordResetParams | null;
  returnTo: string | null;
  show: (id: OverlayId, options?: ShowOptions) => void;
  hide: () => void;
}

export const useOverlayStore = create<OverlayStore>((set) => ({
  activeOverlay: null,
  passwordReset: null,
  returnTo: null,
  show: (id, options) =>
    set({
      activeOverlay: id,
      passwordReset: options?.passwordReset ?? null,
      returnTo: options?.returnTo ?? null,
    }),
  hide: () => set({ activeOverlay: null, passwordReset: null, returnTo: null }),
}));
