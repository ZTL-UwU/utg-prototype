import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';

export type LetterFeedback = 'none' | 'error' | 'success';

type LetterOptions = {
  letter: string;
  cardSize?: number;
  cornerRadius?: number;
};

const cardColors = {
  default: 0x8d6241,
  active: 0xc98144,
  success: 0x8ec24d,
  error: 0xef5a42,
};

const shadowColors = {
  default: 0x66432c,
  active: 0xab6a33,
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
  private isActive = false;

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

  setActive(isActive: boolean) {
    if (this.isActive === isActive) return;

    this.isActive = isActive;
    this.drawShadow();
    this.drawCard();
    gsap.to(this.focusContainer.scale, {
      x: isActive ? 1.06 : 1,
      y: isActive ? 1.06 : 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  setFeedback(feedback: LetterFeedback, animate = true) {
    if (this.feedback === feedback && !animate) return;

    this.feedback = feedback;
    this.drawShadow();
    this.drawCard();

    if (!animate) return;

    if (feedback === 'success') {
      this.pulse();
    } else if (feedback === 'error') {
      this.shake();
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    gsap.killTweensOf(this.focusContainer.scale);
    gsap.killTweensOf(this.contentContainer);
    super.destroy(options);
  }

  private drawShadow() {
    const shadowColor =
      shadowColors[
        this.feedback === 'none' ? (this.isActive ? 'active' : 'default') : this.feedback
      ];

    this.shadow
      .clear()
      .roundRect(0, 10, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: shadowColor });
  }

  private drawCard() {
    const fillColor =
      cardColors[this.feedback === 'none' ? (this.isActive ? 'active' : 'default') : this.feedback];

    this.card
      .clear()
      .roundRect(0, 0, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: fillColor });
  }

  private pulse() {
    gsap.killTweensOf(this.contentContainer);
    this.contentContainer.rotation = 0;
    gsap
      .timeline()
      .to(this.contentContainer.scale, {
        x: 1.12,
        y: 1.12,
        duration: 0.14,
        ease: 'back.out(2.2)',
      })
      .to(this.contentContainer.scale, {
        x: 1,
        y: 1,
        duration: 0.48,
        ease: 'elastic.out(1, 0.38)',
      });
  }

  private shake() {
    gsap.killTweensOf(this.contentContainer);
    this.contentContainer.rotation = 0;

    const deg = Math.PI / 180;
    gsap
      .timeline()
      .to(this.contentContainer, { rotation: -16 * deg, duration: 0.04, ease: 'none' })
      .to(this.contentContainer, { rotation: 16 * deg, duration: 0.08, ease: 'none' })
      .to(this.contentContainer, { rotation: -10 * deg, duration: 0.08, ease: 'none' })
      .to(this.contentContainer, { rotation: 6 * deg, duration: 0.08, ease: 'none' })
      .to(this.contentContainer, { rotation: 0, duration: 0.06, ease: 'power2.out' });
  }
}
