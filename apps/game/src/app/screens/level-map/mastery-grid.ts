import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { responsive, topClearance } from '../../../engine/utils/viewport';
import { FreeScroll } from '../../ui/free-scroll';
import { MASTERY_BACKGROUND_ALIAS, MasteryTile } from './mastery-tile';
import { getLayerMaps } from './units';

/** Width over height of every tile. */
const TILE_ASPECT = 1.8;

/** Wide screens: a grid of columns centred under the title. */
const WIDE_COLUMNS = 3;
const WIDE_GRID_WIDTH = 0.84;
const WIDE_GAP = 14;
const WIDE_TOP = 250;
const WIDE_BOTTOM = 60;

/** Phones: one full-width tile per row, in a list scrolled by dragging. */
const PHONE_GUTTER = 16;
const PHONE_GAP = 20;
// Room kept above the list for the title
const PHONE_TOP = 330;
const PHONE_BOTTOM = 120;

/**
 * The game layer's map: one tile per game level across every game unit, numbered in course
 * order. A grid on wide screens; on phones a full-width list scrolled freely, as is the grid
 * whenever the levels outgrow the screen.
 */
export class MasteryGrid extends Container {
  private readonly content = new Container();
  private readonly background: Sprite;
  private readonly tiles: MasteryTile[];
  private readonly scroll: FreeScroll;

  /** Fired whenever the list scrolls, so the screen can move its title along. */
  public onScroll?: (scrollY: number) => void;
  /** Where the screen's title ends, so the tiles start below it; the defaults are a fallback. */
  public titleBottom?: number;

  constructor() {
    super();

    this.background = new Sprite({ texture: Texture.from(MASTERY_BACKGROUND_ALIAS), anchor: 0.5 });
    const levels = getLayerMaps('game').flatMap((mapUnit) => mapUnit.levels);
    this.tiles = levels.map(
      (level, index) => new MasteryTile(level, index + 1, () => this.scroll.dragged),
    );
    this.content.addChild(this.background, ...this.tiles);
    this.addChild(this.content);

    this.scroll = new FreeScroll(this, this.content, (scrollY) => this.onScroll?.(scrollY));
  }

  public resize(width: number, height: number) {
    const phone = responsive({ sm: true, lg: false });
    const columns = phone ? 1 : WIDE_COLUMNS;
    const gap = phone ? PHONE_GAP : WIDE_GAP;
    const top =
      this.titleBottom !== undefined
        ? this.titleBottom + (phone ? PHONE_GAP : WIDE_GAP) * 2
        : (phone ? PHONE_TOP : WIDE_TOP) + topClearance(height);
    const rows = Math.ceil(this.tiles.length / columns);
    let tileWidth =
      ((phone ? width - 2 * PHONE_GUTTER : width * WIDE_GRID_WIDTH) - (columns - 1) * gap) /
      columns;
    if (!phone) {
      // Shrink to keep the whole grid on screen; only very long level lists scroll
      const room = height - top - WIDE_BOTTOM - (Math.min(rows, 3) - 1) * gap;
      tileWidth = Math.min(tileWidth, (room / Math.min(rows, 3)) * TILE_ASPECT);
    }
    const tileHeight = tileWidth / TILE_ASPECT;
    const left = (width - (columns * tileWidth + (columns - 1) * gap)) / 2;

    this.tiles.forEach((tile, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      tile.setSize(tileWidth, tileHeight);
      tile.position.set(
        left + column * (tileWidth + gap) + tileWidth / 2,
        top + row * (tileHeight + gap) + tileHeight / 2,
      );
    });

    const contentHeight = Math.max(
      height,
      top + rows * tileHeight + Math.max(rows - 1, 0) * gap + (phone ? PHONE_BOTTOM : WIDE_BOTTOM),
    );
    this.scroll.setBounds(width, height, contentHeight, contentHeight > height);

    // Cover the whole list, cropping whichever sides overflow
    const texture = this.background.texture;
    this.background.scale.set(Math.max(width / texture.width, contentHeight / texture.height));
    this.background.position.set(width / 2, contentHeight / 2);
  }

  public async playEnterAnimation() {
    await Promise.all(this.tiles.map((tile, index) => tile.playEnter(index * 0.04)));
  }

  public async playExitAnimation() {
    await Promise.all(this.tiles.map((tile) => animate(tile, { alpha: 0 }, { duration: 0.2 })));
  }
}
