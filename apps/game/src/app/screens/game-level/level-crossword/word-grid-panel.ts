import { Container, type FederatedPointerEvent, Graphics, Point } from 'pixi.js';

import type { GridCell } from './grid';
import { WordSearchTile } from './word-search-tile';

const TILE_SIZE = 64;
const TILE_GAP = 6;
const PADDING = 20;
const PANEL_RADIUS = 44;
const APPEAR_STAGGER = 0.015;
/** Round hit area per tile, so diagonal drags don't clip neighbouring corners. */
const HIT_RADIUS = TILE_SIZE * 0.42;
/** Max distance between sampled points along a drag, so fast swipes don't skip tiles. */
const DRAG_SAMPLE_STEP = TILE_SIZE / 3;

export type WordGridPanelOptions = {
  /** Fires on every tile tap or drag step, even while the grid is locked. */
  onTilePress?: () => void;
  /** Fires after a tap or drag selects or deselects a tile (never while locked). */
  onSelectionChange?: () => void;
};

export class WordGridPanel extends Container {
  public readonly panelWidth: number;
  public readonly panelHeight: number;

  private readonly tiles: WordSearchTile[] = [];
  private readonly rows: number;
  private readonly cols: number;
  private readonly onTilePress?: () => void;
  private readonly onSelectionChange?: () => void;
  private selected: WordSearchTile[] = [];
  private locked = false;

  // active pointer; a drag starts once it reaches a tile other than startTile
  private pointerId?: number;
  private startTile?: WordSearchTile;
  private dragging = false;
  private path: WordSearchTile[] = [];
  private lastPoint = new Point();
  /** Tiles already selected when the drag began; backtracking leaves them selected. */
  private preSelected = new Set<WordSearchTile>();

  constructor(matrix: GridCell[][], { onTilePress, onSelectionChange }: WordGridPanelOptions = {}) {
    super();
    this.onTilePress = onTilePress;
    this.onSelectionChange = onSelectionChange;

    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    this.rows = rows;
    this.cols = cols;
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
        const tile = new WordSearchTile({ letter: cell.value, row, col, size: TILE_SIZE });
        tile.position.set(
          PADDING + col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
          PADDING + row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
        );
        this.tiles.push(tile);
        this.addChild(tile);
      });
    });

    this.eventMode = 'static';
    this.on('pointerdown', this.handlePointerDown);
  }

  public getSelected(): readonly WordSearchTile[] {
    return this.selected;
  }

  public clearSelection() {
    this.selected.forEach((tile) => tile.setSelected(false));
    this.selected = [];
    this.path = [];
    this.preSelected.clear();
  }

  public setLocked(locked: boolean) {
    this.locked = locked;
  }

  public async playAppear() {
    await Promise.all(
      this.tiles.map((tile) => tile.playAppear((tile.row + tile.col) * APPEAR_STAGGER)),
    );
  }

  /** Flash the tiles at the given [row, col] cells. */
  public showHint(cells: readonly [number, number][]) {
    cells.forEach(([row, col]) => void this.tiles[row * this.cols + col]?.showHint());
  }

  public override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.endPointer();
    this.off('pointerdown', this.handlePointerDown);
    super.destroy(options);
  }

  /** Tile under a point in panel-local space, or undefined if it falls in a gap. */
  private tileAt(local: Point): WordSearchTile | undefined {
    const stride = TILE_SIZE + TILE_GAP;
    const col = Math.floor((local.x - PADDING + TILE_GAP / 2) / stride);
    const row = Math.floor((local.y - PADDING + TILE_GAP / 2) / stride);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return undefined;

    const cx = PADDING + col * stride + TILE_SIZE / 2;
    const cy = PADDING + row * stride + TILE_SIZE / 2;
    if (Math.hypot(local.x - cx, local.y - cy) > HIT_RADIUS) return undefined;
    return this.tiles[row * this.cols + col];
  }

  private readonly handlePointerDown = (e: FederatedPointerEvent) => {
    if (this.pointerId !== undefined) return;
    const local = this.toLocal(e.global);
    const tile = this.tileAt(local);
    if (!tile) return;

    this.onTilePress?.();
    this.pointerId = e.pointerId;
    this.startTile = tile;
    this.dragging = false;
    this.lastPoint.copyFrom(local);

    this.on('globalpointermove', this.handlePointerMove);
    this.on('pointerup', this.handlePointerUp);
    this.on('pointerupoutside', this.handlePointerUp);
  };

  private readonly handlePointerMove = (e: FederatedPointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    if (this.locked) {
      // a word resolved mid-drag (or the level ended): let the rest of this drag go
      if (this.dragging) this.endPointer();
      return;
    }

    const local = this.toLocal(e.global);
    const dx = local.x - this.lastPoint.x;
    const dy = local.y - this.lastPoint.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / DRAG_SAMPLE_STEP));
    const sample = new Point();
    for (let i = 1; i <= steps; i++) {
      sample.set(this.lastPoint.x + (dx * i) / steps, this.lastPoint.y + (dy * i) / steps);
      const tile = this.tileAt(sample);
      if (tile) this.dragOver(tile);
      if (this.pointerId === undefined) return; // drag ended by a resolve
    }
    this.lastPoint.copyFrom(local);
  };

  private dragOver(tile: WordSearchTile) {
    const last = this.path[this.path.length - 1] ?? this.startTile;
    if (!last || tile === last) return;

    if (!this.dragging) {
      this.dragging = true;
      this.preSelected = new Set(this.selected);
      this.path = [last];
      this.addTile(last);
      // the start tile keeps setSelected's pop rather than a stretch
    }

    if (tile === this.path[this.path.length - 2]) {
      const popped = this.path.pop()!;
      if (!this.preSelected.has(popped)) this.removeTile(popped);
      tile.playStretch(Math.sign(tile.row - popped.row), Math.sign(tile.col - popped.col));
    } else if (!this.path.includes(tile)) {
      this.path.push(tile);
      this.addTile(tile);
      tile.playStretch(Math.sign(tile.row - last.row), Math.sign(tile.col - last.col));
    } else {
      return;
    }

    this.onTilePress?.();
    this.onSelectionChange?.();
    if (this.locked) this.endPointer();
  }

  private readonly handlePointerUp = (e: FederatedPointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    const tile = this.startTile;
    const wasDrag = this.dragging;
    this.endPointer();
    if (!wasDrag && tile) this.toggleTile(tile);
  };

  private endPointer() {
    this.off('globalpointermove', this.handlePointerMove);
    this.off('pointerup', this.handlePointerUp);
    this.off('pointerupoutside', this.handlePointerUp);
    this.pointerId = undefined;
    this.startTile = undefined;
    this.dragging = false;
    this.path = [];
    this.preSelected.clear();
  }

  private toggleTile(tile: WordSearchTile) {
    if (this.locked) return;
    if (tile.isSelected) this.removeTile(tile);
    else this.addTile(tile);
    this.onSelectionChange?.();
  }

  private addTile(tile: WordSearchTile) {
    if (tile.isSelected) return;
    tile.setSelected(true);
    this.selected.push(tile);
  }

  private removeTile(tile: WordSearchTile) {
    tile.setSelected(false);
    this.selected = this.selected.filter((item) => item !== tile);
  }
}
