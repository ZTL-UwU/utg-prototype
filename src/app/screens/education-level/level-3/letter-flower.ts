import { Sprite, Text, Texture } from 'pixi.js';

export class LetterFlower extends Sprite {
  public readonly letter: string;
  private letterLabel: Text;

  constructor(letter: string, size = 50) {
    super({ texture: Texture.from('education-level-3/flower-bloom.svg'), anchor: 0.5 });
    this.letter = letter;

    this.letterLabel = new Text({
      text: letter,
      resolution: 2,
      style: {
        align: 'center',
        fill: 0x000000,
        fontFamily: 'Noto Sans Arabic',
        fontWeight: '600',
        padding: 20,
      },
    });
    this.letterLabel.anchor.set(0.5, 0.8);
    this.addChild(this.letterLabel);

    this.once('added', () => {
      const naturalWidth = this.texture.width;
      if (naturalWidth > 0) {
        this.scale.set(size / naturalWidth);
        this.letterLabel.style.fontSize = naturalWidth * 0.5;
      }
    });
  }

  public wilt() {
    this.texture = Texture.from('education-level-3/flower-wilted.svg');
    this.letterLabel.visible = false;
  }
}
