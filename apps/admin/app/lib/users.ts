import { queryOptions } from '@tanstack/react-query';

import { api } from '~/lib/api';

/** Mirrors AdminUserOut from apps/users/schemas.py. */
export interface AdminUser {
  id: number;
  name: string | null;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  is_cheat: boolean;
  date_joined: string;
}

export type AdminUserFlag = 'is_cheat' | 'is_active' | 'is_staff';

export function userLabel(user: AdminUser): string {
  return user.name?.trim() || user.email;
}

export const usersQueryOptions = queryOptions({
  queryKey: ['users', 'list'],
  queryFn: () => api<AdminUser[]>('/users/list'),
  staleTime: Infinity,
});
