const rawBackendUrl: string | undefined = import.meta.env.VITE_BACKEND_URL;
if (!rawBackendUrl) {
  // Without it every API call goes to the app's own origin and gets index.html back.
  throw new Error('VITE_BACKEND_URL is not set; check apps/game/.env before building');
}
export const backendUrl = rawBackendUrl;

/**
 * Every level is unlocked, and a shared level link opens straight into the level as a guest
 * instead of asking to log in and pick an avatar first. Other pages still require logging in.
 */
export const openAccess = import.meta.env.VITE_OPEN_ACCESS === 'true';
