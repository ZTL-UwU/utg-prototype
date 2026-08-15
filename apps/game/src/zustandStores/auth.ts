import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthUser = {
  id: number;
  name: string | null;
  email: string;
  total_score: number;
  total_stars: number;
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

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  clearTokens: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setAuth: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      clearTokens: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'auth',
      partialize: ({ accessToken, refreshToken, user }) => ({
        accessToken,
        refreshToken,
        user,
      }),
    },
  ),
);
