export function loginPath(redirectTo: string) {
  return redirectTo === '/' ? '/login' : `/login?redirect=${encodeURIComponent(redirectTo)}`;
}

/** Only allow internal paths to prevent open redirects. */
export function safeRedirect(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}
