// Fits each form's hand-drawn stroke path (`pathString`, drawn in its own 0,0 frame) onto its
// outline (`svgString`, in artboard coordinates) and bakes the result into `strokePath`.
//
// The fit is a uniform scale + offset, chosen so as many path sample points as possible land
// inside the glyph. `pathString` is left untouched, so this can be rerun whenever paths change.
//
// Usage: node apps/game/scripts/fit-letter-paths.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const JSON_PATH = fileURLToPath(
  new URL('../src/app/screens/letter-reference/letters.json', import.meta.url),
);
const CURVE_STEP = 0.05;
const WARN_BELOW = 0.98;
// a slight preference for larger fits, so the path does not shrink into the fattest region
const SIZE_BIAS = 0.02;

/** Parses the absolute M/L/H/C/Z subset used by the letter SVGs. */
function parsePath(d) {
  const commands = [];
  for (const [, op, args] of d.matchAll(/([MLHCZ])([^MLHCZ]*)/gi)) {
    if (op !== op.toUpperCase()) throw new Error(`Relative command '${op}' is not supported`);
    const nums = (args.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    const arity = { M: 2, L: 2, H: 1, C: 6, Z: 0 }[op];
    if (arity === 0) {
      commands.push({ op, nums: [] });
      continue;
    }
    for (let i = 0; i < nums.length; i += arity) {
      // extra coordinate pairs after M are implicit L
      const repeatOp = op === 'M' && i > 0 ? 'L' : op;
      commands.push({ op: repeatOp, nums: nums.slice(i, i + arity) });
    }
  }
  return commands;
}

/** Flattens commands to one polyline per subpath. */
function toPolylines(commands) {
  const polylines = [];
  let current;
  let x = 0;
  let y = 0;
  for (const { op, nums } of commands) {
    if (op === 'M') {
      [x, y] = nums;
      current = [[x, y]];
      polylines.push(current);
    } else if (op === 'L') {
      [x, y] = nums;
      current.push([x, y]);
    } else if (op === 'H') {
      [x] = nums;
      current.push([x, y]);
    } else if (op === 'C') {
      const [x1, y1, x2, y2, x3, y3] = nums;
      for (let t = CURVE_STEP; t <= 1 + 1e-9; t += CURVE_STEP) {
        const u = 1 - t;
        current.push([
          u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
      [x, y] = [x3, y3];
    } else if (op === 'Z') {
      current.push(current[0]);
      [x, y] = current[0];
    }
  }
  return polylines;
}

function transformPath(commands, scale, tx, ty) {
  const fmt = (n) => String(Math.round(n * 100) / 100);
  return commands
    .map(({ op, nums }) => {
      if (op === 'H') return `H${fmt(nums[0] * scale + tx)}`;
      const mapped = nums.map((n, i) => fmt(n * scale + (i % 2 === 0 ? tx : ty)));
      return op + mapped.join(' ');
    })
    .join('');
}

function extractDs(svg) {
  return [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
}

function bounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Even-odd test against every outline contour, so counters (holes) count as outside. */
function isInside([px, py], polygons) {
  let inside = false;
  for (const poly of polygons) {
    for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
      const [xi, yi] = poly[i];
      const [xk, yk] = poly[k];
      if (yi > py !== yk > py && px < ((xk - xi) * (py - yi)) / (yk - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function fitPath(outlinePolygons, pathPoints) {
  const ob = bounds(outlinePolygons.flat());
  const pb = bounds(pathPoints);
  const baseScale = Math.min(ob.w / pb.w, ob.h / pb.h);
  const pcx = pb.x + pb.w / 2;
  const pcy = pb.y + pb.h / 2;

  const evaluate = (f, dx, dy) => {
    const scale = baseScale * f;
    const cx = ob.x + ob.w / 2 + dx * ob.w;
    const cy = ob.y + ob.h / 2 + dy * ob.h;
    const tx = cx - scale * pcx;
    const ty = cy - scale * pcy;
    let hits = 0;
    for (const [x, y] of pathPoints) {
      if (isInside([x * scale + tx, y * scale + ty], outlinePolygons)) hits++;
    }
    const inside = hits / pathPoints.length;
    return { score: inside + SIZE_BIAS * f, inside, f, dx, dy, scale, tx, ty };
  };

  const search = (fRange, dRange, fStep, dStep, best) => {
    for (let f = fRange[0]; f <= fRange[1] + 1e-9; f += fStep) {
      for (let dx = dRange[0][0]; dx <= dRange[0][1] + 1e-9; dx += dStep) {
        for (let dy = dRange[1][0]; dy <= dRange[1][1] + 1e-9; dy += dStep) {
          const result = evaluate(f, dx, dy);
          if (!best || result.score > best.score) best = result;
        }
      }
    }
    return best;
  };

  const coarse = search(
    [0.6, 1.3],
    [
      [-0.2, 0.2],
      [-0.2, 0.2],
    ],
    0.05,
    0.025,
  );
  return search(
    [coarse.f - 0.05, coarse.f + 0.05],
    [
      [coarse.dx - 0.025, coarse.dx + 0.025],
      [coarse.dy - 0.025, coarse.dy + 0.025],
    ],
    0.01,
    0.005,
    coarse,
  );
}

const letters = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
let fitted = 0;
for (const [letter, forms] of Object.entries(letters)) {
  for (const [form, entry] of Object.entries(forms)) {
    if (!entry.pathString) continue;

    const outlinePolygons = extractDs(entry.svgString).flatMap((d) => toPolylines(parsePath(d)));
    const pathCommands = extractDs(entry.pathString).flatMap(parsePath);
    const pathPoints = toPolylines(pathCommands).flat();

    const fit = fitPath(outlinePolygons, pathPoints);
    entry.strokePath = transformPath(pathCommands, fit.scale, fit.tx, fit.ty);
    fitted++;

    const pct = `${(fit.inside * 100).toFixed(0)}%`.padStart(4);
    const warn = fit.inside < WARN_BELOW ? '  WARN: path strays outside the glyph' : '';
    console.log(`${`${letter} ${form}`.padEnd(14)} ${pct} inside  (x${fit.f.toFixed(2)})${warn}`);
  }
}

writeFileSync(JSON_PATH, `${JSON.stringify(letters, null, 2)}\n`);
console.log(`\nBaked strokePath for ${fitted} forms into ${JSON_PATH}`);
