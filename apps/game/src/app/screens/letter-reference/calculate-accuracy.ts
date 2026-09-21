// given StrokePoint[] and a glyph mask, calculate the % of points within the glyph

import type { GraphicsContext } from 'pixi.js';

import type { StrokePoint } from '../../ui/drawing-canvas';

export function calculateGlyphStrokeAccuracy(
  points: StrokePoint[],
  glyphMaskContext: GraphicsContext,
): number {
  const total: number = points.length;
  if (total === 0) return 0;
  let contained = 0;
  points.forEach((point) => {
    if (glyphMaskContext.containsPoint(point)) contained++;
  });
  return (contained * 100) / total;
}

// a grid of points over the glyph's bounds, keeping those inside the letter (dots in, holes out)
export function sampleGlyphInterior(
  glyphMaskContext: GraphicsContext,
  step: number,
): StrokePoint[] {
  const { minX, minY, maxX, maxY } = glyphMaskContext.bounds;
  const samples: StrokePoint[] = [];
  for (let x = minX + step / 2; x < maxX; x += step) {
    for (let y = minY + step / 2; y < maxY; y += step) {
      if (glyphMaskContext.containsPoint({ x, y })) samples.push({ x, y });
    }
  }
  return samples;
}

// squared distance from p to the segment a→b: project p onto the line, clamped to the segment's ends
function distanceToSegmentSquared(p: StrokePoint, a: StrokePoint, b: StrokePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  const cx = a.x + t * dx - p.x;
  const cy = a.y + t * dy - p.y;
  return cx * cx + cy * cy;
}

// % of the glyph's interior samples within `radius` of any drawn stroke, all in glyph units.
// strokes stay separate so no segment joins the end of one to the start of the next
export function calculateGlyphCoverage(
  strokes: StrokePoint[][],
  samples: StrokePoint[],
  radius: number,
): number {
  const drawn = strokes.filter((stroke) => stroke.length > 0);
  if (samples.length === 0 || drawn.length === 0) return 0;

  const radiusSquared = radius * radius;
  const isCovered = (sample: StrokePoint) =>
    drawn.some((stroke) => {
      // a single-point stroke (a tap) is a segment from the point to itself
      if (stroke.length === 1)
        return distanceToSegmentSquared(sample, stroke[0], stroke[0]) <= radiusSquared;
      for (let i = 1; i < stroke.length; i++) {
        if (distanceToSegmentSquared(sample, stroke[i - 1], stroke[i]) <= radiusSquared)
          return true;
      }
      return false;
    });

  const covered = samples.filter(isCovered).length;
  return (covered * 100) / samples.length;
}
