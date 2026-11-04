import type { Graphics } from 'pixi.js';

type Point = { x: number; y: number };

type DottedPathOptions = {
  color: number;
  dotRadius?: number;
  spacing?: number; // between dot centres
  cornerRadius?: number; // rounds each bend, like an elbow connector
  arrowSize?: number; // chevron at the last point; 0 draws none
};

const CORNER_STEPS = 8;

// Replaces each interior point with a sampled quadratic curve through it
function roundCorners(points: Point[], radius: number): Point[] {
  if (radius <= 0 || points.length < 3) return points;

  const rounded: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];
    const inLength = Math.hypot(prev.x - corner.x, prev.y - corner.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.min(radius, inLength / 2, outLength / 2);
    const start = {
      x: corner.x + ((prev.x - corner.x) / inLength) * r,
      y: corner.y + ((prev.y - corner.y) / inLength) * r,
    };
    const end = {
      x: corner.x + ((next.x - corner.x) / outLength) * r,
      y: corner.y + ((next.y - corner.y) / outLength) * r,
    };
    for (let step = 0; step <= CORNER_STEPS; step++) {
      const t = step / CORNER_STEPS;
      const u = 1 - t;
      rounded.push({
        x: u * u * start.x + 2 * u * t * corner.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * corner.y + t * t * end.y,
      });
    }
  }
  rounded.push(points[points.length - 1]);
  return rounded;
}

// Evenly spaced dots along a polyline, optionally ending in an arrowhead
export function drawDottedPath(
  graphics: Graphics,
  points: Point[],
  { color, dotRadius = 6, spacing = 22, cornerRadius = 0, arrowSize = 0 }: DottedPathOptions,
) {
  const path = roundCorners(points, cornerRadius);

  let untilNextDot = 0;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length === 0) continue;

    let distance = untilNextDot;
    while (distance <= length) {
      const t = distance / length;
      graphics.circle(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, dotRadius);
      distance += spacing;
    }
    untilNextDot = distance - length;
  }
  graphics.fill(color);

  if (arrowSize <= 0 || points.length < 2) return;

  const tip = points[points.length - 1];
  const before = points[points.length - 2];
  const length = Math.hypot(tip.x - before.x, tip.y - before.y);
  const dirX = (tip.x - before.x) / length;
  const dirY = (tip.y - before.y) / length;
  const baseX = tip.x - dirX * arrowSize;
  const baseY = tip.y - dirY * arrowSize;
  const spread = arrowSize * 0.8;

  graphics
    .moveTo(baseX - dirY * spread, baseY + dirX * spread)
    .lineTo(tip.x, tip.y)
    .lineTo(baseX + dirY * spread, baseY - dirX * spread)
    .stroke({ color, width: dotRadius * 2, cap: 'round', join: 'round' });
}
