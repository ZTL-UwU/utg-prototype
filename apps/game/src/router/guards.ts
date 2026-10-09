import { CourseLoadErrorScreen } from '../app/screens/course-load-error';
import { ensureValidSession } from '../lib/authSession';
import { openAccess } from '../lib/env';
import { useAuthStore } from '../zustandStores/auth';
import { ensureCourseCatalogReady } from '../zustandStores/courseStore';
import { ensureResultsReady } from '../zustandStores/resultStore';
import { redirect, type Guard } from './core/defineRoute';

/** `path?next=<href>`, so the screen at `path` can send the visitor back once it is done. */
function withNext(path: string, href: string): string {
  return `${path}?${new URLSearchParams({ next: href })}`;
}

let validation: Promise<boolean> | undefined;

/**
 * A persisted session is checked with the server once per page load, the same check the home
 * screen runs on START. After that, the store is the source of truth: logging out clears it.
 */
async function hasSession(): Promise<boolean> {
  if (!useAuthStore.getState().user) return false;
  validation ??= ensureValidSession();
  if (await validation) return true;
  validation = undefined;
  return false;
}

/** Signed in or playing as a guest. Anyone else logs in first, then comes back. */
export const session: Guard = async (href) => {
  if (!(await hasSession())) return redirect(withNext('/auth', href));
};

/** A session with an avatar picked, the same bar `continueIntoGame` sets for entering the game. */
export const player: Guard = async (href) => {
  const outcome = await session(href);
  if (outcome) return outcome;
  if (useAuthStore.getState().user?.avatar == null) {
    return redirect(withNext('/avatar-select', href));
  }
};

/**
 * `player` for a level's own URL. With `openAccess`, a shared level link opens straight into
 * the level: a visitor with no session plays as a guest, and the avatar is left to the default.
 */
export const levelPlayer: Guard = async (href) => {
  if (!openAccess) return player(href);
  if (!(await hasSession())) useAuthStore.getState().enterGuestMode();
};

/**
 * The course catalog and the player's results, which maps and levels are built from and
 * locked by. A failed catalog fetch shows the retry screen and keeps the URL.
 */
export const course: Guard = async () => {
  if (!(await ensureCourseCatalogReady())) return { screen: CourseLoadErrorScreen };
  await ensureResultsReady();
};
