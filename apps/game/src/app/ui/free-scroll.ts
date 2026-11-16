import {
  Rectangle,
  type Container,
  type FederatedPointerEvent,
  type FederatedWheelEvent,
} from 'pixi.js';

/** Finger travel before a press counts as a scroll and no longer taps what is under it. */
const DRAG_THRESHOLD = 12;

/**
 * Plain vertical drag-to-scroll for tall phone maps: the content follows the finger 1:1,
 * clamped to its bounds, with no inertia or easing. Mouse wheels scroll it too.
 */
export class FreeScroll {
  public scrollY = 0;
  /** True once the current press moved far enough to be a scroll; taps should check it. */
  public dragged = false;
  private enabled = false;
  private viewHeight = 0;
  private contentHeight = 0;
  private dragStartY?: number;
  private dragStartScroll = 0;
  private readonly target: Container;
  private readonly content: Container;
  private readonly onScroll?: (scrollY: number) => void;

  constructor(target: Container, content: Container, onScroll?: (scrollY: number) => void) {
    this.target = target;
    this.content = content;
    this.onScroll = onScroll;
    target.eventMode = 'static';
    target.on('pointerdown', this.onDragStart, this);
    target.on('globalpointermove', this.onDragMove, this);
    target.on('pointerup', this.onDragEnd, this);
    target.on('pointerupoutside', this.onDragEnd, this);
    target.on('wheel', this.onWheel, this);
  }

  /** Call from `resize`; `enabled` is false on layouts that fit the screen. */
  public setBounds(viewWidth: number, viewHeight: number, contentHeight: number, enabled: boolean) {
    this.target.hitArea = new Rectangle(0, 0, viewWidth, viewHeight);
    this.viewHeight = viewHeight;
    this.contentHeight = contentHeight;
    this.enabled = enabled;
    this.setScroll(enabled ? this.scrollY : 0);
  }

  public setScroll(y: number) {
    const min = Math.min(0, this.viewHeight - this.contentHeight);
    this.scrollY = Math.min(0, Math.max(min, y));
    this.content.y = this.scrollY;
    this.onScroll?.(this.scrollY);
  }

  private onDragStart(event: FederatedPointerEvent) {
    this.dragged = false;
    if (!this.enabled) return;
    this.dragStartY = event.global.y;
    this.dragStartScroll = this.scrollY;
  }

  private onDragMove(event: FederatedPointerEvent) {
    if (this.dragStartY === undefined) return;
    const delta = event.global.y - this.dragStartY;
    if (Math.abs(delta) > DRAG_THRESHOLD) this.dragged = true;
    if (this.dragged) this.setScroll(this.dragStartScroll + delta);
  }

  private onDragEnd() {
    this.dragStartY = undefined;
  }

  private onWheel(event: FederatedWheelEvent) {
    if (!this.enabled) return;
    this.setScroll(this.scrollY - event.deltaY);
  }
}
