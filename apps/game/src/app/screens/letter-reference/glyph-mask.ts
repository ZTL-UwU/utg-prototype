import { GraphicsContext, GraphicsPath, Polygon } from 'pixi.js';

/**
 * Builds the filled interior of an outline whose contours are all separate paths: bodies, dots
 * and the counters (holes) of loops alike. A contour nested inside an odd number of others is a
 * hole and gets cut from the contour directly around it.
 *
 * Pixi's own SVG parser only cuts holes within a single `<path>`, treating every subpath but the
 * largest as a hole, which would also cut away the dots.
 */
export function createGlyphMaskContext(pathDs: string[]): GraphicsContext {
  const contours = pathDs.flatMap((d) =>
    new GraphicsPath(d).shapePath.shapePrimitives
      .map(({ shape }) => shape)
      .filter((shape): shape is Polygon => shape instanceof Polygon && shape.points.length >= 6),
  );

  const containers = contours.map((contour, i) =>
    // assumes that contours never cross over each other
    contours.filter((other, j) => j !== i && other.contains(contour.points[0], contour.points[1])),
  );
  const depths = containers.map((list) => list.length);
  // the innermost container is the one nested deepest itself
  const parents = containers.map((list) =>
    list.reduce<Polygon | undefined>(
      (best, other) =>
        !best || depths[contours.indexOf(other)] > depths[contours.indexOf(best)] ? other : best,
      undefined,
    ),
  );

  const context = new GraphicsContext();
  contours.forEach((contour, i) => {
    if (depths[i] % 2 === 1) return;
    context.poly(contour.points, true).fill(0xffffff);
    // `cut` applies to the fill just before it, so each solid's holes follow it directly
    contours.forEach((hole, h) => {
      if (depths[h] % 2 === 1 && parents[h] === contour) context.poly(hole.points, true).cut();
    });
  });
  return context;
}
