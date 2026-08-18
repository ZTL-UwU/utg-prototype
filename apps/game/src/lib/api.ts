import { ofetch } from 'ofetch';

import { useAuthStore } from '../zustandStores/auth';
import { backendUrl } from './env';

const AUTH_ENDPOINTS = ['/user/login', '/user/register', '/user/token/refresh'];

// Shared across concurrent 401s so only one refresh request is in flight.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, isGuest, setTokens, clearTokens } = useAuthStore.getState();
  if (!refreshToken) {
    // Guests have no tokens; a 401 must not wipe the local session.
    if (!isGuest) clearTokens();
    // [TODO]:
    // Although this is unlikely to happen since we have the 12h refresh token expiry check on startup, we should still handle this better.
    // we need to show the auth overlay, and somehow retry the request (w/ a game result queue for game result reporting for example).
    return null;
  }

  try {
    const { access } = await ofetch<{ access: string }>('/user/token/refresh', {
      baseURL: backendUrl,
      method: 'POST',
      body: { refresh: refreshToken },
    });
    setTokens(access, refreshToken);
    return access;
  } catch {
    if (!useAuthStore.getState().isGuest) clearTokens();
    // TODO: same as above
    return null;
  }
}

export const api = ofetch.create({
  baseURL: backendUrl,
  retry: 1,
  retryStatusCodes: [401],
  onRequest({ options }) {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      options.headers.set('Authorization', `Bearer ${accessToken}`);
    }
  },
  async onResponseError({ request, response, options }) {
    if (response.status !== 401) return;

    // Don't retry on auth endpoints
    const url = typeof request === 'string' ? request : request.url;
    if (AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))) {
      options.retry = false;
      return;
    }

    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const access = await refreshPromise;
    // Refresh token expired or revoked; retrying would just 401 again.
    if (!access) {
      options.retry = false;
      // TODO: same as above
    }
  },
});
