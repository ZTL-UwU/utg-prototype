import { ofetch } from 'ofetch';

import { useAuthStore } from '../zustandStores/auth';
import { backendUrl } from './env';
import { reauthenticate } from './reauth';

const AUTH_ENDPOINTS = ['/user/login', '/user/register', '/user/token/refresh'];

// Shared across concurrent 401s so only one refresh (or re-login prompt) is in flight.
let renewal: Promise<string | null> | null = null;

/** Trade the refresh token for a new access token. Null when there is none or it is refused. */
async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const { access } = await ofetch<{ access: string }>('/user/token/refresh', {
      baseURL: backendUrl,
      method: 'POST',
      body: { refresh: refreshToken },
    });
    setTokens(access, refreshToken);
    return access;
  } catch {
    return null;
  }
}

/**
 * A new access token from the refresh token, or failing that, from the player logging back
 * in. The request that 401'd waits for that login and then retries, so nothing it carried
 * (a level result, say) is lost to an expired session.
 */
async function renewAccessToken(): Promise<string | null> {
  return (await refreshAccessToken()) ?? reauthenticate();
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

    renewal ??= renewAccessToken().finally(() => {
      renewal = null;
    });
    const access = await renewal;
    // Signed out (or a guest); retrying would just 401 again.
    if (!access) options.retry = false;
  },
});
