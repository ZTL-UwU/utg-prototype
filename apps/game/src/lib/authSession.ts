import { ofetch } from 'ofetch';

import { useAuthStore } from '../zustandStores/auth';
import { backendUrl } from './env';

const CLOCK_SKEW_MS = 30_000;
/** Reject entry if refresh would die during a long play session. */
const MIN_REFRESH_REMAINING_MS = 12 * 60 * 60 * 1000;

type RefreshResponse = {
  access: string;
};

/** Read `exp` from a JWT without verifying — used only for client-side runway checks. */
function remainingMsFromJwt(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const { exp } = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof exp !== 'number') return null;
    return exp * 1000 - Date.now();
  } catch {
    return null;
  }
}

function isJwtExpired(token: string | null | undefined, skewMs = CLOCK_SKEW_MS): boolean {
  if (!token) return true;
  const remaining = remainingMsFromJwt(token);
  if (remaining == null) return true;
  return remaining <= skewMs;
}

/**
 * Ensures the persisted session is usable before entering the game.
 * Requires ≥12h left on the refresh token so a long session won't force re-login mid-play.
 * Refreshes the access token when needed; returns false if the user must log in.
 */
export async function ensureValidSession(): Promise<boolean> {
  const { accessToken, refreshToken, user, setTokens, clearTokens } = useAuthStore.getState();

  if (!refreshToken || !user) {
    return false;
  }

  const refreshRemaining = remainingMsFromJwt(refreshToken);
  // Missing/unreadable expiry, already expired, or less than 12h left → re-login at START.
  if (refreshRemaining == null || refreshRemaining < MIN_REFRESH_REMAINING_MS) {
    clearTokens();
    return false;
  }

  if (accessToken && !isJwtExpired(accessToken)) {
    return true;
  }

  try {
    const data = await ofetch<RefreshResponse>('/user/token/refresh', {
      baseURL: backendUrl,
      method: 'POST',
      body: { refresh: refreshToken },
    });
    setTokens(data.access, refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}
