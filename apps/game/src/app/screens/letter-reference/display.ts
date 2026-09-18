import { FancyButton } from '@pixi/ui';
import { Container, Graphics, GraphicsContext, Text } from 'pixi.js';

import type { LETTER_FORMS } from '.';
import { SoundButton } from '../../ui/sound-button';
import { createGlyphMaskContext } from './glyph-mask';
import outlinesJson from './letters.json';
import { StrokeTracer } from './stroke-tracer';

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

const FORM_LABELS: Record<LETTER_FORMS, string> = {
  isolated: 'Isolated',
  initial: 'Initial',
  medial: 'Medial',
  final: 'Final',
};

// only the base forms are looked up; the `_2` variant keys are ignored.
// `strokePath` is `pathString` fitted onto the outline by scripts/fit-letter-paths.mjs
type OutlineEntry = { svgString: string; pathString?: string; strokePath?: string };
const outlines = outlinesJson as Record<string, Partial<Record<string, OutlineEntry>>>;

function getBaseForm(letter: string) {
  const base = letter.length > 1 && letter.startsWith(HAMZA) ? letter.slice(1) : letter;
  return base;
}

function hasForm(base: string, form: LETTER_FORMS) {
  return Boolean(outlines[base]?.[form]);
}

function getStrokePath(base: string, form: LETTER_FORMS) {
  return outlines[base]?.[form]?.strokePath;
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
  /** Filled glyph interior that keeps the thick trace brush inside the outline. */
  private glyphMask: Graphics;
  private maskCache = new Map<string, GraphicsContext>();
  private traceButton: FancyButton;
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
    handlers: { onPrev: () => void; onNext: () => void; onSound: () => void },
    form: LETTER_FORMS = 'isolated',
  ) {
    super({ layout: { flexDirection: 'column', alignItems: 'center', gap: ROW_GAP } });
    this.contextCache = new Map();
    this.outline = new Graphics();
    this.tracer = new StrokeTracer();
    this.glyphMask = new Graphics();
    this.tracer.mask = this.glyphMask;
    // tracer underneath so the outline stays crisp on top of it
    this.glyph = new Container({ children: [this.glyphMask, this.tracer, this.outline] });
    this.border = new Graphics();
    this.frame = new Container({ layout: true });
    this.soundButton = new SoundButton({
      onClick: handlers.onSound,
      size: SOUND_BUTTON_SIZE,
      variant: 'brown',
    });
    this.traceButton = createTextButton('Trace', NAV_BUTTON_COLOR, NAV_BUTTON_SHADOW_COLOR, () =>
      this.tracer.play(),
    );
    this.traceButton.layout = {
      position: 'absolute',
      right: COUNTER_INSET,
      bottom: COUNTER_INSET,
      width: FORM_BUTTON_WIDTH,
      height: ROW_HEIGHT,
      isLeaf: true,
    };
    this.frame.addChild(this.border, this.glyph, this.counter, this.soundButton, this.traceButton);

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

    this.addChild(this.frame, this.buttonRow);
    this.setLetter(letter, form);
  }

  setLetter(letter: string, form: LETTER_FORMS = 'isolated') {
    const base = getBaseForm(letter);
    this.letter = letter;
    this.form = form;
    this.outline.context = this.getCachedContext(base, form);
    this.glyphMask.context = this.getCachedMaskContext(base, form);
    // also stops and clears any trace in progress
    this.tracer.setPath(getStrokePath(base, form));

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
    // anchored at its centre, mirroring the counter in the top-right corner
    this.soundButton.position.set(
      this.w - COUNTER_INSET - SOUND_BUTTON_SIZE / 2,
      COUNTER_INSET + SOUND_BUTTON_SIZE / 2,
    );
    this.fit();
  }

  private refreshButtons() {
    const base = getBaseForm(this.letter);
    this.traceButton.enabled = this.tracer.hasPath;
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
  }

  // returns context if cached
  // creates, caches, and returns if not
  private getCachedContext(letter: string, form: LETTER_FORMS) {
    const key = `${letter}/${form}`;
    let context = this.contextCache.get(key);
    if (!context) {
      context = new GraphicsContext().svg(outlines[letter]![form]!.svgString);
      this.contextCache.set(key, context);
    }
    return context;
  }

  private getCachedMaskContext(letter: string, form: LETTER_FORMS) {
    const key = `${letter}/${form}`;
    let context = this.maskCache.get(key);
    if (!context) {
      const svg = outlines[letter]![form]!.svgString;
      context = createGlyphMaskContext([...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]));
      this.maskCache.set(key, context);
    }
    return context;
  }
}
