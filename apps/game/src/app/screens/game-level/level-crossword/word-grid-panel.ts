import { Container, Graphics } from 'pixi.js';

import type { GridCell } from './grid';
import { WordSearchTile } from './word-search-tile';

const TILE_SIZE = 64;
const TILE_GAP = 6;
const PADDING = 20;
const PANEL_RADIUS = 44;
const APPEAR_STAGGER = 0.015;

export class WordGridPanel extends Container {
  public readonly panelWidth: number;
  public readonly panelHeight: number;

  private readonly tiles: WordSearchTile[] = [];
  private selected: WordSearchTile[] = [];
  private locked = false;

  constructor(matrix: GridCell[][]) {
    super();

    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    this.panelWidth = cols * TILE_SIZE + (cols - 1) * TILE_GAP + PADDING * 2;
    this.panelHeight = rows * TILE_SIZE + (rows - 1) * TILE_GAP + PADDING * 2;

    this.addChild(
      new Graphics()
        .roundRect(0, 16, this.panelWidth, this.panelHeight, PANEL_RADIUS)
        .fill({ color: 0x1b427a, alpha: 0.7 })
        .roundRect(0, 0, this.panelWidth, this.panelHeight, PANEL_RADIUS)
        .fill(0xd1dcf0),
    );

    // column 0 on the left; grid.ts runs words leftward (rtl) or rightward (ltr) to match
    matrix.forEach((cells, row) => {
      cells.forEach((cell, col) => {
        const tile = new WordSearchTile({
          letter: cell.value,
          row,
          col,
          size: TILE_SIZE,
          onPress: this.handleTilePress,
        });
        tile.position.set(
          PADDING + col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
          PADDING + row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
        );
        this.tiles.push(tile);
        this.addChild(tile);
      });
    });
  }

  public getSelected(): readonly WordSearchTile[] {
    return this.selected;
  }

  public clearSelection() {
    this.selected.forEach((tile) => tile.setSelected(false));
    this.selected = [];
  }

  public setLocked(locked: boolean) {
    this.locked = locked;
  }

  public async playAppear() {
    await Promise.all(
      this.tiles.map((tile) => tile.playAppear((tile.row + tile.col) * APPEAR_STAGGER)),
    );
  }

  private readonly handleTilePress = (tile: WordSearchTile) => {
    if (this.locked) return;

    if (tile.isSelected) {
      tile.setSelected(false);
      this.selected = this.selected.filter((item) => item !== tile);
    } else {
      tile.setSelected(true);
      this.selected.push(tile);
    }
  };
}
