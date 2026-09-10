import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { clearLocalSession, type LocalSessionKind } from '../lib/localSessionStorage';
import { isTesterPassword } from '../lib/testerMode';

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
  /**
   * Admin-managed flag: skip play-order locks so every published level is playable.
   * Optional on sessions persisted before this field existed; treat missing as false.
   */
  is_cheat?: boolean;
};

/** Local-only player used when someone continues without an account. */
export const GUEST_USER: AuthUser = {
  id: 0,
  name: 'Guest',
  email: '',
  avatar: null,
};

/** Local-only player for presentations: a guest with cheat-mode access. */
export const TESTER_USER: AuthUser = {
  id: 0,
  name: 'Tester',
  email: '',
  avatar: null,
  is_cheat: true,
};

export function sessionKind(state: {
  accessToken: string | null;
  isGuest: boolean;
  isTester?: boolean;
}): 'signed-in' | 'tester' | 'guest' | 'none' {
  if (state.accessToken !== null) return 'signed-in';
  if (state.isTester) return 'tester';
  if (state.isGuest) return 'guest';
  return 'none';
}

/** Which localStorage bucket a local-only session reads and writes. */
export function localSessionKind(state: { isTester?: boolean }): LocalSessionKind {
  return state.isTester ? 'tester' : 'guest';
}

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /** True when playing without an account; progress stays on this device. */
  isGuest: boolean;
  /** Guest session with cheat access, entered with the tester password. Implies `isGuest`. */
  isTester: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  enterGuestMode: () => void;
  /** Starts a fresh tester session. Returns false, changing nothing, on a wrong password. */
  enterTesterMode: (password: string) => boolean;
  clearTokens: () => void;
};

const SIGNED_OUT = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isGuest: false,
  isTester: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...SIGNED_OUT,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user, isGuest: false, isTester: false }),
      enterGuestMode: () =>
        set((state) => ({
          accessToken: null,
          refreshToken: null,
          isGuest: true,
          isTester: false,
          user: state.isGuest && !state.isTester && state.user ? state.user : { ...GUEST_USER },
        })),
      enterTesterMode: (password) => {
        if (!isTesterPassword(password)) return false;

        clearLocalSession('tester');
        // Sign out first so the result/reward syncs always see a session change and drop
        // what they hold, even when a tester session is already running.
        set(SIGNED_OUT);
        set({ isGuest: true, isTester: true, user: { ...TESTER_USER } });
        return true;
      },
      clearTokens: () => set(SIGNED_OUT),
    }),
    {
      name: 'auth',
      partialize: ({ accessToken, refreshToken, user, isGuest, isTester }) => ({
        accessToken,
        refreshToken,
        user,
        isGuest,
        isTester,
      }),
    },
  ),
);
