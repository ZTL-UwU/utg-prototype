import { Container, FederatedPointerEvent, Graphics, Rectangle } from 'pixi.js';

export type StrokePoint = { x: number; y: number };
export type Stroke = { color: number; size: number; points: StrokePoint[] };

type DrawingCanvasOptions = {
  width?: number;
  height?: number;
  color?: number;
  size?: number;
  onChange?: (strokes: Stroke[]) => void;
};

export class DrawingCanvas extends Container {
  private board: Graphics;
  private boardWidth: number;
  private boardHeight: number;
  private color: number;
  private size: number;
  private strokes: Stroke[] = [];
  private activeStroke: Stroke | null = null;
  private pointerId: number | null = null;
  private readonly onChange?: (strokes: Stroke[]) => void;

  constructor({
    width = 640,
    height = 480,
    color = 0x1c1c1c,
    size = 6,
    onChange,
  }: DrawingCanvasOptions = {}) {
    super();
    this.onChange = onChange;

    this.boardWidth = width;
    this.boardHeight = height;
    this.color = color;
    this.size = size;

    this.board = new Graphics();
    this.addChild(this.board);

    this.eventMode = 'static';
    this.cursor = 'crosshair';
    this.hitArea = new Rectangle(0, 0, width, height);

    this.on('pointerdown', (event) => this.handlePointerDown(event));
    this.on('pointermove', (event) => this.handlePointerMove(event));
    this.on('pointerup', (event) => this.handlePointerUp(event));
    this.on('pointerupoutside', (event) => this.handlePointerUp(event));
    this.on('pointercancel', () => this.handlePointerCancel());

    this.redraw();
  }

  public getStrokes(): Stroke[] {
    return this.strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point })),
    }));
  }

  public loadStrokes(strokes: Stroke[]) {
    this.strokes = strokes.map((stroke) => ({
      color: stroke.color,
      size: stroke.size,
      points: stroke.points.map((point) => ({ ...point })),
    }));
    this.activeStroke = null;
    this.pointerId = null;
    this.redraw();
    this.onChange?.(this.getStrokes());
  }

  public clear() {
    this.strokes = [];
    this.activeStroke = null;
    this.pointerId = null;
    this.redraw();
    this.onChange?.(this.getStrokes());
  }

  public undo() {
    this.strokes.pop();
    this.redraw();
    this.onChange?.(this.getStrokes());
  }

  public get isEmpty() {
    return this.strokes.length === 0;
  }

  public setSize(size: number) {
    this.size = size;
  }

  public setColor(color: number) {
    this.color = color;
  }

  public resize(width: number, height: number) {
    this.boardWidth = width;
    this.boardHeight = height;
    this.hitArea = new Rectangle(0, 0, width, height);
    this.redraw();
  }

  private redraw() {
    this.board.clear();
    this.board
      .rect(0, 0, this.boardWidth, this.boardHeight)
      .fill({ color: 0xffffff })
      .stroke({ width: 2, color: 0xd0d5dd });
    for (const stroke of this.strokes) {
      this.drawStroke(stroke);
    }
    if (this.activeStroke) {
      this.drawStroke(this.activeStroke);
    }
  }

  private drawStroke(stroke: Stroke) {
    if (stroke.points.length === 0) return;

    const [first, ...rest] = stroke.points;
    if (rest.every((point) => point.x === first.x && point.y === first.y)) {
      this.board.circle(first.x, first.y, stroke.size / 2).fill(stroke.color);
      return;
    }

    this.board.moveTo(first.x, first.y);
    for (const point of rest) {
      this.board.lineTo(point.x, point.y);
    }
    this.board.stroke({
      width: stroke.size,
      color: stroke.color,
      cap: 'round',
      join: 'round',
    });
  }

  private handlePointerDown(event: FederatedPointerEvent) {
    this.pointerId = event.pointerId;
    this.activeStroke = {
      color: this.color,
      size: this.size,
      points: [this.toBoardPoint(event)],
    };
    this.redraw();
  }

  private handlePointerMove(event: FederatedPointerEvent) {
    if (this.pointerId !== event.pointerId || !this.activeStroke) return;
    this.activeStroke.points.push(this.toBoardPoint(event));
    this.redraw();
  }

  private handlePointerUp(event: FederatedPointerEvent) {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;
    if (this.activeStroke) {
      this.activeStroke.points.push(this.toBoardPoint(event));
      this.strokes.push(this.activeStroke);
      this.activeStroke = null;
      this.redraw();
      this.onChange?.(this.getStrokes());
    }
  }

  private handlePointerCancel() {
    this.pointerId = null;
    this.activeStroke = null;
    this.redraw();
  }

  private toBoardPoint(event: FederatedPointerEvent): StrokePoint {
    const local = this.toLocal(event.global);
    return {
      x: Math.round(local.x),
      y: Math.round(local.y),
    };
  }
}
