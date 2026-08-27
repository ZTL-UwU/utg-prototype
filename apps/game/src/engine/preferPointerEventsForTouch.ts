/**
 * @pixi/ui FancyButton binds `click`/`mousedown` when Pixi's `isMobile.any` is
 * false (UA-based). Pixi only synthesizes those from pointerType "mouse".
 *
 * Android/iPad "Request desktop site" spoofs the UA so `isMobile.any` is false,
 * while the screen still sends pointerType "touch" — which maps to `tap` /
 * `pointertap`, never `click`. Presses then do nothing.
 *
 * Detect real touch capability and flip `isMobile.any` so buttons use pointer
 * events (which work for both mouse and touch).
 */
export type MobileFlags = { any: boolean };

export function deviceHasTouchInput(
  maxTouchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
  coarsePointer = typeof window !== 'undefined' &&
    !!window.matchMedia?.('(pointer: coarse)').matches,
): boolean {
  return maxTouchPoints > 0 || coarsePointer;
}

/** Returns true when `mobile.any` was flipped from false to true. */
export function preferPointerEventsForTouch(
  mobile: MobileFlags,
  hasTouchInput = deviceHasTouchInput(),
): boolean {
  if (mobile.any || !hasTouchInput) return false;
  mobile.any = true;
  return true;
}
