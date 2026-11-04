import { Capacitor } from '@capacitor/core';

/** Native apps and touch-first browsers: phones and tablets. */
function isMobile(): boolean {
  return Capacitor.isNativePlatform() || window.matchMedia('(pointer: coarse)').matches;
}

export function getResolution(): number {
  // Mobile GPUs struggle with filling 2x canvases, so trade sharpness for frame rate there.
  if (isMobile()) return 1;

  let resolution = Math.min(window.devicePixelRatio, 2);

  if (resolution > 1 && resolution % 1 !== 0) {
    resolution = 2;
  }

  return resolution;
}
