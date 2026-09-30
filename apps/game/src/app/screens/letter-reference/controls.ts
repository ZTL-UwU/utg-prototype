import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

export const FRAME_COLOR = 0x844f01;
export const FRAME_SHADOW_COLOR = 0x5a3601;
export const LABEL_COLOR = 0xf3e3c6;
export const NAV_COLOR = 0x2f6f73;
export const NAV_SHADOW_COLOR = 0x1d4649;
/** The practice tools, warm so they stand apart from the teal letter steps. */
export const TOOL_COLOR = 0xc98144;
export const TOOL_SHADOW_COLOR = 0x8a5424;
/** Unselected tiles: a shade lighter than the background, edged in a pale brown. */
export const TILE_COLOR = 0xfffaf0;
export const TILE_EDGE_COLOR = 0xd9c49e;
export const TILE_TEXT_COLOR = FRAME_SHADOW_COLOR;
const DISABLED_COLOR = 0xa39a8c;
const DISABLED_SHADOW_COLOR = 0x6f685e;
const SHADOW_OFFSET = 8;
const BUTTON_ANIMATIONS = {
  hover: { props: { scale: { x: 1.06, y: 1.06 } }, duration: 100 },
  pressed: { props: { scale: { x: 0.94, y: 0.94 } }, duration: 80 },
};

/** The tiles the forms are shown on. */
export const TILE_WIDTH = 150;
/** Shadow included. */
export const TILE_HEIGHT = 124;
export const TILE_GAP = 16;
export const TILE_RADIUS = 20;
export const TILE_SHADOW = 6;
export const TILE_CAPTION_SIZE = 22;
/** Around a tile's picture and caption. */
export const TILE_PAD = 12;
export const TILE_HOVER_SCALE = 1.03;
/** Seconds a hovered control takes to grow or shrink back. */
const HOVER_DURATION = 0.12;

/** Draws an icon in `color`, centred on the origin, sized to a button `size` across. */
export type IconPainter = (g: Graphics, size: number, color: number) => void;

export const playIcon: IconPainter = (g, size, color) => {
  const s = size * 0.2;
  // nudged right, so the triangle's weight rather than its box sits in the middle
  g.poly([-s * 0.7, -s, s * 1.1, 0, -s * 0.7, s])
    .fill(color)
    .stroke({ width: size * 0.06, color, join: 'round' });
};

export const retryIcon: IconPainter = (g, size, color) => {
  const r = size * 0.2;
  const width = size * 0.07;
  // most of the way round clockwise, from just right of the top to the top, where the arrow is
  g.arc(0, 0, r, -Math.PI * 0.1, Math.PI * 1.5).stroke({ width, color, cap: 'round' });
  const head = size * 0.1;
  g.poly([head, -r, -head * 0.3, -r - head, -head * 0.3, -r + head])
    .fill(color)
    .stroke({ width: width * 0.5, color, join: 'round' });
};

export function chevronIcon(pointLeft: boolean): IconPainter {
  return (g, size, color) => {
    const s = size * 0.16;
    const d = pointLeft ? 1 : -1;
    g.moveTo(s * 0.5 * d, -s)
      .lineTo(-s * 0.5 * d, 0)
      .lineTo(s * 0.5 * d, s)
      .stroke({ width: size * 0.09, color, cap: 'round', join: 'round' });
  };
}

function createCircleView(size: number, color: number, shadowColor: number, icon: IconPainter) {
  const r = size / 2;
  const view = new Graphics()
    .circle(r, r + SHADOW_OFFSET, r)
    .fill(shadowColor)
    .circle(r, r, r)
    .fill(color);
  const glyph = new Graphics({ position: { x: r, y: r } });
  icon(glyph, size, LABEL_COLOR);
  view.addChild(glyph);
  return view;
}

/** A round button showing an icon; positioned by its centre. */
export function createIconButton({
  size,
  icon,
  onPress,
  color = NAV_COLOR,
  shadowColor = NAV_SHADOW_COLOR,
}: {
  size: number;
  icon: IconPainter;
  onPress: () => void;
  color?: number;
  shadowColor?: number;
}) {
  const button = new FancyButton({
    defaultView: createCircleView(size, color, shadowColor, icon),
    disabledView: createCircleView(size, DISABLED_COLOR, DISABLED_SHADOW_COLOR, icon),
    animations: BUTTON_ANIMATIONS,
    anchor: 0.5,
  });
  button.onPress.connect(onPress);
  return button;
}

/** A point `distance` along a rounded rectangle's edge, clockwise from the top left corner's end. */
function pointOnRoundRect(w: number, h: number, r: number, distance: number): [number, number] {
  const arc = (Math.PI / 2) * r;
  const edges: [number, (t: number) => [number, number]][] = [
    [w - 2 * r, (t) => [r + t, 0]],
    [arc, (t) => corner(w - r, r, -Math.PI / 2 + t / r)],
    [h - 2 * r, (t) => [w, r + t]],
    [arc, (t) => corner(w - r, h - r, t / r)],
    [w - 2 * r, (t) => [w - r - t, h]],
    [arc, (t) => corner(r, h - r, Math.PI / 2 + t / r)],
    [h - 2 * r, (t) => [0, h - r - t]],
    [arc, (t) => corner(r, r, Math.PI + t / r)],
  ];
  function corner(cx: number, cy: number, angle: number): [number, number] {
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  }
  for (const [length, at] of edges) {
    if (distance <= length) return at(distance);
    distance -= length;
  }
  return [r, 0];
}

/** Strokes a dashed rounded rectangle, for a slot that's there but can't be used. */
export function strokeDashedRoundRect(
  g: Graphics,
  w: number,
  h: number,
  r: number,
  style: { width: number; color: number; dash: number; gap: number },
) {
  const perimeter = 2 * (w + h - 4 * r) + 2 * Math.PI * r;
  // spread the leftover evenly, so the dashes meet up where the outline closes
  const count = Math.max(1, Math.round(perimeter / (style.dash + style.gap)));
  const pitch = perimeter / count;
  const dash = pitch * (style.dash / (style.dash + style.gap));
  const step = 4;
  for (let i = 0; i < count; i++) {
    const start = i * pitch;
    g.moveTo(...pointOnRoundRect(w, h, r, start));
    for (let d = start + step; d < start + dash; d += step) {
      g.lineTo(...pointOnRoundRect(w, h, r, d));
    }
    g.lineTo(...pointOnRoundRect(w, h, r, start + dash));
  }
  g.stroke({ width: style.width, color: style.color, cap: 'round', join: 'round' });
}

/** Grows while hovered; drawn about its centre, so it grows in place. */
export function addHover(target: Container, scale: number) {
  let animation: AnimationPlaybackControls | undefined;
  const to = (value: number) => {
    animation?.stop();
    // from the current scale: motion would otherwise start from the last value it set itself
    const from = target.scale.x;
    animation = animate(
      target.scale,
      { x: [from, value], y: [from, value] },
      { duration: HOVER_DURATION, ease: 'easeOut' },
    );
  };
  target.on('pointerover', () => to(scale));
  target.on('pointerout', () => to(1));
  /** Snaps back to size, for a target that stops taking input and so never hears the pointer leave. */
  return () => {
    animation?.stop();
    target.scale.set(1);
  };
}

/** A tile `w` by `h`, shadow included, with its top left at the origin; `edge` outlines it. */
export function drawTile(
  g: Graphics,
  w: number,
  h: number,
  { fill, shadow, edge }: { fill: number; shadow: number; edge?: number },
) {
  g.roundRect(0, TILE_SHADOW, w, h - TILE_SHADOW, TILE_RADIUS)
    .fill(shadow)
    .roundRect(0, 0, w, h - TILE_SHADOW, TILE_RADIUS)
    .fill(fill);
  if (edge !== undefined) {
    g.roundRect(0, 0, w, h - TILE_SHADOW, TILE_RADIUS).stroke({ width: 3, color: edge });
  }
  return g;
}

export function createTileCaption(text: string) {
  return new Text({
    text,
    anchor: 0.5,
    resolution: 2,
    style: { fontFamily: 'Concert One', fontSize: TILE_CAPTION_SIZE },
  });
}

/** Centre of a tile's caption, below its picture. */
export const TILE_CAPTION_Y = TILE_HEIGHT - TILE_SHADOW - TILE_PAD - TILE_CAPTION_SIZE / 2;
