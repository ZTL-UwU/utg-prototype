import { animate } from 'motion';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { getFontFamilyForScript } from '../../../utils/script';
import {
  addHover,
  FRAME_COLOR,
  FRAME_SHADOW_COLOR,
  LABEL_COLOR,
  NAV_COLOR,
  NAV_SHADOW_COLOR,
  TILE_COLOR,
  TILE_EDGE_COLOR,
  TILE_TEXT_COLOR,
} from './controls';

const ARABIC_FONT = getFontFamilyForScript('Arabic');
const PANEL_COLOR = 0xfaf1de;
const BORDER_WIDTH = 6;
const SHADOW_OFFSET = 8;
const HOVER_SCALE = 1.05;

export const CHIP_WIDTH = 280;
export const CHIP_HEIGHT = 96;
/** Letter, caret and position, left to right, about the chip's centre. */
const CHIP_GLYPH_X = -78;
const CHIP_CARET_X = -14;
const CHIP_COUNT_X = 14;
const CARET_SIZE = 12;

const SHEET_COLUMNS = 8;
const SHEET_TILE_SIZE = 100;
const SHEET_TILE_GAP = 16;
const SHEET_PAD = 28;
const SHEET_RADIUS = 32;
/** Space between the chip and the sheet that drops from it, and around the sheet's edges. */
const SHEET_OFFSET = 20;
const SHEET_MARGIN = 24;
const SCRIM_ALPHA = 0.35;
/** Seconds the sheet takes to appear: the scrim fades in, the panel grows from this share of its size. */
const APPEAR_DURATION = 0.15;
const APPEAR_SCALE = 0.95;

function drawPill(g: Graphics, w: number, h: number, fill: number, shadow: number, edge?: number) {
  g.clear()
    .roundRect(-w / 2, -h / 2 + SHADOW_OFFSET, w, h, h / 2)
    .fill(shadow)
    .roundRect(-w / 2, -h / 2, w, h, h / 2)
    .fill(fill);
  if (edge !== undefined) {
    g.roundRect(-w / 2, -h / 2, w, h, h / 2).stroke({ width: BORDER_WIDTH, color: edge });
  }
}

/** One letter in the sheet: teal where you are, with a dot once it's been practised. */
class LetterTile extends Container {
  private bg = new Graphics();
  private text: Text;
  private dot: Graphics;
  private current = false;
  private practised = false;

  constructor(letter: string, onPress: () => void) {
    super();
    this.text = new Text({
      text: letter,
      anchor: 0.5,
      resolution: 2,
      style: { fontFamily: ARABIC_FONT, fontSize: SHEET_TILE_SIZE * 0.5, padding: 30 },
    });
    this.dot = new Graphics().circle(0, SHEET_TILE_SIZE / 2 - 13, 6).fill(FRAME_COLOR);
    this.addChild(this.bg, this.text, this.dot);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', onPress);
    addHover(this, HOVER_SCALE);
    this.redraw();
  }

  setCurrent(current: boolean) {
    this.current = current;
    this.redraw();
  }

  setPractised(practised: boolean) {
    this.practised = practised;
    this.redraw();
  }

  private redraw() {
    const half = SHEET_TILE_SIZE / 2;
    this.bg
      .clear()
      .roundRect(-half, -half, SHEET_TILE_SIZE, SHEET_TILE_SIZE, 20)
      .fill(this.current ? NAV_COLOR : TILE_COLOR)
      .stroke({ width: 3, color: this.current ? NAV_SHADOW_COLOR : TILE_EDGE_COLOR });
    this.text.style.fill = this.current ? LABEL_COLOR : TILE_TEXT_COLOR;
    // teal already says where you are
    this.dot.visible = this.practised && !this.current;
  }
}

/** Shows the current letter and where it is in the alphabet; tap to open the alphabet sheet. */
export class LetterChip extends Container {
  private bg = new Graphics();
  private glyph: Text;
  private caret = new Graphics();
  private count: Text;

  constructor(onPress: () => void) {
    super();
    this.glyph = new Text({
      anchor: 0.5,
      resolution: 2,
      style: { fontFamily: ARABIC_FONT, fontSize: 52, fill: FRAME_COLOR, padding: 30 },
      position: { x: CHIP_GLYPH_X, y: 0 },
    });
    this.caret
      .poly([-CARET_SIZE, -CARET_SIZE / 2, CARET_SIZE, -CARET_SIZE / 2, 0, CARET_SIZE / 2])
      .fill(FRAME_COLOR)
      .stroke({ width: 4, color: FRAME_COLOR, join: 'round' });
    this.caret.position.set(CHIP_CARET_X, 0);
    this.count = new Text({
      anchor: { x: 0, y: 0.5 },
      resolution: 2,
      style: { fontFamily: 'Concert One', fontSize: 36, fill: FRAME_COLOR },
      position: { x: CHIP_COUNT_X, y: 0 },
    });
    drawPill(this.bg, CHIP_WIDTH, CHIP_HEIGHT, TILE_COLOR, TILE_EDGE_COLOR, FRAME_COLOR);
    this.addChild(this.bg, this.glyph, this.caret, this.count);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', onPress);
    addHover(this, HOVER_SCALE);
  }

  setLetter(letter: string, position: number, total: number) {
    this.glyph.text = letter;
    this.count.text = `${position}/${total}`;
  }

  /** The caret points up while the sheet is down, as a way back. */
  setOpen(open: boolean) {
    this.caret.rotation = open ? Math.PI : 0;
    drawPill(
      this.bg,
      CHIP_WIDTH,
      CHIP_HEIGHT,
      open ? LABEL_COLOR : TILE_COLOR,
      open ? FRAME_SHADOW_COLOR : TILE_EDGE_COLOR,
      FRAME_COLOR,
    );
  }
}

/**
 * Every letter in a grid, read right to left and top to bottom like the alphabet, dropping down
 * from the chip over a dimmed screen. Tap a letter to go to it, or anywhere else to close.
 */
export class AlphabetSheet extends Container {
  private scrim: Sprite;
  private panel = new Container();
  private tiles: LetterTile[];
  private currentIndex = -1;
  /** The panel's scale fitted to the screen, which it grows into as it appears. */
  private fitScale = 1;
  private readonly onSelect: (index: number) => void;
  private readonly onClose: () => void;

  constructor(
    letters: readonly string[],
    handlers: { onSelect: (index: number) => void; onClose: () => void },
  ) {
    super({ visible: false });
    this.onSelect = handlers.onSelect;
    this.onClose = handlers.onClose;

    this.scrim = new Sprite({
      texture: Texture.WHITE,
      tint: 0x000000,
      alpha: SCRIM_ALPHA,
      eventMode: 'static',
    });
    this.scrim.on('pointertap', () => this.close());

    const rows = Math.ceil(letters.length / SHEET_COLUMNS);
    const width =
      SHEET_COLUMNS * (SHEET_TILE_SIZE + SHEET_TILE_GAP) - SHEET_TILE_GAP + 2 * SHEET_PAD;
    const height = rows * (SHEET_TILE_SIZE + SHEET_TILE_GAP) - SHEET_TILE_GAP + 2 * SHEET_PAD;
    const bg = new Graphics()
      .roundRect(0, SHADOW_OFFSET, width, height, SHEET_RADIUS)
      .fill(FRAME_SHADOW_COLOR)
      .roundRect(0, 0, width, height, SHEET_RADIUS)
      .fill(PANEL_COLOR)
      .stroke({ width: BORDER_WIDTH, color: FRAME_COLOR });
    // the panel itself swallows taps between the tiles, so they don't close it
    bg.eventMode = 'static';

    this.tiles = letters.map((letter, i) => {
      const tile = new LetterTile(letter, () => {
        this.onSelect(i);
        this.close();
      });
      const column = SHEET_COLUMNS - 1 - (i % SHEET_COLUMNS);
      const row = Math.floor(i / SHEET_COLUMNS);
      tile.position.set(
        SHEET_PAD + column * (SHEET_TILE_SIZE + SHEET_TILE_GAP) + SHEET_TILE_SIZE / 2,
        SHEET_PAD + row * (SHEET_TILE_SIZE + SHEET_TILE_GAP) + SHEET_TILE_SIZE / 2,
      );
      return tile;
    });
    this.panel.addChild(bg, ...this.tiles);
    // grows from its top middle, just under the chip
    this.panel.pivot.set(width / 2, 0);
    this.addChild(this.scrim, this.panel);
  }

  get isOpen() {
    return this.visible;
  }

  setCurrent(index: number) {
    this.tiles[this.currentIndex]?.setCurrent(false);
    this.currentIndex = index;
    this.tiles[index].setCurrent(true);
  }

  markPractised(index: number) {
    this.tiles[index].setPractised(true);
  }

  open() {
    this.visible = true;
    // from and to both given: motion animates from the last value it set, not the current one
    const from = this.fitScale * APPEAR_SCALE;
    // only the scrim fades: a translucent panel over it would start out dark and brighten
    void animate(this.scrim, { alpha: [0, SCRIM_ALPHA] }, { duration: APPEAR_DURATION });
    void animate(
      this.panel.scale,
      { x: [from, this.fitScale], y: [from, this.fitScale] },
      { duration: APPEAR_DURATION, ease: 'easeOut' },
    );
  }

  close() {
    if (!this.visible) return;
    this.visible = false;
    this.onClose();
  }

  /** Lays the sheet under the chip whose bottom middle is at (`x`, `top`), scaled to fit. */
  resize(width: number, height: number, x: number, top: number) {
    this.scrim.setSize(width, height);
    const { width: w, height: h } = this.panel.getLocalBounds();
    const y = top + SHEET_OFFSET;
    const scale = Math.min(1, (width - 2 * SHEET_MARGIN) / w, (height - y - SHEET_MARGIN) / h);
    this.fitScale = scale;
    this.panel.scale.set(scale);
    // centred under the chip, but kept on screen
    const half = (w * scale) / 2;
    this.panel.position.set(
      Math.min(Math.max(x, SHEET_MARGIN + half), width - SHEET_MARGIN - half),
      y,
    );
  }
}
