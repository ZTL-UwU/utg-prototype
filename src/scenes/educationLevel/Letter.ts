import gsap from 'gsap';
import { DropShadowFilter } from 'pixi-filters';
import { Container, Graphics, Text } from 'pixi.js';

export type LetterFeedback = 'default' | 'success' | 'error';

type LetterOptions = {
  letter: string;
  cardSize?: number;
  cornerRadius?: number;
};

const shadowColors = {
  default: 0x4a6ab8,
  success: 0x74a637,
  error: 0xd4452f,
};

const cardColors = {
  default: 0x6b8fd4,
  success: 0x8ec24d,
  error: 0xef5a42,
};

export class Letter extends Container {
  private readonly contentContainer: Container;
  private readonly focusContainer: Container;
  private readonly shadow = new Graphics();
  private readonly card = new Graphics();
  private readonly cardSize: number;
  private readonly cornerRadius: number;
  private feedback: LetterFeedback = 'default';

  constructor({ letter, cardSize = 160, cornerRadius = 18 }: LetterOptions) {
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

    this.focusContainer = new Container({
      layout: { width: cardSize, height: cardSize, transformOrigin: 'center' },
    });

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
    this.focusContainer.addChild(this.contentContainer);
    this.addChild(this.focusContainer);
  }

  setFeedback(feedback: LetterFeedback, animate = true) {
    if (this.feedback === feedback && !animate) return;

    this.feedback = feedback;
    this.drawShadow();
    this.drawCard();

    if (!animate) return;
    if (feedback === 'success') this.pulse();
    else if (feedback === 'error') this.shake();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    gsap.killTweensOf(this.contentContainer);
    super.destroy(options);
  }

  private drawShadow() {
    this.shadow
      .clear()
      .roundRect(0, 10, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: shadowColors[this.feedback] });
  }

  private drawCard() {
    this.card
      .clear()
      .roundRect(0, 0, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: cardColors[this.feedback] });
  }

  private pulse() {
    gsap.killTweensOf(this.contentContainer);
    this.contentContainer.rotation = 0;

    const glow = new DropShadowFilter({ color: 0x5fdb35, alpha: 0, blur: 18, offset: { x: 0, y: 0 } });
    this.filters = [glow];

    gsap
      .timeline({ onComplete: () => { this.filters = []; } })
      .to(glow, { alpha: 0.85, duration: 0.12, ease: 'back.out(2)' })
      .to(this.contentContainer.scale, { x: 1.12, y: 1.12, duration: 0.14, ease: 'back.out(2.2)' }, '<')
      .to(glow, { alpha: 0, duration: 0.28, ease: 'power2.in' }, 0.2)
      .to(this.contentContainer.scale, { x: 1, y: 1, duration: 0.28, ease: 'elastic.out(1, 0.38)' }, 0.2);
  }

  private shake() {
    gsap.killTweensOf(this.contentContainer);
    this.contentContainer.x = 0;

    gsap
      .timeline({ onComplete: () => this.setFeedback('default', false) })
      .to(this.contentContainer, { x: 5, duration: 0.05, ease: 'none' })
      .to(this.contentContainer, { x: -5, duration: 0.08, ease: 'none' })
      .to(this.contentContainer, { x: 4, duration: 0.07, ease: 'none' })
      .to(this.contentContainer, { x: -3, duration: 0.07, ease: 'none' })
      .to(this.contentContainer, { x: 0, duration: 0.05, ease: 'power2.out' });
  }
}
