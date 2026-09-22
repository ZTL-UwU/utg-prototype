import { animate, cubicBezier } from 'motion';
import { Container, Graphics, GraphicsContext, GraphicsPath, Polygon, Text } from 'pixi.js';

const INK_COLOR = 0x844f01;
/** Teal, like the nav buttons, so the pen and stroke numbers stand apart from the ink. */
const ACCENT_COLOR = 0x2f6f73;
const BADGE_TEXT_COLOR = 0xffffff;
/** Outline units drawn per second, so long strokes take longer than dots. */
const TRACE_SPEED = 18;
/** Seconds: the shortest a stroke may take, the wait before the first, and each pen-lift. */
const MIN_STROKE = 0.35;
const LEAD_IN = 0.2;
const PEN_LIFT = 0.35;
/** Seconds a stroke's badge fades in ahead of it, and its pen dot lingers after. */
const BADGE_FADE = 0.3;
const NIB_FADE = 0.2;
/** Each stroke eases in and out, like a pen setting off and slowing to a stop. */
const STROKE_EASE = cubicBezier(0.45, 0.05, 0.55, 0.95);
/** Sizes in outline units. */
const NIB_RADIUS = 0.5;
const BADGE_RADIUS = 0.8;
/** How far before a stroke's start its badge sits, back along the way the pen sets off. */
const BADGE_GAP = 2.4;
/** Badge digits are rendered large and scaled down, so they stay sharp once the glyph scales up. */
const BADGE_FONT_SIZE = 48;
const BADGE_TEXT_SIZE = 1;

export type TraceStroke = {
  /** Pen centerline, in the coordinates of whatever it traces. */
  d: string;
  width: number;
  /** The part of the glyph this stroke inks; the thick pen is clipped to it. */
  clip: GraphicsContext;
  /** Where its number badge goes; defaults to just before the stroke's start. */
  label?: [number, number];
};

type Polyline = {
  points: [number, number][];
  /** Distance along the polyline at each point. */
  cumulative: number[];
  length: number;
};

type TimedStroke = {
  polylines: Polyline[];
  length: number;
  width: number;
  ink: Graphics;
  badge: Container;
  start: number;
  end: number;
  /** Distance drawn so far, so finished strokes aren't redrawn every frame. */
  drawn: number;
};

function toPolyline(polygon: Polygon): Polyline {
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

/** The point `distance` along the polyline, and the index of the first point past it. */
function pointAt({ points, cumulative }: Polyline, distance: number) {
  for (let i = 1; i < points.length; i++) {
    if (cumulative[i] < distance) continue;
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const span = cumulative[i] - cumulative[i - 1];
    const t = span === 0 ? 0 : (distance - cumulative[i - 1]) / span;
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, index: i };
  }
  const [x, y] = points[points.length - 1];
  return { x, y, index: points.length };
}

// back off from the start, against the direction the pen sets off in
function defaultBadgePosition(polyline: Polyline): [number, number] {
  const [sx, sy] = polyline.points[0];
  const ahead = pointAt(polyline, Math.min(polyline.length, BADGE_GAP / 2));
  const dx = ahead.x - sx;
  const dy = ahead.y - sy;
  const k = BADGE_GAP / (Math.hypot(dx, dy) || 1);
  return [sx - dx * k, sy - dy * k];
}

function createBadge(number: number, [x, y]: [number, number]) {
  const text = new Text({
    text: String(number),
    resolution: 2,
    anchor: 0.5,
    style: {
      fontFamily: 'Concert One',
      fontSize: BADGE_FONT_SIZE,
      fill: BADGE_TEXT_COLOR,
    },
  });
  text.scale.set(BADGE_TEXT_SIZE / BADGE_FONT_SIZE);
  return new Container({
    position: { x, y },
    alpha: 0,
    children: [new Graphics().circle(0, 0, BADGE_RADIUS).fill(ACCENT_COLOR), text],
  });
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Animates the strokes of a letter in order: each one numbered, inked by a pen that eases along
 * its centerline and clipped to the part of the glyph it belongs to, with a pause between them
 * like a pen-lift.
 */
export class StrokeTracer extends Container {
  private strokes: TimedStroke[] = [];
  private duration = 0;
  private nib = new Graphics().circle(0, 0, NIB_RADIUS).fill(ACCENT_COLOR);
  private animation?: { stop: () => void };

  get hasPath() {
    return this.strokes.length > 0;
  }

  /** True from `play()` until the next reset, whether the trace is still animating or done. */
  get hasTrace() {
    return this.animation !== undefined;
  }

  setStrokes(strokes: TraceStroke[]) {
    this.reset();
    for (const child of this.removeChildren()) {
      // masks don't own the clip contexts they were handed, so those survive for reuse
      if (child !== this.nib) child.destroy({ children: true });
    }
    this.strokes = [];

    let time = LEAD_IN;
    const badges: Container[] = [];
    for (const { d, width, clip, label } of strokes) {
      const polylines = new GraphicsPath(d).shapePath.shapePrimitives
        .map(({ shape }) => shape)
        .filter((shape): shape is Polygon => shape instanceof Polygon)
        .map(toPolyline)
        .filter((polyline) => polyline.length > 0);
      if (polylines.length === 0) continue;

      const length = polylines.reduce((sum, polyline) => sum + polyline.length, 0);
      const duration = Math.max(MIN_STROKE, length / TRACE_SPEED);
      // each stroke gets its own clip, so its wide pen can't spill onto the dots and vice versa
      const mask = new Graphics(clip);
      const ink = new Graphics();
      ink.mask = mask;
      const badge = createBadge(
        this.strokes.length + 1,
        label ?? defaultBadgePosition(polylines[0]),
      );
      this.addChild(mask, ink);
      badges.push(badge);
      this.strokes.push({
        polylines,
        length,
        width,
        ink,
        badge,
        start: time,
        end: time + duration,
        drawn: 0,
      });
      time += duration + PEN_LIFT;
    }
    this.duration = time - PEN_LIFT + NIB_FADE;
    // badges and the pen ride above every stroke's ink
    this.addChild(...badges, this.nib);
    this.nib.visible = false;
  }

  play() {
    if (!this.hasPath) return;
    this.reset();
    this.animation = animate(0, this.duration, {
      duration: this.duration,
      ease: 'linear',
      onUpdate: (time) => this.drawAt(time),
    });
  }

  reset() {
    this.animation?.stop();
    this.animation = undefined;
    for (const stroke of this.strokes) {
      stroke.ink.clear();
      stroke.drawn = 0;
      stroke.badge.alpha = 0;
    }
    this.nib.visible = false;
  }

  private drawAt(time: number) {
    this.nib.visible = false;
    for (const stroke of this.strokes) {
      const { start, end, length } = stroke;
      stroke.badge.alpha = clamp01((time - start + BADGE_FADE) / BADGE_FADE);

      const distance = length * STROKE_EASE(clamp01((time - start) / (end - start)));
      if (distance !== stroke.drawn) {
        stroke.drawn = distance;
        this.drawStroke(stroke, distance);
      }

      // the pen shows while its stroke is drawn, and lingers a moment at the end
      if (time >= start && time <= end + NIB_FADE) {
        const tip = this.tipAt(stroke, distance);
        this.nib.visible = true;
        this.nib.position.set(tip.x, tip.y);
        this.nib.alpha = time <= end ? 1 : 1 - (time - end) / NIB_FADE;
      }
    }
  }

  /** Where the pen is `distance` into the stroke, carried from one polyline to the next. */
  private tipAt({ polylines }: TimedStroke, distance: number) {
    let remaining = distance;
    for (const polyline of polylines) {
      if (remaining <= polyline.length) return pointAt(polyline, remaining);
      remaining -= polyline.length;
    }
    return pointAt(polylines[polylines.length - 1], Infinity);
  }

  /** Redraws the first `distance` units of the stroke. */
  private drawStroke({ polylines, ink, width }: TimedStroke, distance: number) {
    ink.clear();
    let remaining = distance;
    for (const polyline of polylines) {
      if (remaining <= 0) break;
      const { points } = polyline;
      const tip = pointAt(polyline, remaining);
      ink.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < tip.index; i++) ink.lineTo(points[i][0], points[i][1]);
      ink.lineTo(tip.x, tip.y);
      remaining -= polyline.length;
    }
    ink.stroke({ width, color: INK_COLOR, cap: 'round', join: 'round' });
  }
}
