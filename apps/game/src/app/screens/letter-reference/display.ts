import { FancyButton } from '@pixi/ui';
import { Container, Graphics, GraphicsContext, GraphicsPath, Sprite, Text, Texture } from 'pixi.js';

import type { LETTER_FORMS } from '.';
import { DrawingCanvas, type StrokePoint } from '../../ui/drawing-canvas';
import { SoundButton } from '../../ui/sound-button';
import {
  calculateGlyphCoverage,
  calculateGlyphStrokeAccuracy,
  sampleGlyphInterior,
} from './calculate-accuracy';
import { createGlyphMaskContext, type GlyphPart } from './glyph-mask';
import lettersJson from './letters.json';
import { StrokeTracer, type TraceStroke } from './stroke-tracer';

const HAMZA = 'ئ';
export const FRAME_COLOR = 0x844f01;
const LABEL_COLOR = 0xf3e3c6;

const FORM_BUTTON_WIDTH = 220;
const FORM_BUTTON_HEIGHT = 90;
const FORM_BUTTON_RADIUS = 30;
const FORM_BUTTON_SHADOW_OFFSET = 10;
const FORM_BUTTON_SHADOW_COLOR = 0x5a3601;
const FORM_BUTTON_SELECTED_COLOR = 0xc98144;
const FORM_BUTTON_SELECTED_RING_WIDTH = 6;
const NAV_BUTTON_COLOR = 0x2f6f73;
const NAV_BUTTON_SHADOW_COLOR = 0x1d4649;
const FORM_BUTTON_DISABLED_COLOR = 0xa39a8c;
const FORM_BUTTON_DISABLED_SHADOW_COLOR = 0x6f685e;
const FORM_BUTTON_ANIMATIONS = {
  hover: { props: { scale: { x: 1.06, y: 1.06 } }, duration: 100 },
  pressed: { props: { scale: { x: 0.94, y: 0.94 } }, duration: 80 },
};
const ROW_HEIGHT = FORM_BUTTON_HEIGHT + FORM_BUTTON_SHADOW_OFFSET;
const ROW_GAP = 32;
const COUNTER_INSET = 28;
const SOUND_BUTTON_SIZE = 90;
/** Teal so the user's own ink reads apart from the brown demo trace. */
const DRAW_COLOR = NAV_BUTTON_COLOR;
/** Brush width in outline units: a fine pen line, far thinner than the demo trace. */
const DRAW_WIDTH = 1;
/** Space between the stacked Submit and Clear buttons. */
const BUTTON_STACK_GAP = 16;
/** Darkness of the tint behind the results message. */
const OVERLAY_ALPHA = 0.6;
/** Grid spacing, in glyph units, of the interior points coverage is measured against. */
const COVERAGE_SAMPLE_STEP = 0.25;
/**
 * How close, in glyph units, a drawn stroke must pass to count a point of the letter as covered.
 * Wider than the ink so one pass down the middle of a body (about 2.4 units thick) covers it.
 */
const COVERAGE_RADIUS = 2;
/** Line width of the letter's outline, in outline units. */
const OUTLINE_WIDTH = 0.8;
const OUTLINE_COLOR = 0x000000;

const FORM_LABELS: Record<LETTER_FORMS, string> = {
  isolated: 'Isolated',
  initial: 'Initial',
  medial: 'Medial',
  final: 'Final',
};

// each form's outline, split into parts, and the strokes it's written in, each clipped to the
// part at index `part`. baked from Noto Naskh Arabic by scripts/stroke-order/build.py
type LetterEntry = {
  parts: GlyphPart[];
  /** `label` is an [x, y] pair, but JSON imports only type it as an array. */
  strokes: { d: string; width: number; part: number; label?: number[] }[];
};
const letters = lettersJson as Record<string, Partial<Record<string, LetterEntry>>>;

// TODO: write the results message; the scores are percentages from 0 to 100
function getResultsMessage(accuracy: number, coverage: number): string {
  return `Drawing Results
Accuracy: ${Math.round(accuracy)}%
Coverage: ${Math.round(coverage)}%`;
}

function getBaseForm(letter: string) {
  const base = letter.length > 1 && letter.startsWith(HAMZA) ? letter.slice(1) : letter;
  return base;
}

function hasForm(base: string, form: LETTER_FORMS) {
  return Boolean(letters[base]?.[form]);
}

function createButtonView(color: number, shadowColor: number) {
  return new Graphics()
    .roundRect(
      0,
      FORM_BUTTON_SHADOW_OFFSET,
      FORM_BUTTON_WIDTH,
      FORM_BUTTON_HEIGHT,
      FORM_BUTTON_RADIUS,
    )
    .fill(shadowColor)
    .roundRect(0, 0, FORM_BUTTON_WIDTH, FORM_BUTTON_HEIGHT, FORM_BUTTON_RADIUS)
    .fill(color);
}

// lighter fill with a dark ring, swapped in as the default view of the current form's button
function createSelectedButtonView() {
  const inset = FORM_BUTTON_SELECTED_RING_WIDTH / 2;
  return createButtonView(FORM_BUTTON_SELECTED_COLOR, FORM_BUTTON_SHADOW_COLOR)
    .roundRect(
      inset,
      inset,
      FORM_BUTTON_WIDTH - FORM_BUTTON_SELECTED_RING_WIDTH,
      FORM_BUTTON_HEIGHT - FORM_BUTTON_SELECTED_RING_WIDTH,
      FORM_BUTTON_RADIUS - inset,
    )
    .stroke({ width: FORM_BUTTON_SELECTED_RING_WIDTH, color: FORM_BUTTON_SHADOW_COLOR });
}

function createTextButton(label: string, color: number, shadowColor: number, onPress: () => void) {
  const button = new FancyButton({
    defaultView: createButtonView(color, shadowColor),
    disabledView: createButtonView(FORM_BUTTON_DISABLED_COLOR, FORM_BUTTON_DISABLED_SHADOW_COLOR),
    text: new Text({
      text: label,
      resolution: 2,
      style: { fontFamily: 'Concert One', fontSize: 40, fill: LABEL_COLOR },
    }),
    animations: FORM_BUTTON_ANIMATIONS,
    anchor: 0.5,
  });
  button.layout = { width: FORM_BUTTON_WIDTH, height: ROW_HEIGHT, isLeaf: true };
  button.onPress.connect(onPress);
  return button;
}

export class OutlineDisplay extends Container {
  private frame: Container;
  /** Holds the outline and its tracer so they share one transform. */
  private glyph: Container;
  private outline: Graphics;
  private tracer: StrokeTracer;
  /** Filled glyph interior, for scoring; never drawn itself. */
  private glyphMask: Graphics;
  private maskCache = new Map<string, GraphicsContext>();
  private sampleCache = new Map<string, StrokePoint[]>();
  private strokeCache = new Map<string, TraceStroke[]>();
  private traceButton: FancyButton;
  /** Freehand practice layer over the glyph, left unclipped so strokes off the letter show. */
  private drawingCanvas: DrawingCanvas;
  private clearButton: FancyButton;
  private submitButton: FancyButton;
  /** Darkens the whole display and shows the scores after Submit. */
  private resultsOverlay: Container;
  private resultsText: Text;
  private border: Graphics;
  private buttonRow: Container;
  private formButtons: Map<
    LETTER_FORMS,
    { button: FancyButton; view: Container; selectedView: Container }
  >;
  private contextCache: Map<string, GraphicsContext>;
  private letter = '';
  private form: LETTER_FORMS = 'isolated';
  private w = 0;
  private h = 0;
  private soundButton: SoundButton;
  private counter = new Text({
    resolution: 2,
    style: { fontFamily: 'Concert One', fontSize: 40, fill: FRAME_COLOR },
    position: { x: COUNTER_INSET, y: COUNTER_INSET },
  });

  constructor(
    letter: string,
    handlers: { onPrev: () => void; onNext: () => void; onSound: () => void; onHome: () => void },
    form: LETTER_FORMS = 'isolated',
  ) {
    super({ layout: { flexDirection: 'column', alignItems: 'center', gap: ROW_GAP } });
    this.contextCache = new Map();
    this.outline = new Graphics();
    this.tracer = new StrokeTracer();
    // kept in the glyph only so drawn points can be mapped into its coordinates
    this.glyphMask = new Graphics({ renderable: false });
    // tracer underneath so the outline stays crisp on top of it
    this.glyph = new Container({ children: [this.glyphMask, this.tracer, this.outline] });
    this.border = new Graphics();
    this.frame = new Container({ layout: true });
    this.soundButton = new SoundButton({
      onClick: handlers.onSound,
      size: SOUND_BUTTON_SIZE,
      variant: 'brown',
    });
    this.traceButton = createTextButton('Trace', NAV_BUTTON_COLOR, NAV_BUTTON_SHADOW_COLOR, () => {
      this.tracer.play();
      this.refreshButtons();
    });
    this.traceButton.layout = {
      position: 'absolute',
      right: COUNTER_INSET,
      bottom: COUNTER_INSET,
      width: FORM_BUTTON_WIDTH,
      height: ROW_HEIGHT,
      isLeaf: true,
    };
    this.drawingCanvas = new DrawingCanvas({
      background: false,
      color: DRAW_COLOR,
      onChange: () => this.refreshButtons(),
    });
    this.clearButton = createTextButton('Clear', NAV_BUTTON_COLOR, NAV_BUTTON_SHADOW_COLOR, () =>
      this.clearDrawing(),
    );
    this.clearButton.layout = {
      position: 'absolute',
      left: COUNTER_INSET,
      bottom: COUNTER_INSET,
      width: FORM_BUTTON_WIDTH,
      height: ROW_HEIGHT,
      isLeaf: true,
    };
    this.submitButton = createTextButton(
      'Submit',
      NAV_BUTTON_COLOR,
      NAV_BUTTON_SHADOW_COLOR,
      this.handleSubmit,
    );
    // stacked directly above Clear
    this.submitButton.layout = {
      position: 'absolute',
      left: COUNTER_INSET,
      bottom: COUNTER_INSET + ROW_HEIGHT + BUTTON_STACK_GAP,
      width: FORM_BUTTON_WIDTH,
      height: ROW_HEIGHT,
      isLeaf: true,
    };
    // canvas over the glyph so the user's ink stays on top of the outline and demo trace
    this.frame.addChild(
      this.border,
      this.glyph,
      this.drawingCanvas,
      this.counter,
      this.soundButton,
      this.traceButton,
      this.clearButton,
      this.submitButton,
    );

    this.formButtons = new Map();
    for (const buttonForm of Object.keys(FORM_LABELS) as LETTER_FORMS[]) {
      const button = createTextButton(
        FORM_LABELS[buttonForm],
        FRAME_COLOR,
        FORM_BUTTON_SHADOW_COLOR,
        () => this.setForm(buttonForm),
      );
      // FancyButton only detaches a replaced view, so both can be swapped back and forth
      this.formButtons.set(buttonForm, {
        button,
        view: button.defaultView!,
        selectedView: createSelectedButtonView(),
      });
    }
    const prevButton = createTextButton(
      'Prev',
      NAV_BUTTON_COLOR,
      NAV_BUTTON_SHADOW_COLOR,
      handlers.onPrev,
    );
    const nextButton = createTextButton(
      'Next',
      NAV_BUTTON_COLOR,
      NAV_BUTTON_SHADOW_COLOR,
      handlers.onNext,
    );
    this.buttonRow = new Container({
      layout: { flexDirection: 'row', alignItems: 'center', gap: ROW_GAP },
      children: [
        prevButton,
        ...[...this.formButtons.values()].map(({ button }) => button),
        nextButton,
      ],
    });

    // tint catches pointer events so nothing underneath can be used while results show
    const tint = new Sprite({
      texture: Texture.WHITE,
      tint: 0x000000,
      alpha: OVERLAY_ALPHA,
      eventMode: 'static',
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });
    // flow label: anchored text and @pixi/layout fight over the origin
    this.resultsText = new Text({
      resolution: 2,
      style: { fontFamily: 'Concert One', fontSize: 56, fill: LABEL_COLOR, align: 'center' },
      layout: true,
    });
    const resultsButtons = new Container({
      layout: { flexDirection: 'row', alignItems: 'center', gap: ROW_GAP },
      children: [
        createTextButton('Continue', NAV_BUTTON_COLOR, NAV_BUTTON_SHADOW_COLOR, () =>
          this.continueDrawing(),
        ),
        createTextButton('Go Home', FRAME_COLOR, FORM_BUTTON_SHADOW_COLOR, handlers.onHome),
      ],
    });
    this.resultsOverlay = new Container({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: ROW_GAP,
      },
      children: [tint, this.resultsText, resultsButtons],
    });
    this.resultsOverlay.visible = false;

    this.addChild(this.frame, this.buttonRow, this.resultsOverlay);
    this.setLetter(letter, form);
  }

  setLetter(letter: string, form: LETTER_FORMS = 'isolated') {
    const base = getBaseForm(letter);
    this.letter = letter;
    this.resultsOverlay.visible = false;
    this.form = form;
    this.outline.context = this.getCachedContext(base, form);
    this.glyphMask.context = this.getCachedMaskContext(base, form);
    // also stops and clears any trace in progress
    this.tracer.setStrokes(this.getCachedStrokes(base, form));

    // recentre pivot on this letter's actual geometry
    const b = this.outline.getLocalBounds();
    this.glyph.pivot.set(b.x + b.width / 2, b.y + b.height / 2);

    this.fit(); // reposition + rescale for current size
    this.refreshButtons();
  }

  // 1-based position of the letter, shown top-left of the frame
  setCounter(position: number, total: number) {
    this.counter.text = `${position}/${total}`;
  }

  setForm(form: LETTER_FORMS) {
    if (form === this.form || !hasForm(getBaseForm(this.letter), form)) return;
    this.setLetter(this.letter, form);
  }

  resize(width: number, height: number) {
    this.w = width;
    this.h = Math.max(0, height - ROW_HEIGHT - ROW_GAP);
    this.frame.layout = { width: this.w, height: this.h };
    this.border
      .clear()
      .roundRect(0, 0, this.w, this.h, 20)
      .stroke({ width: 8, color: FRAME_COLOR });
    this.drawingCanvas.resize(this.w, this.h);
    // anchored at its centre, mirroring the counter in the top-right corner
    this.soundButton.position.set(
      this.w - COUNTER_INSET - SOUND_BUTTON_SIZE / 2,
      COUNTER_INSET + SOUND_BUTTON_SIZE / 2,
    );
    this.fit();
  }

  // wipes both the demo trace and the user's own strokes
  private clearDrawing() {
    this.tracer.reset();
    this.drawingCanvas.clear(); // its onChange refreshes the buttons
  }

  private refreshButtons() {
    const base = getBaseForm(this.letter);
    this.traceButton.enabled = this.tracer.hasPath;
    this.clearButton.enabled = !this.drawingCanvas.isEmpty || this.tracer.hasTrace;
    this.submitButton.enabled = !this.drawingCanvas.isEmpty;
    for (const [form, { button, view, selectedView }] of this.formButtons) {
      button.enabled = hasForm(base, form);
      const targetView = form === this.form ? selectedView : view;
      if (button.defaultView !== targetView) button.defaultView = targetView;
    }
  }

  private fit() {
    if (!this.w || !this.h) return; // resize hasn't run yet

    const b = this.outline.getLocalBounds();
    if (!b.width || !b.height) return; // context not set yet

    // scale to fit inside the frame, keeping aspect ratio, with margin
    const margin = 0.75;
    const scale = Math.min(this.w / b.width, this.h / b.height) * margin;

    this.glyph.scale.set(scale);
    this.glyph.position.set(this.w / 2, this.h / 2);

    // strokes are in frame pixels, so they'd drift off a rescaled or recentred glyph
    this.drawingCanvas.setSize(DRAW_WIDTH * scale);
    this.drawingCanvas.clear();
  }

  // returns context if cached
  // creates, caches, and returns if not
  private getCachedContext(letter: string, form: LETTER_FORMS) {
    const key = `${letter}/${form}`;
    let context = this.contextCache.get(key);
    if (!context) {
      const outline = letters[letter]![form]!.parts.flatMap(({ d, holes = [] }) => [d, ...holes]);
      context = new GraphicsContext()
        .path(new GraphicsPath(outline.join('')))
        .stroke({ width: OUTLINE_WIDTH, color: OUTLINE_COLOR, cap: 'round', join: 'round' });
      this.contextCache.set(key, context);
    }
    return context;
  }

  private getCachedMaskContext(letter: string, form: LETTER_FORMS) {
    const key = `${letter}/${form}`;
    let context = this.maskCache.get(key);
    if (!context) {
      context = createGlyphMaskContext(letters[letter]![form]!.parts);
      this.maskCache.set(key, context);
    }
    return context;
  }

  // each stroke is clipped to its own part of the glyph, so a thick pen can't spill onto the next
  private getCachedStrokes(letter: string, form: LETTER_FORMS) {
    const key = `${letter}/${form}`;
    let strokes = this.strokeCache.get(key);
    if (!strokes) {
      const { parts, strokes: entries } = letters[letter]![form]!;
      const clips = parts.map((part) => createGlyphMaskContext([part]));
      strokes = entries.map(({ d, width, part, label }) => ({
        d,
        width,
        clip: clips[part],
        label: label && [label[0], label[1]],
      }));
      this.strokeCache.set(key, strokes);
    }
    return strokes;
  }

  private readonly handleSubmit = () => {
    // drawn points are in canvas pixels; the mask is in the glyph's outline units
    const glyphStrokes: StrokePoint[][] = this.drawingCanvas
      .getStrokes()
      .map((stroke) =>
        stroke.points.map((point) => this.glyphMask.toLocal(point, this.drawingCanvas)),
      );
    const accuracy = calculateGlyphStrokeAccuracy(glyphStrokes.flat(), this.glyphMask.context);
    const coverage = calculateGlyphCoverage(
      glyphStrokes,
      this.getCachedInteriorSamples(getBaseForm(this.letter), this.form),
      COVERAGE_RADIUS,
    );
    // harmonic mean: only high when the drawing is both on the letter and covers it
    const combined =
      accuracy + coverage === 0 ? 0 : (2 * accuracy * coverage) / (accuracy + coverage);
    console.log(
      `The accuracy is: ${accuracy.toFixed(1)}, coverage: ${coverage.toFixed(1)}, combined: ${combined.toFixed(1)}`,
    );
    this.showResults(accuracy, coverage);
  };

  private showResults(accuracy: number, coverage: number) {
    this.resultsText.text = getResultsMessage(accuracy, coverage);
    this.tracer.reset(); // don't keep a demo trace animating underneath
    this.resultsOverlay.visible = true;
  }

  // back to the same letter and form with nothing drawn
  private continueDrawing() {
    this.resultsOverlay.visible = false;
    this.clearDrawing();
  }

  private getCachedInteriorSamples(letter: string, form: LETTER_FORMS) {
    const key = `${letter}/${form}`;
    let samples = this.sampleCache.get(key);
    if (!samples) {
      samples = sampleGlyphInterior(this.getCachedMaskContext(letter, form), COVERAGE_SAMPLE_STEP);
      this.sampleCache.set(key, samples);
    }
    return samples;
  }
}
