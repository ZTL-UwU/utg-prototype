import { Graphics } from 'pixi.js';

export const RING_COLOR_UNFILLED = 0xa66129;
export const RING_COLOR_FILLED = 0xffdf59;
export const FILL_ANIM_DURATION = 0.6;
export const FILL_ANIM_DELAY = 0.25;

export function drawDashedRing(
  g: Graphics,
  r: number,
  fillProgress = 0,
  filledColor = RING_COLOR_FILLED,
  unfilledColor = RING_COLOR_UNFILLED,
  width = 15,
) {
  g.clear();
  const dashCount = 8;
  const gapRatio = 0.1;
  const segmentAngle = (Math.PI * 2) / dashCount;
  const gapAngle = segmentAngle * gapRatio;
  const dashAngle = segmentAngle - gapAngle;
  const base = -Math.PI / 2;
  const fillBoundary = base + fillProgress * Math.PI * 2;

  const strokeArc = (start: number, end: number, color: number) => {
    if (end <= start) return;
    g.setStrokeStyle({ width, color });
    g.arc(0, 0, r, start, end);
    g.stroke();
  };

  for (let i = 0; i < dashCount; i++) {
    const dashStart = base + i * segmentAngle;
    const dashEnd = dashStart + dashAngle;
    strokeArc(dashStart, Math.min(dashEnd, fillBoundary), filledColor);
    strokeArc(Math.max(dashStart, fillBoundary), dashEnd, unfilledColor);
  }
}
