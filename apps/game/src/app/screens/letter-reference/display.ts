import { Container, Graphics, GraphicsContext, GraphicsPath, Text } from 'pixi.js';

import { DrawingCanvas, type StrokePoint } from '../../ui/drawing-canvas';
import { calculateDrawingAccuracy, parseStrokePath } from './calculate-accuracy';
import { LABEL_COLOR, NAV_COLOR, NAV_SHADOW_COLOR } from './controls';
import { createGlyphMaskContext } from './glyph-mask';
import { getBaseForm, getLetterEntry, GLYPH_EXTENT, type LETTER_FORMS } from './letter-data';
import { StrokeTracer, type TraceStroke } from './stroke-tracer';

/** Teal so the user's own ink reads apart from the brown demo trace. */
const DRAW_COLOR = NAV_COLOR;
/** Brush width in outline units: a little under the letter's body (about 2.4) and the demo trace. */
const DRAW_WIDTH = 1.8;
/** Seconds after a letter or form comes up before its demo plays by itself. */
const AUTO_DEMO_DELAY = 0.6;
/** Line width of the letter's outline, in outline units. */
const OUTLINE_WIDTH = 0.65;
const OUTLINE_COLOR = 0x000000;
/** Share of the canvas the largest form fills. */
const GLYPH_MARGIN = 0.85;
/**
 * The tatweel's outline: the black at 30% over the background, faint so it reads as a guide rather
 * than part of the letter. Solid rather than translucent so its overlapping joins don't darken.
 */
const JOIN_COLOR = 0xaa9f8a;
/** The result label, in the top middle of the frame. */
const RESULT_INSET = 28;
const RESULT_PAD_X = 32;
const RESULT_HEIGHT = 72;

// TODO: write the results message; accuracy is a percentage from 0 to 100
function getResultsMessage(accuracy: number): string {
  return `Accuracy: ${Math.round(accuracy)}%`;
}

/**
 * The practice canvas: the letter's outline, its stroke-order demo and hints, and the user's ink.
 * The drawing is scored by itself once it has as many strokes as the letter.
 */
export class OutlineDisplay extends Container {
  /** Holds the outline and its tracer so they share one transform. */
  private glyph: Container;
  private outline: Graphics;
  private tracer: StrokeTracer;
  /** Each form's stroke centerlines, in the order and direction they're written, for scoring. */
  private referenceCache = new Map<string, StrokePoint[][]>();
  private strokeCache = new Map<string, TraceStroke[]>();
  private contextCache = new Map<string, GraphicsContext>();
  /** Freehand practice layer under the glyph, left unclipped so strokes off the letter show. */
  private drawingCanvas: DrawingCanvas;
  private result: Container;
  private resultBg = new Graphics();
  private resultText: Text;
  /** Set once the drawing is scored; the next touch starts over on a clean outline. */
  private scored = false;
  private letter = '';
  private form: LETTER_FORMS = 'isolated';
  private w = 0;
  private h = 0;

  private readonly handlers: {
    /** The drawing or the demo changed, so what the tools can do may have too. */
    onChange: () => void;
    onScored: (accuracy: number) => void;
  };

  constructor(handlers: OutlineDisplay['handlers']) {
    super();
    this.handlers = handlers;
    this.outline = new Graphics();
    this.tracer = new StrokeTracer();
    // tracer underneath so the outline stays crisp on top of it, but its stroke numbers above
    this.glyph = new Container({
      children: [this.tracer, this.outline, this.tracer.badgeLayer],
    });
    this.drawingCanvas = new DrawingCanvas({
      background: false,
      color: DRAW_COLOR,
      onChange: (strokes) => {
        // each stroke drawn moves the hint on to the next; a demo in progress keeps playing
        // through the clears that come with a letter change or resize
        if (!this.tracer.isPlaying) this.tracer.showHints(strokes.length);
        if (!strokes.length) this.hideResult();
        else if (!this.scored && strokes.length >= this.reference.length) this.score();
        handlers.onChange();
      },
    });
    // capture runs ahead of the canvas's own handler, so a new attempt is cleared before its first
    // stroke starts; and starting to draw cuts a demo short, so the practice is on a clean outline
    this.drawingCanvas.on('pointerdowncapture', () => {
      if (this.scored) this.drawingCanvas.clear();
      if (this.tracer.isPlaying) this.tracer.showHints(this.drawingCanvas.getStrokes().length);
    });

    // flow label: anchored text and a pill drawn to fit it
    this.resultText = new Text({
      anchor: 0.5,
      resolution: 2,
      style: { fontFamily: 'Concert One', fontSize: 40, fill: LABEL_COLOR },
    });
    this.result = new Container({ children: [this.resultBg, this.resultText], visible: false });

    // canvas under the glyph so the outline and stroke numbers stay crisp over the user's ink; the
    // glyph isn't interactive, so pointer events still pass through it to the canvas
    this.addChild(this.drawingCanvas, this.glyph, this.result);
  }

  get canWatch() {
    return this.tracer.hasPath;
  }

  get canClear() {
    return !this.drawingCanvas.isEmpty;
  }

  setLetter(letter: string, form: LETTER_FORMS) {
    this.letter = letter;
    this.form = form;
    this.outline.context = this.getCachedContext();
    // also stops and clears any trace in progress
    this.tracer.setStrokes(this.getCachedStrokes());

    // recentre pivot on this letter's actual geometry
    const b = this.outline.getLocalBounds();
    this.glyph.pivot.set(b.x + b.width / 2, b.y + b.height / 2);

    this.fit(); // reposition + rescale for current size
    // show how it's written first; the practice hints follow once the demo is done
    this.tracer.play(AUTO_DEMO_DELAY);
    this.handlers.onChange();
  }

  /** Replays the demo on a clean slate. */
  watch() {
    this.drawingCanvas.clear();
    this.tracer.play();
    this.handlers.onChange();
  }

  /** Wipes the user's strokes; the canvas's onChange puts the hints back to the first stroke. */
  clear() {
    this.drawingCanvas.clear();
  }

  resize(width: number, height: number) {
    this.w = width;
    this.h = height;
    this.drawingCanvas.resize(width, height);
    this.result.position.set(width / 2, RESULT_INSET + RESULT_HEIGHT / 2);
    this.fit();
  }

  private fit() {
    if (!this.w || !this.h) return; // resize hasn't run yet

    const b = this.outline.getLocalBounds();
    if (!b.width || !b.height) return; // context not set yet

    // one scale for every letter and form, the largest that fits the biggest of them with room
    // for its stroke numbers, so letters keep their sizes relative to each other
    const scale =
      Math.min(this.w / GLYPH_EXTENT.width, this.h / GLYPH_EXTENT.height) * GLYPH_MARGIN;

    this.glyph.scale.set(scale);
    this.glyph.position.set(this.w / 2, this.h / 2);

    // strokes are in frame pixels, so they'd drift off a rescaled or recentred glyph
    this.drawingCanvas.setSize(DRAW_WIDTH * scale);
    this.drawingCanvas.clear();
  }

  private get key() {
    return `${getBaseForm(this.letter)}/${this.form}`;
  }

  private get entry() {
    return getLetterEntry(this.letter, this.form)!;
  }

  // returns context if cached
  // creates, caches, and returns if not
  private getCachedContext() {
    let context = this.contextCache.get(this.key);
    if (!context) {
      const { parts, joins = [] } = this.entry;
      const outline = parts.flatMap(({ d, holes = [] }) => [d, ...holes]);
      const style = {
        width: OUTLINE_WIDTH,
        color: OUTLINE_COLOR,
        cap: 'round',
        join: 'round',
      } as const;
      context = new GraphicsContext();
      // first, so the letter's own outline is drawn over the end it shares with the tatweel;
      // in the outline's bounds, so the letter is centred along with it
      if (joins.length) {
        context.path(new GraphicsPath(joins.join(''))).stroke({ ...style, color: JOIN_COLOR });
      }
      context.path(new GraphicsPath(outline.join(''))).stroke(style);
      this.contextCache.set(this.key, context);
    }
    return context;
  }

  // each stroke is clipped to its own part of the glyph, so a thick pen can't spill onto the next
  private getCachedStrokes() {
    let strokes = this.strokeCache.get(this.key);
    if (!strokes) {
      const { parts, strokes: entries } = this.entry;
      const clips = parts.map((part) => createGlyphMaskContext([part]));
      strokes = entries.map(({ d, width, part, label }) => ({
        d,
        width,
        clip: clips[part],
        label: label && [label[0], label[1]],
      }));
      this.strokeCache.set(this.key, strokes);
    }
    return strokes;
  }

  private get reference() {
    let reference = this.referenceCache.get(this.key);
    if (!reference) {
      reference = this.entry.strokes.map(({ d }) => parseStrokePath(d));
      this.referenceCache.set(this.key, reference);
    }
    return reference;
  }

  private score() {
    // drawn points are in canvas pixels; the reference strokes are in the glyph's outline units
    const glyphStrokes: StrokePoint[][] = this.drawingCanvas
      .getStrokes()
      .map((stroke) => stroke.points.map((point) => this.glyph.toLocal(point, this.drawingCanvas)));
    const accuracy = calculateDrawingAccuracy(glyphStrokes, this.reference);
    this.scored = true;
    this.showResult(accuracy);
    this.handlers.onScored(accuracy);
  }

  private showResult(accuracy: number) {
    this.resultText.text = getResultsMessage(accuracy);
    const w = this.resultText.width + RESULT_PAD_X * 2;
    this.resultBg
      .clear()
      .roundRect(-w / 2, -RESULT_HEIGHT / 2 + 6, w, RESULT_HEIGHT, RESULT_HEIGHT / 2)
      .fill(NAV_SHADOW_COLOR)
      .roundRect(-w / 2, -RESULT_HEIGHT / 2, w, RESULT_HEIGHT, RESULT_HEIGHT / 2)
      .fill(NAV_COLOR);
    this.result.visible = true;
  }

  private hideResult() {
    this.scored = false;
    this.result.visible = false;
  }
}
