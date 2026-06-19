import { animate } from 'motion';
import { Sprite, Text, Texture } from 'pixi.js';

export class LetterFlower extends Sprite {
  public readonly letter: string;
  private letterLabel: Text;
  private readonly onClick: () => void;
  constructor(letter: string, onClick: () => void, size = 50) {
    super({
      texture: Texture.from('education-levels/education-level-3/flower-bloom.svg'),
      anchor: 0.5,
    });
    this.letter = letter;
    this.onClick = onClick;
    this.letterLabel = new Text({
      text: letter,
      resolution: 2,
      style: {
        align: 'center',
        fill: 0x000000,
        fontFamily: 'Noto Naskh Arabic Bold',
        fontWeight: '700',
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
    this.eventMode = 'static';
    this.on('pointertap', onClick);
  }

  public wilt() {
    this.texture = Texture.from('education-levels/education-level-3/flower-wilted.svg');
    this.letterLabel.visible = false;
  }
  public async correctAnimation() {
    const sx = this.scale.x;
    const sy = this.scale.y;
    this.tint = 0x7cb342;
    await animate(
      this.scale,
      { x: [sx, sx * 1.25, sx], y: [sy, sy * 1.25, sy] },
      { duration: 0.4, ease: 'easeOut' },
    );
    this.tint = 0xffffff;
    this.removeOnTapEvent();
  }

  public async incorrectAnimation() {
    const baseX = this.x;
    const amp = this.width * 0.18;
    this.tint = 0xe57373;
    await animate(
      this,
      { x: [baseX, baseX + amp, baseX - amp, baseX + amp, baseX - amp, baseX] },
      { duration: 0.4, ease: 'linear' },
    );
    this.tint = 0xffffff;
    this.removeOnTapEvent();
  }
  private removeOnTapEvent() {
    this.off('pointertap', this.onClick);
  }
}
