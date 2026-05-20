import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';

export type LetterFeedback = 'none' | 'error' | 'success';

type LetterOptions = {
  letter: string;
  hint: string;
  cardColor: number;
  borderColor: number;
  cardSize?: number;
  cornerRadius?: number;
};

export class Letter extends Container {
  private readonly feedbackContainer = new Container();
  private readonly focusContainer = new Container();
  private readonly card = new Graphics();
  private readonly cardColor: number;
  private readonly borderColor: number;
  private readonly cardSize: number;
  private readonly cornerRadius: number;

  private feedback: LetterFeedback = 'none';
  private isActive = false;

  constructor({
    letter,
    hint,
    cardColor,
    borderColor,
    cardSize = 140,
    cornerRadius = 30,
  }: LetterOptions) {
    super();

    this.cardColor = cardColor;
    this.borderColor = borderColor;
    this.cardSize = cardSize;
    this.cornerRadius = cornerRadius;

    const letterLabel = new Text({
      text: letter,
      resolution: 2,
      style: {
        align: 'center',
        padding: 40,
        fill: 0xffffff,
        fontFamily: 'Noto Naskh Arabic',
        fontSize: cardSize * 0.42,
        fontWeight: '800',
      },
    });
    letterLabel.anchor.set(0.5);

    const hintLabel = new Text({
      text: hint,
      resolution: 2,
      style: {
        dropShadow: {
          blur: 10,
          alpha: 0.4,
          distance: 0,
        },
        align: 'center',
        padding: 10,
        fill: 0xffffff,
        fontFamily: 'Noto Sans',
        fontSize: 24,
        fontWeight: '900',
      },
    });
    hintLabel.anchor.set(0.5);
    hintLabel.y = 100;

    this.drawCard();
    this.feedbackContainer.addChild(this.card, letterLabel, hintLabel);
    this.focusContainer.addChild(this.feedbackContainer);
    this.addChild(this.focusContainer);
  }

  setActive(isActive: boolean) {
    if (this.isActive === isActive) return;

    this.isActive = isActive;
    gsap.to(this.focusContainer.scale, {
      x: isActive ? 1.8 : 1,
      y: isActive ? 1.8 : 1,
      duration: 0.45,
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
    gsap.killTweensOf(this.feedbackContainer.scale);
    super.destroy(options);
  }

  private drawCard() {
    const fillColor =
      this.feedback === 'success'
        ? 0x58d68d
        : this.feedback === 'error'
          ? 0xec7063
          : this.cardColor;
    const strokeColor =
      this.feedback === 'success'
        ? 0x27ae60
        : this.feedback === 'error'
          ? 0xe74c3c
          : this.borderColor;

    this.card
      .clear()
      .roundRect(
        -this.cardSize / 2,
        -this.cardSize / 2,
        this.cardSize,
        this.cardSize,
        this.cornerRadius,
      )
      .fill({ color: fillColor })
      .stroke({ width: 6, color: strokeColor });
  }

  private pulse() {
    gsap.killTweensOf(this.feedbackContainer.scale);
    gsap
      .timeline()
      .to(this.feedbackContainer.scale, {
        x: 1.15,
        y: 1.15,
        duration: 0.14,
        ease: 'back.out(2.2)',
      })
      .to(this.feedbackContainer.scale, {
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
      .to(this.feedbackContainer, { x: -20, duration: 0.04, ease: 'none' })
      .to(this.feedbackContainer, { x: 20, duration: 0.08, ease: 'none' })
      .to(this.feedbackContainer, { x: -13, duration: 0.08, ease: 'none' })
      .to(this.feedbackContainer, { x: 9, duration: 0.08, ease: 'none' })
      .to(this.feedbackContainer, { x: 0, duration: 0.06, ease: 'power2.out' });
  }
}
