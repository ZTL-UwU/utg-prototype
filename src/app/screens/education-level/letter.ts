import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

export type LetterFeedback = 'none' | 'error' | 'success';

type LetterOptions = {
  letter: string;
  cardSize?: number;
  cornerRadius?: number;
};

const cardColors = {
  default: 0x5a8cd4,
  success: 0x8ec24d,
  error: 0xef5a42,
};

const shadowColors = {
  default: 0x020023,
  success: 0x74a637,
  error: 0xd4452f,
};

export class Letter extends Container {
  private readonly contentContainer: Container;
  private readonly feedbackContainer = new Container();
  private readonly focusContainer = new Container();
  private readonly shadow = new Graphics();
  private readonly card = new Graphics();
  private readonly cardSize: number;
  private readonly cornerRadius: number;

  private feedback: LetterFeedback = 'none';
  //   private isActive = false;
  private focusAnimation?: AnimationPlaybackControls;
  private contentAnimation?: AnimationPlaybackControls;

  constructor({ letter, cardSize = 88, cornerRadius = 18 }: LetterOptions) {
    super({
      layout: {
        width: cardSize,
        height: cardSize,
        flexShrink: 0,
      },
    });

    this.cardSize = cardSize;
    this.cornerRadius = cornerRadius;
    this.contentContainer = new Container({
      layout: {
        width: cardSize,
        height: cardSize,
        alignItems: 'center',
        justifyContent: 'center',
        transformOrigin: 'center',
      },
    });
    this.focusContainer.layout = {
      width: cardSize,
      height: cardSize,
      transformOrigin: 'center',
    };

    const letterLabel = new Text({
      text: letter,
      resolution: 2,
      style: {
        align: 'center',
        fill: 0xffffff,
        fontFamily: 'Noto Sans Arabic',
        fontSize: cardSize * 0.48,
        fontWeight: '700',
        padding: 20,
      },
    });
    letterLabel.layout = true;

    this.drawShadow();
    this.drawCard();
    this.contentContainer.addChild(this.shadow, this.card, letterLabel);
    this.feedbackContainer.addChild(this.contentContainer);
    this.focusContainer.addChild(this.feedbackContainer);
    this.addChild(this.focusContainer);
  }

  setFeedback(feedback: LetterFeedback, animateFeedback = true) {
    if (this.feedback === feedback && !animateFeedback) return;

    this.feedback = feedback;
    this.drawShadow();
    this.drawCard();

    if (!animateFeedback) return;

    if (feedback === 'success') {
      this.pulse();
    } else if (feedback === 'error') {
      this.shake();
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    console.log('destroy');
    this.focusAnimation?.stop();
    this.contentAnimation?.stop();
    super.destroy(options);
  }

  private drawShadow() {
    const shadowColor = shadowColors[this.feedback === 'none' ? 'default' : this.feedback];

    this.shadow
      .clear()
      .roundRect(0, 10, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: shadowColor });
  }

  private drawCard() {
    const fillColor = cardColors[this.feedback === 'none' ? 'default' : this.feedback];

    this.card
      .clear()
      .roundRect(0, 0, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: fillColor });
  }

  private pulse() {
    this.contentContainer.rotation = 0;
    this.contentAnimation = animate([
      [this.contentContainer.scale, { x: 1.12, y: 1.12 }, { duration: 0.14, ease: 'backOut' }],
      [
        this.contentContainer.scale,
        { x: 1, y: 1 },
        { type: 'spring', bounce: 0.35, duration: 0.48 },
      ],
    ]);
  }

  private shake() {
    this.contentContainer.rotation = 0;
    const deg = Math.PI / 180;
    this.contentAnimation = animate([
      [this.contentContainer, { rotation: -16 * deg }, { duration: 0.04, ease: 'linear' }],
      [this.contentContainer, { rotation: 16 * deg }, { duration: 0.08, ease: 'linear' }],
      [this.contentContainer, { rotation: -10 * deg }, { duration: 0.08, ease: 'linear' }],
      [this.contentContainer, { rotation: 6 * deg }, { duration: 0.08, ease: 'linear' }],
      [this.contentContainer, { rotation: 0 }, { duration: 0.06, ease: 'easeOut' }],
    ]);
  }
}
