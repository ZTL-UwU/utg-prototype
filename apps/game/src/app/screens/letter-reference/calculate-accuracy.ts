// scores a drawing against the pen paths a letter is written in: each drawn stroke is paired with
// the reference stroke it best follows, compared point by point in the direction it's written, and
// the pairs are weighed by length against everything drawn, so strokes left out, extra marks, a
// wrong direction and a wrong order all cost accuracy

import type { StrokePoint } from '../../ui/drawing-canvas';

/** Points each stroke is resampled to, evenly spaced along its length, before comparing. */
const RESAMPLE_POINTS = 32;
/**
 * Average distance, in glyph units, a drawn stroke may stray from its reference and still score
 * full marks, and the distance at which it scores nothing. A letter's body is about 2.4 units thick.
 */
const FULL_MARKS_DISTANCE = 0.9;
const NO_MARKS_DISTANCE = 4.5;
/**
 * How much longer than its reference, in glyph units, a drawn stroke may run before it loses
 * marks, so going back and forth over a stroke doesn't pass for drawing it once. Measured after
 * resampling, which smooths out a shaky hand.
 */
const OVERDRAW_SLACK = 3;
/** Share of a stroke's score kept when it follows the right path, but the wrong way round. */
const REVERSED_CREDIT = 0.4;
/**
 * Share of the whole score kept for each stroke drawn out of turn, so drawing a dot before the body
 * costs as much as a badly drawn body would, however small the dot.
 */
const ORDER_CREDIT = 0.7;
/**
 * The least a reference stroke weighs, in glyph units of length, so a dot (about 2.7 long) still
 * counts for something next to a body ten times its length.
 */
const MIN_STROKE_WEIGHT = 8;
/** The least a stray mark weighs, so a tap off the letter costs about what a dot is worth. */
const MIN_STRAY_WEIGHT = 3;
/** How many of the drawn strokes that best match a reference stroke are tried against it. */
const MAX_CANDIDATES = 4;

/** Parses a reference stroke's centerline, which is only ever `M` then `L`s, into its points. */
export function parseStrokePath(d: string): StrokePoint[] {
  const numbers = d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi)?.map(Number) ?? [];
  const points: StrokePoint[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] });
  return points;
}

function pathLength(points: StrokePoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return length;
}

// `count` points spaced evenly along the path, so how fast it was drawn doesn't matter
function resample(points: StrokePoint[], count: number): StrokePoint[] {
  const length = pathLength(points);
  // a tap, or a stroke that never moved
  if (length === 0) return Array.from({ length: count }, () => ({ ...points[0] }));

  const spacing = length / (count - 1);
  const samples: StrokePoint[] = [{ ...points[0] }];
  let segment = 1;
  let segmentStart = 0;
  for (let i = 1; i < count - 1; i++) {
    const target = i * spacing;
    let segmentLength = Math.hypot(
      points[segment].x - points[segment - 1].x,
      points[segment].y - points[segment - 1].y,
    );
    while (segmentStart + segmentLength < target && segment < points.length - 1) {
      segmentStart += segmentLength;
      segment++;
      segmentLength = Math.hypot(
        points[segment].x - points[segment - 1].x,
        points[segment].y - points[segment - 1].y,
      );
    }
    const t = segmentLength === 0 ? 0 : (target - segmentStart) / segmentLength;
    const a = points[segment - 1];
    const b = points[segment];
    samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  samples.push({ ...points[points.length - 1] });
  return samples;
}

/**
 * Average distance between two strokes, pairing their points in order from start to end but
 * letting either run ahead of the other (dynamic time warping), so an uneven hand isn't punished.
 * Both have to start together and end together, so a stroke drawn backwards is far from its path.
 */
function strokeDistance(a: StrokePoint[], b: StrokePoint[]): number {
  const n = a.length;
  const m = b.length;
  // the cheapest alignment of a[0..i] with b[0..j], and how many pairs it took
  const cost = new Float64Array(n * m);
  const steps = new Uint16Array(n * m);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y);
      let best = -1;
      if (i > 0 && j > 0) best = (i - 1) * m + (j - 1);
      if (i > 0 && (best < 0 || cost[(i - 1) * m + j] < cost[best])) best = (i - 1) * m + j;
      if (j > 0 && (best < 0 || cost[i * m + j - 1] < cost[best])) best = i * m + j - 1;
      cost[i * m + j] = d + (best < 0 ? 0 : cost[best]);
      steps[i * m + j] = 1 + (best < 0 ? 0 : steps[best]);
    }
  }
  return cost[n * m - 1] / steps[n * m - 1];
}

// 1 within FULL_MARKS_DISTANCE of the path, falling off to 0 at NO_MARKS_DISTANCE
function closeness(distance: number): number {
  const score = (NO_MARKS_DISTANCE - distance) / (NO_MARKS_DISTANCE - FULL_MARKS_DISTANCE);
  return Math.min(1, Math.max(0, score));
}

/** How well a drawn stroke follows a reference stroke, from 0 to 1, both already resampled. */
function strokeScore(reference: StrokePoint[], drawn: StrokePoint[]): number {
  const forwards = closeness(strokeDistance(reference, drawn));
  const backwards = closeness(strokeDistance(reference, drawn.toReversed()));
  const referenceLength = pathLength(reference);
  const overdrawn = Math.max(0, pathLength(drawn) - referenceLength - OVERDRAW_SLACK);
  const lengthScore = overdrawn === 0 ? 1 : referenceLength / (referenceLength + overdrawn);
  return Math.max(forwards, backwards * REVERSED_CREDIT) * lengthScore;
}

// how many of the matches, in reference order, were drawn out of turn: all but the longest run of
// drawn indices that only goes up
function countOutOfOrder(drawnIndices: number[]): number {
  const runLength = drawnIndices.map(() => 1);
  for (let i = 0; i < drawnIndices.length; i++) {
    for (let j = 0; j < i; j++) {
      if (drawnIndices[j] < drawnIndices[i])
        runLength[i] = Math.max(runLength[i], runLength[j] + 1);
    }
  }
  return drawnIndices.length - Math.max(0, ...runLength);
}

/**
 * Accuracy of a drawing, from 0 to 100: how closely its strokes follow the letter's reference
 * strokes, in shape, place, direction and order, less anything drawn that isn't part of the letter.
 * Both are in glyph units, and each reference stroke runs the way it's meant to be written.
 */
export function calculateDrawingAccuracy(
  drawn: StrokePoint[][],
  reference: StrokePoint[][],
): number {
  const drawnStrokes = drawn.filter((stroke) => stroke.length > 0);
  const referenceStrokes = reference.filter((stroke) => stroke.length > 0);
  if (drawnStrokes.length === 0 || referenceStrokes.length === 0) return 0;

  const referenceWeights = referenceStrokes.map((stroke) =>
    Math.max(MIN_STROKE_WEIGHT, pathLength(stroke)),
  );
  const drawnWeights = drawnStrokes.map((stroke) => Math.max(MIN_STRAY_WEIGHT, pathLength(stroke)));
  const referenceSamples = referenceStrokes.map((stroke) => resample(stroke, RESAMPLE_POINTS));
  const drawnSamples = drawnStrokes.map((stroke) => resample(stroke, RESAMPLE_POINTS));
  const scores = referenceSamples.map((ref) => drawnSamples.map((d) => strokeScore(ref, d)));

  // each reference stroke only tries the drawn strokes that follow it best, or none at all
  const candidates = scores.map((row) =>
    row
      .map((score, index) => ({ score, index }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES)
      .map(({ index }) => index),
  );

  const referenceTotal = referenceWeights.reduce((sum, weight) => sum + weight, 0);

  // the pairing of reference strokes to drawn strokes that scores best; each drawn stroke is used
  // at most once, and those paired with nothing are marks that aren't part of the letter. picked on
  // how the strokes are drawn alone, so leaving one out can't dodge the cost of drawing it out of turn
  let best = 0;
  let bestPairing: number[] = [];
  const pairing: number[] = [];
  const used = new Set<number>();
  const search = (r: number) => {
    if (r === referenceStrokes.length) {
      const earned = pairing.reduce(
        (sum, d, ref) => (d < 0 ? sum : sum + referenceWeights[ref] * scores[ref][d]),
        0,
      );
      const stray = drawnWeights.reduce((sum, weight, d) => (used.has(d) ? sum : sum + weight), 0);
      const score = earned / (referenceTotal + stray);
      if (score > best) {
        best = score;
        bestPairing = [...pairing];
      }
      return;
    }
    for (const d of candidates[r]) {
      if (used.has(d)) continue;
      used.add(d);
      pairing.push(d);
      search(r + 1);
      pairing.pop();
      used.delete(d);
    }
    pairing.push(-1);
    search(r + 1);
    pairing.pop();
  };
  search(0);
  return best * ORDER_CREDIT ** countOutOfOrder(bestPairing.filter((d) => d >= 0)) * 100;
}
