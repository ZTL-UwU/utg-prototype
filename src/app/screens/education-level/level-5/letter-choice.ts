import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

const SIZE = 220;
const CORNER_RADIUS = 40;

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

export class LetterChoice extends Container {
  public readonly letter: string;

  private readonly contentContainer: Container;
  private readonly shadow = new Graphics();
  private readonly card = new Graphics();
  private feedbackAnimation?: AnimationPlaybackControls;

  constructor(letter: string, onPress: (choice: LetterChoice) => void) {
    super();

    this.letter = letter;
    this.contentContainer = new Container();

    const letterLabel = new Text({
      text: letter,
      resolution: 2,
      style: {
        align: 'center',
        fill: 0xffffff,
        fontFamily: 'Noto Naskh Arabic Bold',
        fontSize: SIZE * 0.48,
        fontWeight: '700',
        padding: 30,
      },
      anchor: 0.5,
    });
    letterLabel.position.set(SIZE / 2, SIZE / 2);

    this.drawCard('default');
    this.contentContainer.addChild(this.shadow, this.card, letterLabel);
    this.contentContainer.pivot.set(SIZE / 2, SIZE / 2);
    this.contentContainer.position.set(SIZE / 2, SIZE / 2);
    this.addChild(this.contentContainer);

    this.pivot.set(SIZE / 2, SIZE / 2);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', () => onPress(this));
  }

  public setInteractionEnabled(enabled: boolean) {
    this.eventMode = enabled ? 'static' : 'none';
    this.cursor = enabled ? 'pointer' : 'default';
  }

  public async showCorrect() {
    this.setInteractionEnabled(false);
    this.drawCard('success');
    this.contentContainer.rotation = 0;
    this.feedbackAnimation = animate([
      [this.contentContainer.scale, { x: 1.12, y: 1.12 }, { duration: 0.14, ease: 'backOut' }],
      [
        this.contentContainer.scale,
        { x: 1, y: 1 },
        { type: 'spring', bounce: 0.35, duration: 0.48 },
      ],
    ]);
    await this.feedbackAnimation.finished;
  }

  public async showIncorrect() {
    this.drawCard('error');
    this.contentContainer.rotation = 0;
    const deg = Math.PI / 180;
    this.feedbackAnimation = animate([
      [this.contentContainer, { rotation: -16 * deg }, { duration: 0.04, ease: 'linear' }],
      [this.contentContainer, { rotation: 16 * deg }, { duration: 0.08, ease: 'linear' }],
      [this.contentContainer, { rotation: -10 * deg }, { duration: 0.08, ease: 'linear' }],
      [this.contentContainer, { rotation: 6 * deg }, { duration: 0.08, ease: 'linear' }],
      [this.contentContainer, { rotation: 0 }, { duration: 0.06, ease: 'easeOut' }],
    ]);
    await this.feedbackAnimation.finished;
    this.drawCard('default');
  }

  public override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.feedbackAnimation?.stop();
    super.destroy(options);
  }

  private drawCard(feedback: keyof typeof CARD_COLORS) {
    this.shadow
      .clear()
      .roundRect(0, 6, SIZE, SIZE, CORNER_RADIUS)
      .fill({ color: SHADOW_COLORS[feedback] });
    this.card
      .clear()
      .roundRect(0, 0, SIZE, SIZE, CORNER_RADIUS)
      .fill({ color: CARD_COLORS[feedback] });
  }
}
