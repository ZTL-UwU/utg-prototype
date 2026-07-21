import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { backendUrl } from '~/lib/env';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Resolve a media path that may be relative (local MEDIA_URL) or absolute (S3). */
export function mediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = backendUrl.replace(/\/$/, '');
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}
