import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';

export type LetterFeedback = 'none' | 'error' | 'success';

type LetterOptions = {
  letter: string;
  cardSize?: number;
  cornerRadius?: number;
};

const CARD_COLOR = 0x8d6241;
const ACTIVE_COLOR = 0xc98144;
const SHADOW_COLOR = 0x66432c;
const SUCCESS_COLOR = 0x8ec24d;
const ERROR_COLOR = 0xef5a42;

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
        fontFamily: 'Noto Naskh Arabic',
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
    gsap.killTweensOf(this.feedbackContainer);
    gsap.killTweensOf(this.contentContainer.scale);
    super.destroy(options);
  }

  private drawShadow() {
    this.shadow
      .clear()
      .roundRect(0, 10, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: SHADOW_COLOR });
  }

  private drawCard() {
    const fillColor =
      this.feedback === 'success'
        ? SUCCESS_COLOR
        : this.feedback === 'error'
          ? ERROR_COLOR
          : this.isActive
            ? ACTIVE_COLOR
            : CARD_COLOR;

    this.card
      .clear()
      .roundRect(0, 0, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: fillColor });
  }

  private pulse() {
    gsap.killTweensOf(this.contentContainer.scale);
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
    gsap.killTweensOf(this.feedbackContainer);
    this.feedbackContainer.x = 0;
    gsap
      .timeline()
      .to(this.feedbackContainer, { x: -12, duration: 0.04, ease: 'none' })
      .to(this.feedbackContainer, { x: 12, duration: 0.08, ease: 'none' })
      .to(this.feedbackContainer, { x: -8, duration: 0.08, ease: 'none' })
      .to(this.feedbackContainer, { x: 5, duration: 0.08, ease: 'none' })
      .to(this.feedbackContainer, { x: 0, duration: 0.06, ease: 'power2.out' });
  }
}
