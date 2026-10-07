/**
 * Game URLs.
 *
 * - `routes.ts`: every URL the game answers to. Adding a screen means adding a route here.
 * - `guards.ts`: checks a route can require before it opens (signed in, catalog loaded, …).
 * - `core/`: the machinery behind them; screens never need to touch it.
 */
export { router } from './core/router';
