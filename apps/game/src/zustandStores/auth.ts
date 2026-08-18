import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthUser = {
  id: number;
  name: string | null;
  email: string;
  /**
   * Chosen avatar as an integer id (see `src/utils/avatars.ts`). `null` until the user picks
   * one on the avatar-select screen; consumers should fall back to `DEFAULT_AVATAR_ID`.
   */
  avatar: number | null;
  /**
   * Every reward the user owns, sent with login/register. Hydrates `useUserRewardStore`.
   * Optional because sessions persisted before this field existed do not carry it;
   * treat a missing value as "unknown", not "owns nothing".
   */
  reward_ids?: number[];
};

/** Local-only player used when someone continues without an account. */
export const GUEST_USER: AuthUser = {
  id: 0,
  name: 'Guest',
  email: '',
  avatar: null,
};

export function sessionKind(state: {
  accessToken: string | null;
  isGuest: boolean;
}): 'signed-in' | 'guest' | 'none' {
  if (state.accessToken !== null) return 'signed-in';
  if (state.isGuest) return 'guest';
  return 'none';
}

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /** True when playing without an account; progress stays on this device. */
  isGuest: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  enterGuestMode: () => void;
  clearTokens: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isGuest: false,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user, isGuest: false }),
      enterGuestMode: () =>
        set((state) => ({
          accessToken: null,
          refreshToken: null,
          isGuest: true,
          user: state.isGuest && state.user ? state.user : { ...GUEST_USER },
        })),
      clearTokens: () => set({ accessToken: null, refreshToken: null, user: null, isGuest: false }),
    }),
    {
      name: 'auth',
      partialize: ({ accessToken, refreshToken, user, isGuest }) => ({
        accessToken,
        refreshToken,
        user,
        isGuest,
      }),
    },
  ),
);
