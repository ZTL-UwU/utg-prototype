/** Which local-only session owns a localStorage bucket. */
export type LocalSessionKind = 'guest' | 'tester';

type LocalBucket = 'results' | 'rewards';

// Tester runs get their own keys so cheat-unlocked progress never leaks into a guest's.
const KEYS: Record<LocalSessionKind, Record<LocalBucket, string>> = {
  guest: { results: 'utg-guest-level-results', rewards: 'utg-guest-rewards' },
  tester: { results: 'utg-tester-level-results', rewards: 'utg-tester-rewards' },
};

export function localStorageKey(kind: LocalSessionKind, bucket: LocalBucket): string {
  return KEYS[kind][bucket];
}

/** Drop every bucket this session kind owns. */
export function clearLocalSession(kind: LocalSessionKind): void {
  try {
    for (const key of Object.values(KEYS[kind])) localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Failed to clear ${kind} storage`, err);
  }
}
