import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthUser = {
  id: number;
  name: string | null;
  email: string;
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
