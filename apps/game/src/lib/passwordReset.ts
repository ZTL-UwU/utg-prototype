export type PasswordResetParams = {
  uid: string;
  token: string;
};

/** Reads uid/token from a `/reset-password` deep link (email target). */
export function getPasswordResetParams(
  location: Pick<Location, 'pathname' | 'search'> = window.location,
): PasswordResetParams | null {
  const path = location.pathname.replace(/\/+$/, '');
  if (!path.endsWith('/reset-password') && !path.endsWith('reset-password')) {
    return null;
  }

  const params = new URLSearchParams(location.search);
  const uid = params.get('uid');
  const token = params.get('token');
  if (!uid || !token) {
    return null;
  }

  return { uid, token };
}

/** Clears the reset deep link so refresh does not re-open the form. */
export function clearPasswordResetUrl(): void {
  const url = new URL(window.location.href);
  const path = url.pathname.replace(/\/+$/, '');
  if (!path.endsWith('/reset-password') && !path.endsWith('reset-password')) {
    return;
  }

  const base = import.meta.env.BASE_URL || '/';
  const next = new URL(base, window.location.origin);
  // Keep hash so the dev screen router is not yanked mid-flow.
  next.hash = url.hash;
  window.history.replaceState({}, '', next);
}
