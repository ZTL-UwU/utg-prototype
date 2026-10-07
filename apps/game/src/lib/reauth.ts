import { create } from 'zustand';

import { useAuthStore } from '../zustandStores/auth';

/** Account the re-login prompt asks for; `null` while the prompt is closed. */
export const useReauthStore = create<{ email: string | null }>(() => ({ email: null }));

/**
 * The refresh token this page load has seen work: issued by a login here, or vouched for by
 * `ensureValidSession`. Only such a session is logged back into in place. One that dies before
 * that check signs out instead, and the entry flow sends the player to the auth screen.
 */
let trustedRefreshToken: string | null = null;

let pending: Promise<string | null> | null = null;
let settle: ((access: string | null) => void) | null = null;
let pendingUserId: number | null = null;

/** Mark the current refresh token as one the server accepted during this page load. */
export function trustRefreshToken() {
  trustedRefreshToken = useAuthStore.getState().refreshToken;
}

function finish(access: string | null) {
  settle?.(access);
  pending = null;
  settle = null;
  pendingUserId = null;
  useReauthStore.setState({ email: null });
}

// A refresh never swaps the refresh token, so a change here is a login or a sign-out.
useAuthStore.subscribe((state, previous) => {
  if (state.refreshToken === previous.refreshToken) return;
  trustedRefreshToken = state.refreshToken;

  if (!pending) return;
  // Held requests only replay for the account that made them.
  const sameAccount = state.accessToken !== null && state.user?.id === pendingUserId;
  finish(sameAccount ? state.accessToken : null);
});

/**
 * Called once the refresh token is refused. Asks the player to log back in and resolves with
 * the new access token, or with null if they log out instead. Concurrent callers share the
 * one prompt. Guests resolve null without losing their local session.
 */
export function reauthenticate(): Promise<string | null> {
  if (pending) return pending;

  const { refreshToken, user, isGuest, clearTokens } = useAuthStore.getState();
  if (isGuest || !refreshToken) return Promise.resolve(null);

  if (!user?.email || refreshToken !== trustedRefreshToken) {
    clearTokens();
    return Promise.resolve(null);
  }

  pendingUserId = user.id;
  pending = new Promise((resolve) => {
    settle = resolve;
  });
  useReauthStore.setState({ email: user.email });
  return pending;
}
