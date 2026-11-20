import { Container, Sprite, Texture } from 'pixi.js';

import { FreeScroll } from './free-scroll';

/**
 * A map of stops over a background that covers it, scrolled freely by dragging when it is
 * taller than the screen (phones). Subclasses add their stops to `content`, lay them out in
 * `resize`, then call `setContentHeight`.
 */
export class ScrollingMap extends Container {
  protected readonly content = new Container();
  protected readonly background: Sprite;
  private readonly scroll: FreeScroll;

  /** Fired whenever the map scrolls, so the screen can move its titles along. */
  public onScroll?: (scrollY: number) => void;

  constructor(backgroundAlias: string) {
    super();
    this.background = new Sprite({ texture: Texture.from(backgroundAlias), anchor: 0.5 });
    this.content.addChild(this.background);
    this.addChild(this.content);
    this.scroll = new FreeScroll(this, this.content, (scrollY) => this.onScroll?.(scrollY));
  }

  /** True once the current press moved far enough to be a scroll, so stops ignore the tap. */
  protected readonly isDragging = () => this.scroll.dragged;

  /** Size the scrollable area, and cover all of it with the background. */
  protected setContentHeight(
    width: number,
    height: number,
    contentHeight: number,
    scrollable: boolean,
  ) {
    this.scroll.setBounds(width, height, contentHeight, scrollable);
    // Cover the whole map, cropping whichever sides overflow
    const texture = this.background.texture;
    this.background.scale.set(Math.max(width / texture.width, contentHeight / texture.height));
    this.background.position.set(width / 2, contentHeight / 2);
  }

  protected scrollTo(scrollY: number) {
    this.scroll.setScroll(scrollY);
  }

  /**
   * Brings a stop spanning `top` to `bottom` (content units) into view: one already on screen
   * leaves the map at the top, titles and all, and one below the fold is centred.
   */
  protected scrollIntoView(top: number, bottom: number, viewHeight: number) {
    this.scrollTo(bottom <= viewHeight ? 0 : viewHeight / 2 - (top + bottom) / 2);
  }
}
