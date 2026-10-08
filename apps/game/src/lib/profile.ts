import { useAuthStore, type AuthUser } from '../zustandStores/auth';
import { api } from './api';

/**
 * Save the avatar on the backend for signed-in players. Guests and testers keep it local only.
 * Failures are logged, not thrown: the local pick stands, and `ensureValidSession` pushes it
 * again next time the server comes back without one.
 */
export async function saveAvatar(avatar: number): Promise<void> {
  if (useAuthStore.getState().accessToken === null) return;

  try {
    await api<AuthUser>('/user/profile', { method: 'PATCH', body: { avatar } });
  } catch (error) {
    console.warn('Failed to save avatar', error);
  }
}
