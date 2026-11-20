import { GraphicsContext, GraphicsPath, Polygon } from 'pixi.js';

/** One outer contour of a glyph, a body or a dot, with the holes of any loops inside it. */
export type GlyphPart = { d: string; holes?: string[] };

/** The polygons an SVG path made of straight lines (M, L, Z) traces. */
export function pathPolygons(d: string): Polygon[] {
  return new GraphicsPath(d).shapePath.shapePrimitives
    .map(({ shape }) => shape)
    .filter((shape): shape is Polygon => shape instanceof Polygon);
}

/** A path's closed areas: polygons of at least three corners. */
function polygons(d: string) {
  return pathPolygons(d).filter((shape) => shape.points.length >= 6);
}

/** Every number in a straight-line SVG path, in order: x then y for each corner. */
export function parsePathNumbers(d: string): number[] {
  return d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi)?.map(Number) ?? [];
}

/** Builds the filled interior of the given parts of a glyph, with their holes cut out. */
export function createGlyphMaskContext(parts: GlyphPart[]): GraphicsContext {
  const context = new GraphicsContext();
  for (const { d, holes = [] } of parts) {
    for (const outline of polygons(d)) context.poly(outline.points, true).fill(0xffffff);
    // `cut` applies to the fill just before it, so each part's holes follow it directly
    for (const hole of holes.flatMap(polygons)) context.poly(hole.points, true).cut();
  }
  return context;
}
