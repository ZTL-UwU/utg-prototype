export const backendUrl = import.meta.env.VITE_BACKEND_URL;

/**
 * Every level is unlocked, and a shared link opens straight into the game as a guest instead
 * of asking to log in and pick an avatar first.
 */
export const openAccess = import.meta.env.VITE_OPEN_ACCESS === 'true';
