import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { convertToCurrentScript, getScriptFontFamily } from '../../../../utils/script';

const NAAN_ASSET = 'game-levels/game-level-2/naan.png';

type NaanPieceOptions = {
  letter: string;
  width?: number;
};

export class NaanPiece extends Container {
  public readonly letter: string;
  private readonly content: Container;
  private readonly sprite: Sprite;
  private readonly letterLabel: Text;
  private feedbackAnimation?: AnimationPlaybackControls;

  constructor({ letter, width = 220 }: NaanPieceOptions) {
    super();
    this.letter = letter;

    this.sprite = new Sprite({
      texture: Texture.from(NAAN_ASSET),
      anchor: 0.5,
    });
    this.sprite.width = width;
    this.sprite.height = (width / this.sprite.texture.width) * this.sprite.texture.height;

    this.letterLabel = new Text({
      text: convertToCurrentScript(letter),
      resolution: 2,
      anchor: 0.5,
      style: {
        align: 'center',
        fill: 0x703e1b,
        fontFamily: getScriptFontFamily(),
        fontSize: width * 0.28,
        fontWeight: '700',
        padding: 30,
      },
    });

    this.content = new Container();
    this.content.addChild(this.sprite, this.letterLabel);
    this.addChild(this.content);
  }

  public get halfWidth(): number {
    return this.sprite.width / 2;
  }

  public get halfHeight(): number {
    return this.sprite.height / 2;
  }

  public async playAppear() {
    const fade = { alpha: 0 };
    this.alpha = fade.alpha;
    this.content.scale.set(0.7);
    await Promise.all([
      animate(
        fade,
        { alpha: 1 },
        {
          duration: 0.28,
          ease: 'easeOut',
          onUpdate: () => {
            this.alpha = fade.alpha;
          },
        },
      ),
      animate(this.content.scale, { x: 1, y: 1 }, { duration: 0.32, ease: 'backOut' }),
    ]);
  }

  public clearLetter() {
    this.letterLabel.visible = false;
  }

  public setFeedback(feedback: 'success') {
    this.feedbackAnimation?.stop();
    this.sprite.tint = feedback === 'success' ? 0xc4e86b : 0xffffff;
    this.feedbackAnimation = animate([
      [this.content.scale, { x: 1.1, y: 1.1 }, { duration: 0.12, ease: 'backOut' }],
      [this.content.scale, { x: 1, y: 1 }, { type: 'spring', bounce: 0.3, duration: 0.4 }],
    ]);
  }

  public clearFeedback() {
    this.feedbackAnimation?.stop();
    this.feedbackAnimation = undefined;
    this.sprite.tint = 0xffffff;
    this.content.scale.set(1);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.feedbackAnimation?.stop();
    super.destroy(options);
  }
}
