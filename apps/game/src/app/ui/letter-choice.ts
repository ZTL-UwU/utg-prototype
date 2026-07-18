import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { Graphics, Text, type Container } from 'pixi.js';

const CARD_COLORS = {
  default: 0x5a8cd4,
  success: 0x8ec24d,
  error: 0xef5a42,
} as const;

const SHADOW_COLORS = {
  default: 0x4673b8,
  success: 0x74a637,
  error: 0xd4452f,
} as const;

type CardState = keyof typeof CARD_COLORS;

export type LetterChoiceOptions = {
  letter: string;
  onPress: (choice: LetterChoice) => void;
  size?: number;
  cornerRadius?: number;
};

function drawInteractiveCard(size: number, cornerRadius: number) {
  return new Graphics()
    .roundRect(0, 6, size, size, cornerRadius)
    .fill({ color: SHADOW_COLORS.default })
    .roundRect(0, 0, size, size, cornerRadius)
    .fill({ color: CARD_COLORS.default });
}

function drawFeedbackCard(
  feedback: Exclude<CardState, 'default'>,
  size: number,
  cornerRadius: number,
) {
  return new Graphics()
    .roundRect(0, 6, size, size, cornerRadius)
    .fill({ color: SHADOW_COLORS[feedback] })
    .roundRect(0, 0, size, size, cornerRadius)
    .fill({ color: CARD_COLORS[feedback] });
}

export class LetterChoice extends FancyButton {
  public readonly letter: string;
  private readonly size: number;
  private readonly cornerRadius: number;
  private feedbackAnimation?: AnimationPlaybackControls;

  constructor({ letter, onPress, size = 220, cornerRadius = 40 }: LetterChoiceOptions) {
    super({
      defaultView: drawInteractiveCard(size, cornerRadius),
      hoverView: drawInteractiveCard(size, cornerRadius),
      pressedView: drawInteractiveCard(size, cornerRadius),
      animations: {
        hover: {
          props: { scale: { x: 1.03, y: 1.03 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
      text: new Text({
        text: letter,
        resolution: 2,
        style: {
          align: 'center',
          fill: 0xffffff,
          fontFamily: 'Noto Naskh Arabic Bold',
          fontSize: size * 0.48,
          fontWeight: '700',
          padding: 30,
        },
      }),
      anchor: 0.5,
    });

    this.letter = letter;
    this.size = size;
    this.cornerRadius = cornerRadius;
    this.eventMode = 'static';
    this.onPress.connect(() => onPress(this));
  }

  public setInteractive(enabled: boolean) {
    this.eventMode = enabled ? 'static' : 'none';
    this.cursor = enabled ? 'pointer' : 'default';
  }

  public async showCorrect() {
    this.setInteractive(false);
    this.setCardFeedback('success');
    this.rotation = 0;
    this.feedbackAnimation = animate([
      [this.scale, { x: 1.12, y: 1.12 }, { duration: 0.14, ease: 'backOut' }],
      [this.scale, { x: 1, y: 1 }, { type: 'spring', bounce: 0.35, duration: 0.48 }],
    ]);
    await this.feedbackAnimation.finished;
  }

  public async showIncorrect() {
    this.setCardFeedback('error');
    this.rotation = 0;
    const deg = Math.PI / 180;
    this.feedbackAnimation = animate([
      [this, { rotation: -16 * deg }, { duration: 0.04, ease: 'linear' }],
      [this, { rotation: 16 * deg }, { duration: 0.08, ease: 'linear' }],
      [this, { rotation: -10 * deg }, { duration: 0.08, ease: 'linear' }],
      [this, { rotation: 6 * deg }, { duration: 0.08, ease: 'linear' }],
      [this, { rotation: 0 }, { duration: 0.06, ease: 'easeOut' }],
    ]);
    await this.feedbackAnimation.finished;
    this.setCardFeedback('default');
  }

  public override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.feedbackAnimation?.stop();
    super.destroy(options);
  }

  private setCardFeedback(feedback: CardState) {
    if (feedback === 'default') {
      this.defaultView = drawInteractiveCard(this.size, this.cornerRadius);
      this.hoverView = drawInteractiveCard(this.size, this.cornerRadius);
      this.pressedView = drawInteractiveCard(this.size, this.cornerRadius);
      return;
    }

    this.defaultView = drawFeedbackCard(feedback, this.size, this.cornerRadius);
    this.hoverView = drawFeedbackCard(feedback, this.size, this.cornerRadius);
    this.pressedView = drawFeedbackCard(feedback, this.size, this.cornerRadius);
  }
}
