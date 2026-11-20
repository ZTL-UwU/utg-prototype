/** Get the distance between a and b points */
export function getDistance(ax: number, ay: number, bx = 0, by = 0) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number) {
  return (1 - t) * a + t * b;
}

/** Clamp a number to minimum and maximum values */
export function clamp(v: number, min = 0, max = 1) {
  if (min > max) [min, max] = [max, min];
  return v < min ? min : v > max ? max : v;
}

/** Scale that fits a `width` × `height` box inside `maxWidth` × `maxHeight`, never growing it. */
export function containScale(width: number, height: number, maxWidth: number, maxHeight: number) {
  return Math.min(1, maxWidth / width, maxHeight / height);
}

/** Scale that covers `viewWidth` × `viewHeight` with a `width` × `height` box, cropping it. */
export function coverScale(width: number, height: number, viewWidth: number, viewHeight: number) {
  return Math.max(viewWidth / width, viewHeight / height);
}

/** Longest frame a game advances by, so the first frame after a tab switch can't jump it ahead. */
export const MAX_FRAME_MS = 50;

/** This frame's time in ms, capped at `MAX_FRAME_MS`. */
export function frameDeltaMs(ticker: { deltaMS: number }) {
  return Math.min(ticker.deltaMS, MAX_FRAME_MS);
}
