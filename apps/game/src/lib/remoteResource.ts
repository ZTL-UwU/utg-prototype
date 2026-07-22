/** Shared lifecycle for remote catalogs fetched at (or after) startup. */
export type RemoteStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface EnsureRemoteReadyOptions {
  getStatus: () => RemoteStatus;
  /** Subscribe to status changes; return an unsubscribe function. */
  subscribe: (listener: (status: RemoteStatus) => void) => () => void;
  /** Start the fetch when status is still `idle`. */
  start: () => void;
}

/**
 * Resolves when a remote resource reaches a terminal status.
 * Returns true for `ready`, false for `error`.
 * If `idle`, calls `start()` then waits.
 */
export function ensureRemoteReady({
  getStatus,
  subscribe,
  start,
}: EnsureRemoteReadyOptions): Promise<boolean> {
  const status = getStatus();
  if (status === 'ready') return Promise.resolve(true);
  if (status === 'error') return Promise.resolve(false);

  if (status === 'idle') {
    start();
  }

  return new Promise((resolve) => {
    const unsub = subscribe((next) => {
      if (next === 'loading' || next === 'idle') return;
      unsub();
      resolve(next === 'ready');
    });

    // Re-check in case the fetch settled before the subscription attached.
    const current = getStatus();
    if (current === 'ready' || current === 'error') {
      unsub();
      resolve(current === 'ready');
    }
  });
}
