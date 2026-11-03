import { Container, NineSliceSprite, Sprite, Texture } from 'pixi.js';

import { responsive } from '../../../engine/utils/viewport';

/** Where the book is drawn inside its image, as shares of the image's width and height. */
export type BookArt = {
  /** Width of the book, between its covers' outer edges. */
  width: number;
  /** Top of the book: the page corners above the dip at the spine. */
  top: number;
  /** Bottom of the curved page tops, kept unstretched on phones. */
  pagesTop: number;
  /** Height of the book's bottom edge, kept unstretched on phones. */
  bottom: number;
};

/** `book.svg` of the story level: an orange book filling its image. */
export const ORANGE_BOOK_ART: BookArt = { width: 1, top: 0, pagesTop: 0.16, bottom: 0.16 };
/** `book.svg` of the goat and spring levels: a blue book cut off at its image's bottom. */
export const BLUE_BOOK_ART: BookArt = { width: 0.889, top: 0.048, pagesTop: 0.23, bottom: 0 };

/** Wide screens: the book fills most of the view, and its bottom may run past the screen edge. */
const WIDE_WIDTH_RATIO = 0.9;
const WIDE_HEIGHT_RATIO = 1.05;
const WIDE_CENTER_Y_RATIO = 0.6;
/** Wide screens: the sentence's center, above the book's center, as a share of its height. */
const WIDE_SENTENCE_RAISE = 0.18;
/** Phones: the book's top, just under the progress bar and corner buttons. */
const PHONE_BOOK_TOP = 170;
/** Phones: how far the book runs past the screen's bottom, so its edge never shows. */
const PHONE_BOTTOM_OVERRUN = 40;
/** Phones: the least space between the curved page tops and the sentence. */
const PHONE_SENTENCE_MARGIN = 30;
/** Phones: the sentence's wrap width, as a share of the screen width. */
const PHONE_WRAP_RATIO = 0.78;

/**
 * The open book of the sentence-typing levels. Wide screens stretch the picture to most of the
 * view. Phones fit the book's covers to the screen's sides and run it down past the bottom;
 * only the plain pages stretch, so the curved page tops keep their shape.
 */
export class Book extends Container {
  private readonly art: BookArt;
  private readonly wide?: Sprite;
  private readonly phone?: NineSliceSprite;

  constructor(alias: string, art: BookArt) {
    super();
    this.art = art;
    const texture = Texture.from(alias);

    if (responsive({ sm: true, lg: false })) {
      this.phone = new NineSliceSprite({
        texture,
        leftWidth: 0,
        rightWidth: 0,
        topHeight: art.pagesTop * texture.height,
        bottomHeight: art.bottom * texture.height,
      });
      this.addChild(this.phone);
    } else {
      this.wide = new Sprite({ texture, anchor: 0.5 });
      this.addChild(this.wide);
    }
  }

  /**
   * Fits the book to the screen. Returns the width to wrap the sentence to, and where to center
   * a sentence box `sentenceHeight` tall so it sits on the pages.
   */
  public fit(width: number, height: number, keyboardTop: number, sentenceHeight: number) {
    if (this.phone) {
      const { width: textureWidth, height: textureHeight } = this.phone.texture;
      const scale = width / (this.art.width * textureWidth);
      const top = PHONE_BOOK_TOP - this.art.top * textureHeight * scale;

      this.phone.width = textureWidth;
      this.phone.height = Math.max(
        (height + PHONE_BOTTOM_OVERRUN - top) / scale,
        (this.art.pagesTop + this.art.bottom) * textureHeight,
      );
      this.phone.scale.set(scale);
      this.phone.position.set((width - textureWidth * scale) / 2, top);

      // Center the sentence on the pages left between the curved tops and the keyboard.
      const pagesTop = top + this.art.pagesTop * textureHeight * scale;
      const sentenceY = Math.max(
        (pagesTop + keyboardTop) / 2,
        pagesTop + PHONE_SENTENCE_MARGIN + sentenceHeight / 2,
      );
      return { wrapWidth: width * PHONE_WRAP_RATIO, sentenceY };
    }

    const bookWidth = width * WIDE_WIDTH_RATIO;
    const bookHeight = height * WIDE_HEIGHT_RATIO;
    this.wide!.setSize(bookWidth, bookHeight);
    this.wide!.position.set(width / 2, height * WIDE_CENTER_Y_RATIO);
    return {
      // Keep the wrapped sentence inside the page margins so nothing clips at the edges.
      wrapWidth: Math.min(width * 0.82, bookWidth * 0.62),
      sentenceY: this.wide!.y - bookHeight * WIDE_SENTENCE_RAISE,
    };
  }
}
