export function getResolution(): number {
  let resolution = Math.min(window.devicePixelRatio, 2);

  if (resolution > 1 && resolution % 1 !== 0) {
    resolution = 2;
  }

  return resolution;
}
