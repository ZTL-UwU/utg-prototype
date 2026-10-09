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

/**
 * Signed in or playing as a guest. Anyone else logs in first, then comes back; with
 * `openAccess` they carry on as a guest instead.
 */
export const session: Guard = async (href) => {
  if (await hasSession()) return;
  if (!openAccess) return redirect(withNext('/auth', href));
  useAuthStore.getState().enterGuestMode();
};

/**
 * A session with an avatar picked, the same bar `continueIntoGame` sets for entering the game.
 * `openAccess` skips the avatar: screens fall back to the default one.
 */
export const player: Guard = async (href) => {
  const outcome = await session(href);
  if (outcome) return outcome;
  if (!openAccess && useAuthStore.getState().user?.avatar == null) {
    return redirect(withNext('/avatar-select', href));
  }
};

/**
 * The course catalog and the player's results, which maps and levels are built from and
 * locked by. A failed catalog fetch shows the retry screen and keeps the URL.
 */
export const course: Guard = async () => {
  if (!(await ensureCourseCatalogReady())) return { screen: CourseLoadErrorScreen };
  await ensureResultsReady();
};
