export const backendUrl = import.meta.env.VITE_BACKEND_URL;

/**
 * Every level is unlocked, and a shared level link opens straight into the level as a guest
 * instead of asking to log in and pick an avatar first. Other pages still require logging in.
 */
export const openAccess = import.meta.env.VITE_OPEN_ACCESS === 'true';
