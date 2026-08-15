import { backendUrl } from './env';

/** Resolve a media path that may be relative (local MEDIA_URL) or absolute (S3). */
export function mediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const origin = backendUrl.replace(/\/$/, '').replace(/\/api$/, '');
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
}
