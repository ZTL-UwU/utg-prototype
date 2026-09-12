import { animate } from 'motion';
import { Container, Graphics, HTMLText, Sprite, Texture } from 'pixi.js';

import type { Round } from '.';
import { createTypingWordStyle, getHighlightedWordMarkup } from '../../../../utils/example-words';
import { getWordImageAlias } from '../../../../zustandStores/wordStore';

const FONT_SIZE = 100;
const CARD_WIDTH = 200;
const PAD_Y = 32;
const PAD_X = 48;
const SHADOW_OFFSET = 8;
const CONTENT_GAP = 72;
const IMAGE_SIZE = 300;
const CARD_COLORS = {
  default: 0x7e5433,
  error: 0xef5a42,
  success: 0x8ec24d,
};

export type TypingWordCardFeedback = keyof typeof CARD_COLORS;

/** A word on a tinted card, with the word's image beside it when it has one. */
export class TypingWordCard extends Container {
  private readonly wordStyle = createTypingWordStyle(FONT_SIZE, 0xffffff);
  private readonly card = new Graphics();
  private readonly cardShadow = new Graphics();
  private readonly wordContainer = new Container();
  private readonly wordText = new HTMLText({ style: this.wordStyle });
  private image?: Sprite;
  private word = '';

  constructor() {
    super({
      layout: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: CONTENT_GAP,
      },
    });
    this.wordContainer.addChild(this.cardShadow, this.card, this.wordText);
  }

  /** Shows the round's word from its active letter, replacing the previous word and image. */
  setRound({ wordId, word, activeLetterIdx, hasImage }: Round) {
    this.removeChildren();
    this.image?.destroy();
    // Words without an image have no entry in the words bundle, so asking for the
    // texture would only warn and hand back an empty one taking up a slot in the row.
    this.image = hasImage
      ? new Sprite({
          texture: Texture.from(getWordImageAlias(wordId)),
          layout: { width: IMAGE_SIZE, height: IMAGE_SIZE, flexShrink: 0 },
        })
      : undefined;

    this.word = word;
    this.setProgress(activeLetterIdx);
    if (this.image) this.addChild(this.image);
    this.addChild(this.wordContainer);
    this.drawCard();
  }

  setProgress(activeLetterIdx: number) {
    const len = this.word[activeLetterIdx].length;
    this.wordText.text = getHighlightedWordMarkup(this.word, activeLetterIdx, len);
  }

  setFeedback(feedback: TypingWordCardFeedback) {
    this.card.tint = CARD_COLORS[feedback];
  }

  async playSuccessFlash(): Promise<void> {
    this.card.tint = CARD_COLORS.success;

    const controls = animate(
      this.wordContainer.scale,
      { x: 1.12, y: 1.12 },
      { duration: 0.15, ease: 'easeOut', repeat: 1, repeatType: 'reverse' },
    );
    await controls.finished;
  }

  private drawCard() {
    // measure the rendered word
    const b = this.wordText.getLocalBounds();
    const cardW = Math.max(CARD_WIDTH, b.width + PAD_X * 2); // fit, with a floor
    const cardH = FONT_SIZE + PAD_Y * 2;

    this.cardShadow
      .clear()
      .roundRect(SHADOW_OFFSET, SHADOW_OFFSET, cardW, cardH, 20)
      .fill(0x000000);
    this.cardShadow.alpha = 0.5;

    this.card.clear().roundRect(0, 0, cardW, cardH, 20).fill(0xffffff);
    this.card.tint = CARD_COLORS.default;

    this.wordText.anchor.set(0.5);
    this.wordText.position.set(cardW / 2, cardH / 2);

    this.wordContainer.layout = {
      width: cardW + SHADOW_OFFSET,
      height: cardH + SHADOW_OFFSET,
      flexShrink: 0,
    };
  }
}
