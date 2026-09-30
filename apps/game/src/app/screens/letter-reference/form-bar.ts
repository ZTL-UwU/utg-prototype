import { Container, Graphics, GraphicsContext, type Text } from 'pixi.js';

import {
  FRAME_COLOR,
  FRAME_SHADOW_COLOR,
  LABEL_COLOR,
  strokeDashedRoundRect,
  TILE_COLOR,
  TILE_EDGE_COLOR,
  TILE_TEXT_COLOR,
  addHover,
  createTileCaption,
  drawTile,
  TILE_CAPTION_SIZE,
  TILE_CAPTION_Y,
  TILE_GAP,
  TILE_HEIGHT,
  TILE_HOVER_SCALE,
  TILE_PAD,
  TILE_RADIUS,
  TILE_SHADOW,
  TILE_WIDTH,
} from './controls';
import { createGlyphMaskContext } from './glyph-mask';
import {
  FORM_LABELS,
  FORM_ORDER,
  getBaseForm,
  getLetterEntry,
  type LETTER_FORMS,
} from './letter-data';

/** The tatweel is only a hint at where the form joins, so it's drawn faint next to the letter. */
const JOIN_ALPHA = 0.35;
/** Outline of a form the letter doesn't have. */
const MISSING_COLOR = 0xbfae8e;

/** The filled body and the tatweel of every form, shared by all the tiles. */
const previewCache = new Map<string, { body: GraphicsContext; joins?: GraphicsContext }>();

function getPreview(letter: string, form: LETTER_FORMS) {
  const key = `${getBaseForm(letter)}/${form}`;
  let preview = previewCache.get(key);
  if (!preview) {
    const { parts, joins = [] } = getLetterEntry(letter, form)!;
    preview = {
      body: createGlyphMaskContext(parts),
      joins: joins.length ? createGlyphMaskContext(joins.map((d) => ({ d }))) : undefined,
    };
    previewCache.set(key, preview);
  }
  return preview;
}

/** One of a letter's forms, drawn from the same outlines as the canvas, joins and all. */
class FormTile extends Container {
  private bg = new Graphics();
  private glyph = new Container();
  private body = new Graphics();
  private joins = new Graphics({ alpha: JOIN_ALPHA });
  private caption: Text;
  private w = 0;
  private h = 0;
  private selected = false;
  private available = false;
  private resetHover: () => void;

  public readonly form: LETTER_FORMS;

  constructor(form: LETTER_FORMS, onPress: (form: LETTER_FORMS) => void) {
    super();
    this.form = form;
    this.caption = createTileCaption(FORM_LABELS[form]);
    this.glyph.addChild(this.joins, this.body);
    this.addChild(this.bg, this.glyph, this.caption);

    this.on('pointertap', () => onPress(this.form));
    this.resetHover = addHover(this, TILE_HOVER_SCALE);
  }

  update(letter: string, selected: boolean) {
    this.selected = selected;
    this.available = Boolean(getLetterEntry(letter, this.form));
    this.eventMode = this.available && !selected ? 'static' : 'none';
    this.cursor = 'pointer';
    if (this.eventMode === 'none') this.resetHover();
    if (this.available) {
      const { body, joins } = getPreview(letter, this.form);
      this.body.context = body;
      this.joins.context = joins ?? new GraphicsContext();
    }
    this.redraw();
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.redraw();
  }

  private redraw() {
    const { w, h } = this;
    if (!w || !h) return;

    // drawn about the centre, so the hover grows it in place
    this.bg.clear();
    this.bg.position.set(-w / 2, -h / 2);
    if (this.available) {
      const fill = this.selected ? FRAME_COLOR : TILE_COLOR;
      const shadow = this.selected ? FRAME_SHADOW_COLOR : TILE_EDGE_COLOR;
      drawTile(this.bg, w, h, {
        fill,
        shadow,
        edge: this.selected ? undefined : TILE_EDGE_COLOR,
      });
    } else {
      strokeDashedRoundRect(this.bg, w, h - TILE_SHADOW, TILE_RADIUS, {
        width: 4,
        color: MISSING_COLOR,
        dash: 12,
        gap: 10,
      });
    }

    const color = this.selected ? LABEL_COLOR : TILE_TEXT_COLOR;
    this.caption.style.fill = this.available ? color : MISSING_COLOR;
    this.caption.position.set(0, TILE_CAPTION_Y - h / 2);

    this.glyph.visible = this.available;
    if (!this.available) return;
    this.body.tint = color;
    this.joins.tint = color;

    // fit the glyph, joins included, into the space above the caption
    const b = this.glyph.getLocalBounds();
    const boxW = w - 2 * TILE_PAD;
    const boxH = h - TILE_SHADOW - TILE_CAPTION_SIZE - 3 * TILE_PAD;
    const scale = Math.min(boxW / b.width, boxH / b.height);
    this.glyph.scale.set(scale);
    this.glyph.pivot.set(b.x + b.width / 2, b.y + b.height / 2);
    this.glyph.position.set(0, -h / 2 + TILE_PAD + boxH / 2);
  }
}

/**
 * The four forms of the current letter in a row, right to left like the word they'd make; forms
 * it doesn't have are left as dashed slots. Positioned by its top middle.
 */
export class FormBar extends Container {
  private tiles: FormTile[];

  constructor(onSelect: (form: LETTER_FORMS) => void) {
    super();
    this.tiles = FORM_ORDER.map((form, i) => {
      const tile = new FormTile(form, onSelect);
      tile.resize(TILE_WIDTH, TILE_HEIGHT);
      // first form at the right-hand end
      const offset = ((FORM_ORDER.length - 1) / 2 - i) * (TILE_WIDTH + TILE_GAP);
      tile.position.set(offset, TILE_HEIGHT / 2);
      return tile;
    });
    this.addChild(...this.tiles);
  }

  update(letter: string, form: LETTER_FORMS) {
    for (const tile of this.tiles) tile.update(letter, tile.form === form);
  }
}
