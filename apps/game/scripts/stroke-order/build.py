"""Bakes letters.py into the letter reference screen's letters.json.

Every form of every letter is looked up in Noto Naskh Arabic and split into its body, marks and
dots, which get their strokes from letters.py: bodies and marks by glyph name, dots
automatically. Each stroke is a pen centerline the screen reveals in order, clipped to the part
of the glyph it inks. The guide paths in letters.py only need to be roughly right: each point is
pulled to the middle of its part, measured across the stroke.

Output is flipped to y-down and scaled so a letter's body is about 2.5 units thick, the scale the
screen's drawing and scoring constants are tuned for.

Needs fontTools (`pip install fonttools`) and the font. `--check` also renders each form fully
inked, with anything the strokes miss in red and each centerline drawn in, for tuning guides
(needs rsvg-convert).

Usage: python apps/game/scripts/stroke-order/build.py [--check] [--font path/to/font.ttf]
       then `vp check --fix` to format the JSON
"""
import json
import math
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

sys.dont_write_bytecode = True  # keep __pycache__ out of the repo

from fontTools.pens.basePen import BasePen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

from letters import BODIES, LETTERS, MARKS, RIGHT_JOINING

FONT = "/usr/share/fonts/noto/NotoNaskhArabic-Regular.ttf"
OUT = Path(__file__).parents[2] / "src/app/screens/letter-reference/letters.json"
FORMS = ["isolated", "initial", "medial", "final"]
FEATURES = {"initial": "init", "medial": "medi", "final": "fina"}
SCALE = 1 / 32
# Curves are flattened to lines about this long, in font units: Pixi divides curves by their
# length in local units, so at this scale it would leave them visibly faceted.
FLATTEN_STEP = 6
DOT_REACH = 30  # half the diagonal pull across a dot, in font units
DOT_WIDTH = 100
DOT_LABEL_GAP = 95  # how far out from the middle of its group a dot's badge sits
# A guide point is only centred where its part is at most this many pen widths across, so it
# isn't dragged into the middle of a junction.
SNAP_SPAN = 1.6
SMOOTHING = 2  # guide points averaged either side, after centring
# Points closer than this to the line through their neighbours are dropped from the output, in
# font units: well under a pixel on screen, but it keeps the JSON small.
SIMPLIFY = 1


def num(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def curve_point(points, t):
    """Point at t on a quadratic or cubic Bézier through `points`."""
    while len(points) > 1:
        points = [((1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1])
                  for a, b in zip(points, points[1:])]
    return points[0]


def flatten(points):
    """The curve through `points` (current point first) as line ends, start excluded."""
    hull = sum(math.dist(a, b) for a, b in zip(points, points[1:]))
    steps = max(2, math.ceil(hull / FLATTEN_STEP))
    return [curve_point(points, i / steps) for i in range(1, steps + 1)]


class PolygonPen(BasePen):
    """Collects each contour as a list of points, curves flattened."""

    def __init__(self):
        super().__init__(None)
        self.contours = []

    def _moveTo(self, pt):
        self.contours.append([pt])

    def _lineTo(self, pt):
        self.contours[-1].append(pt)

    def _qCurveToOne(self, pt1, pt2):
        self.contours[-1] += flatten([self._getCurrentPoint(), pt1, pt2])

    def _curveToOne(self, pt1, pt2, pt3):
        self.contours[-1] += flatten([self._getCurrentPoint(), pt1, pt2, pt3])


def path_points(d):
    """A one-subpath M/L/C path as a flattened list of points."""
    points = []
    for cmd, args in re.findall(r"([MLC])([^MLC]*)", d):
        nums = [float(n) for n in re.findall(r"-?[\d.]+", args)]
        pairs = list(zip(nums[0::2], nums[1::2]))
        if cmd == "C":
            for i in range(0, len(pairs), 3):
                points += flatten([points[-1], *pairs[i:i + 3]])
        else:
            # lines are split up too, so centring and smoothing see them as finely as curves
            for pair in pairs:
                points += flatten([points[-1], pair]) if points else [pair]
    return points


def edges(polygon):
    return zip(polygon, polygon[1:] + polygon[:1])


def area(polygon):
    """Signed; outer contours come out negative and holes positive."""
    return sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in edges(polygon)) / 2


def contains(polygon, point):
    x, y = point
    inside = False
    for (x0, y0), (x1, y1) in edges(polygon):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            inside = not inside
    return inside


def glyph_name(font, char, form):
    """The glyph for a letter's form: its presentation form, else the font's own substitution."""
    cmap = font.getBestCmap()
    if form == "isolated":
        return cmap[ord(char)]
    for cp in [*range(0xFB50, 0xFE00), *range(0xFE70, 0xFF00)]:
        if unicodedata.decomposition(chr(cp)) == f"<{form}> {ord(char):04X}" and cp in cmap:
            return cmap[cp]
    gsub = font["GSUB"].table
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag != FEATURES[form]:
            continue
        for index in record.Feature.LookupListIndex:
            for table in gsub.LookupList.Lookup[index].SubTable:
                mapped = getattr(table, "mapping", {}).get(cmap[ord(char)])
                if mapped:
                    return mapped if isinstance(mapped, str) else mapped[0]
    raise KeyError(f"no {form} glyph for {char}")


def components(font, name):
    """[(glyph name, x offset, y offset)]: a simple glyph is its own only component."""
    glyph = font["glyf"][name]
    if not glyph.isComposite():
        return [(name, 0, 0)]
    return [(c.glyphName, c.x, c.y) for c in glyph.components]


def component_contours(font, name, dx, dy):
    glyphs = font.getGlyphSet()
    rec = DecomposingRecordingPen(glyphs)
    glyphs[name].draw(rec)
    pen = PolygonPen()
    rec.replay(TransformPen(pen, (1, 0, 0, 1, dx, dy)))
    return pen.contours


def snap(points, part, width):
    """Pulls each guide point to the middle of the part, across the guide's direction."""
    part_edges = [edge for polygon in part for edge in edges(polygon)]
    centred = []
    for i, (px, py) in enumerate(points):
        (ax, ay), (bx, by) = points[max(0, i - 1)], points[min(len(points) - 1, i + 1)]
        length = math.hypot(bx - ax, by - ay) or 1
        nx, ny = (ay - by) / length, (bx - ax) / length
        # distances along the normal to where it crosses the part's edges; between each pair
        # of crossings is inside
        hits = []
        for (x0, y0), (x1, y1) in part_edges:
            ex, ey = x1 - x0, y1 - y0
            denom = nx * ey - ny * ex
            if denom == 0:
                continue
            if 0 <= ((x0 - px) * ny - (y0 - py) * nx) / denom < 1:
                hits.append(((x0 - px) * ey - (y0 - py) * ex) / denom)
        hits.sort()
        spans = list(zip(hits[0::2], hits[1::2]))
        span = next((s for s in spans if s[0] <= 0 <= s[1]), None)
        if span is None:
            # a guide point just off the glyph is pulled into the nearest bit of it
            span = min(spans, key=lambda s: min(abs(s[0]), abs(s[1])), default=None)
            if span and min(abs(span[0]), abs(span[1])) > width / 2:
                span = None
        if span and span[1] - span[0] <= width * SNAP_SPAN:
            mid = (span[0] + span[1]) / 2
            centred.append((px + nx * mid, py + ny * mid))
        else:
            centred.append((px, py))
    # the ends stay put so strokes still start and stop where they were drawn to
    smooth = [centred[0]]
    for i in range(1, len(centred) - 1):
        window = centred[max(0, i - SMOOTHING):i + SMOOTHING + 1]
        smooth.append((sum(p[0] for p in window) / len(window),
                       sum(p[1] for p in window) / len(window)))
    return smooth + centred[-1:]


def simplify(points):
    """Ramer–Douglas–Peucker: keeps only the points that bend the line by more than SIMPLIFY."""
    if len(points) < 3:
        return points
    (ax, ay), (bx, by) = points[0], points[-1]
    length = math.hypot(bx - ax, by - ay)

    def distance(p):
        if length == 0:
            return math.dist(p, points[0])
        return abs((bx - ax) * (ay - p[1]) - (ax - p[0]) * (by - ay)) / length

    i, farthest = max(enumerate(points[1:-1], 1), key=lambda item: distance(item[1]))
    if distance(farthest) <= SIMPLIFY:
        return [points[0], points[-1]]
    return simplify(points[:i + 1])[:-1] + simplify(points[i:])


def to_screen(points):
    points = simplify(points)
    return "M" + "L".join(f"{num(x * SCALE)} {num(-y * SCALE)}" for x, y in points)


def dot_strokes(contours, group):
    centres = []
    for i in group:
        xs, ys = [p[0] for p in contours[i]], [p[1] for p in contours[i]]
        centres.append(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2))
    gx = sum(c[0] for c in centres) / len(centres)
    gy = sum(c[1] for c in centres) / len(centres)
    strokes = []
    # rows top to bottom, each right to left, as they're written
    for i, (cx, cy) in sorted(zip(group, centres), key=lambda d: (-round(d[1][1] / 60), -d[1][0])):
        r = DOT_REACH
        stroke = {"clip": i, "width": DOT_WIDTH, "points": [(cx - r, cy + r), (cx + r, cy - r)]}
        if len(group) > 1:
            # badges fan out from the middle of the group, so they don't cover each other
            ox, oy = cx - gx, cy - gy
            k = DOT_LABEL_GAP / (math.hypot(ox, oy) or 1)
            stroke["label"] = (cx + ox * k, cy + oy * k)
        strokes.append(stroke)
    return strokes


def build_form(font, char, form):
    contours, strokes = [], []
    for index, (component, dx, dy) in enumerate(components(font, glyph_name(font, char, form))):
        first = len(contours)
        contours += component_contours(font, component, dx, dy)
        if "dot" in component:
            strokes += dot_strokes(contours, range(first, len(contours)))
            continue
        # a glyph's first component is its body; the others are marks
        table, kind = (BODIES, "body") if index == 0 else (MARKS, "mark")
        if component not in table:
            raise KeyError(f"no strokes for {kind} {component} ({char} {form})")
        for s in table[component]:
            points = [(x + dx, y + dy) for x, y in path_points(s["path"])]
            strokes.append({**s, "clip": first + s["clip"], "points": points})

    # each outer contour is a part, along with the holes inside it
    outers = [i for i, c in enumerate(contours) if area(c) < 0]
    holes = {i: [] for i in outers}
    for i, c in enumerate(contours):
        if area(c) > 0:
            parent = max((o for o in outers if contains(contours[o], c[0])),
                         key=lambda o: area(contours[o]))  # the smallest one around it
            holes[parent].append(i)
    parts = []
    for o in outers:
        part = {"d": to_screen(contours[o]) + "Z"}
        if holes[o]:
            part["holes"] = [to_screen(contours[h]) + "Z" for h in holes[o]]
        parts.append(part)

    out = []
    for s in strokes:
        if s["clip"] not in outers:
            raise ValueError(f"{char} {form}: a stroke clips to hole contour {s['clip']}")
        part = [contours[s["clip"]], *(contours[h] for h in holes[s["clip"]])]
        points = snap(s["points"], part, s["width"]) if len(s["points"]) > 2 else s["points"]
        stroke = {"d": to_screen(points), "width": round(s["width"] * SCALE, 2),
                  "part": outers.index(s["clip"])}
        if "label" in s:
            stroke["label"] = [round(s["label"][0] * SCALE, 2), round(-s["label"][1] * SCALE, 2)]
        out.append(stroke)
    return {"parts": parts, "strokes": out}


def check_svg(form):
    """The form fully inked over a red copy of the glyph, with its centerlines drawn in."""
    def part_d(part):
        return part["d"] + "".join(part.get("holes", []))

    clips = "".join(f'<clipPath id="c{i}"><path d="{part_d(p)}" clip-rule="evenodd"/></clipPath>'
                    for i, p in enumerate(form["parts"]))
    red = "".join(f'<path d="{part_d(p)}" fill="#e74c3c" fill-rule="evenodd"/>'
                  for p in form["parts"])
    ink, lines = "", ""
    for s in form["strokes"]:
        ink += (f'<path d="{s["d"]}" clip-path="url(#c{s["part"]})" fill="none" stroke="#844f01" '
                f'stroke-width="{s["width"]}" stroke-linecap="round" stroke-linejoin="round"/>')
        x, y = s["d"][1:].split("L")[0].split()
        lines += (f'<path d="{s["d"]}" fill="none" stroke="#2f6f73" stroke-width="0.25"/>'
                  f'<circle cx="{x}" cy="{y}" r="0.6" fill="#2f6f73"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -28 44 44" width="440" '
            f'height="440"><rect x="-5" y="-28" width="44" height="44" fill="#f3e3c6"/>'
            f'<defs>{clips}</defs>{red}{ink}{lines}</svg>')


def main():
    font_path = sys.argv[sys.argv.index("--font") + 1] if "--font" in sys.argv else FONT
    font = TTFont(font_path)
    data = {}
    for char in LETTERS:
        forms = ["isolated", "final"] if char in RIGHT_JOINING else FORMS
        data[char] = {form: build_form(font, char, form) for form in forms}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {OUT}")

    if "--check" in sys.argv:
        out = Path(tempfile.mkdtemp(prefix="stroke-order-"))
        for char, forms in data.items():
            for form_name, form in forms.items():
                svg = out / f"{ord(char):04x}-{form_name}.svg"
                svg.write_text(check_svg(form))
                subprocess.run(["rsvg-convert", svg, "-o", svg.with_suffix(".png")], check=True)
                svg.unlink()
        print(f"check renders in {out}")


if __name__ == "__main__":
    main()
