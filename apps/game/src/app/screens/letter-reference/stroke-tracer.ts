import { animate } from 'motion';
import { Graphics, GraphicsPath, Polygon } from 'pixi.js';

/**
 * Stroke width in outline units. 6 reaches every point of every glyph interior (most need 4–5),
 * so the trace fills the whole letter; the glyph mask clips whatever spills past the outline.
 */
const TRACE_WIDTH = 5.5;
const TRACE_COLOR = 0x844f01;
/** Outline units drawn per second, clamped so short and long letters both read well. */
const TRACE_SPEED = 25;
const MIN_DURATION = 1.5;
const MAX_DURATION = 4;
/** Pause between strokes, as a fraction of the total length, so each reads as a pen-lift. */
const STROKE_GAP = 0.08;

type Stroke = {
  points: [number, number][];
  /** Distance along the stroke at each point. */
  cumulative: number[];
  length: number;
};

function toStroke(polygon: Polygon): Stroke {
  const points: [number, number][] = [];
  for (let i = 0; i < polygon.points.length; i += 2) {
    points.push([polygon.points[i], polygon.points[i + 1]]);
  }
  if (polygon.closePath && points.length > 1) points.push(points[0]);

  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    cumulative.push(cumulative[i - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1] };
}

/**
 * Animates a pen stroke along an SVG path, one subpath after another, in the order and
 * direction they were drawn. The path must already be in the coordinates of whatever it traces.
 */
export class StrokeTracer extends Graphics {
  private strokes: Stroke[] = [];
  private gap = 0;
  private animation?: { stop: () => void };

  get hasPath() {
    return this.strokes.length > 0;
  }

  /** True from `play()` until the next reset, whether the trace is still animating or done. */
  get hasTrace() {
    return this.animation !== undefined;
  }

  setPath(d: string | undefined) {
    this.reset();
    this.strokes = d
      ? new GraphicsPath(d).shapePath.shapePrimitives
          .map(({ shape }) => shape)
          .filter((shape): shape is Polygon => shape instanceof Polygon)
          .map(toStroke)
          .filter((stroke) => stroke.length > 0)
      : [];
    const total = this.strokes.reduce((sum, stroke) => sum + stroke.length, 0);
    this.gap = total * STROKE_GAP;
  }

  play() {
    if (!this.hasPath) return;
    this.reset();

    const total = this.strokes.reduce((sum, stroke) => sum + stroke.length, 0);
    const end = total + this.gap * (this.strokes.length - 1);
    const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, total / TRACE_SPEED));
    this.animation = animate(0, end, {
      duration,
      ease: 'linear',
      onUpdate: (progress) => this.drawUpTo(progress),
    });
  }

  reset() {
    this.animation?.stop();
    this.animation = undefined;
    this.clear();
  }

  private drawUpTo(progress: number) {
    this.clear();
    let remaining = progress;
    for (const stroke of this.strokes) {
      if (remaining <= 0) break;
      this.drawStroke(stroke, Math.min(remaining, stroke.length));
      remaining -= stroke.length + this.gap;
    }
    this.stroke({ width: TRACE_WIDTH, color: TRACE_COLOR, cap: 'round', join: 'round' });
  }

  /** Adds the first `distance` units of the stroke to the current path. */
  private drawStroke({ points, cumulative }: Stroke, distance: number) {
    this.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      if (cumulative[i] <= distance) {
        this.lineTo(points[i][0], points[i][1]);
        continue;
      }
      // partial final segment, interpolated to the exact distance
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const t = (distance - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1]);
      this.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      return;
    }
  }
}
