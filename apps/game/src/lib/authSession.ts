import { useAuthStore } from '../zustandStores/auth';
import { api } from './api';

/** Reject entry if refresh would die during a long play session. */
const MIN_REFRESH_REMAINING_MS = 12 * 60 * 60 * 1000;

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

/**
 * Ensures the persisted session is usable before entering the game.
 * Guests skip token checks. Signed-in sessions need ≥12h left on the refresh
 * token so a long session won't force re-login mid-play.
 * Returns false if the user must log in.
 */
export async function ensureValidSession(): Promise<boolean> {
  const { refreshToken, user, isGuest, clearTokens } = useAuthStore.getState();

  if (isGuest && user) {
    return true;
  }

  if (!refreshToken || !user) {
    return false;
  }

  const refreshRemaining = remainingMsFromJwt(refreshToken);
  // Missing/unreadable expiry, already expired, or less than 12h left → re-login at START.
  if (refreshRemaining == null || refreshRemaining < MIN_REFRESH_REMAINING_MS) {
    clearTokens();
    return false;
  }

  // Call the profile api to check if the session is truly valid
  // If the access token is expired, the api will auto refresh it
  try {
    await api('/user/profile', {
      method: 'GET',
    });
    return true;
  } catch {
    clearTokens();
    return false;
  }
}
