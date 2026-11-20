import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { LetterChoice } from '../../../ui/letter-choice';

/** The letter card's size, in grass-texture pixels: it scales with the grass. */
const LETTER_BOX_SIZE = 250;
/** The card floats this share of the grass's height above it. */
const LETTER_BOX_RISE = 0.7;

export class LetterGrass extends Container {
  public readonly letter: string;
  private readonly grass: Sprite;
  private readonly letterBox: LetterChoice;

  constructor(letter: string, onClick: () => void) {
    super();
    this.grass = new Sprite({
      texture: Texture.from('education-levels/education-level-sheep/grass.png'),
    });
    this.grass.anchor.set(0.5);
    this.letter = letter;
    this.letterBox = new LetterChoice({
      letter,
      onPress: () => onClick(),
      size: LETTER_BOX_SIZE,
    });
    this.addChild(this.letterBox, this.grass);
    this.letterBox.y = -this.grass.texture.height * LETTER_BOX_RISE;
  }

  /** Scale the grass, and its card with it, to `size` across. */
  public setSize(size: number) {
    const naturalWidth = this.grass.texture.width;
    if (naturalWidth > 0) this.scale.set(size / naturalWidth);
  }

  public setInteractive(enabled: boolean) {
    this.letterBox.setInteractive(enabled);
  }

  public wilt() {
    this.grass.texture = Texture.from('education-levels/education-level-sheep/grass-wilted.png');
    this.letterBox.visible = false;
  }

  public async correctAnimation() {
    const sx = this.scale.x;
    const sy = this.scale.y;
    this.grass.tint = 0x7cb342;
    await Promise.all([
      animate(
        this.scale,
        { x: [sx, sx * 1.25, sx], y: [sy, sy * 1.25, sy] },
        { duration: 0.4, ease: 'easeOut' },
      ).finished,
      this.letterBox.showCorrect(),
    ]);
    this.grass.tint = 0xffffff;
  }

  public async incorrectAnimation() {
    this.grass.tint = 0xe57373;
    await this.letterBox.showIncorrect();
    this.grass.tint = 0xffffff;
  }
}
