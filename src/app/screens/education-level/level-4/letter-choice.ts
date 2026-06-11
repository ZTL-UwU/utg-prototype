import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import useSessionStore from '../../../../zustandStores/sessionStore';

const DISPLAY_SIZE = 280;

export class LetterChoice extends Container {
  public readonly letter: string;
  private readonly isCorrect: boolean;
  private readonly onCorrect?: () => void;
  private readonly image: Sprite;
  private clicked = false;

  constructor(letter: string, correctLetter: string, onCorrect?: () => void) {
    super();
    this.letter = letter;
    this.isCorrect = letter === correctLetter;
    this.onCorrect = onCorrect;

    const texture = Texture.from(`education-letter-images/${letter}.png`);
    this.image = new Sprite({ texture, anchor: 0.5 });
    this.addChild(this.image);

    this.once('added', () => {
      const naturalWidth = this.image.texture.width;
      const naturalHeight = this.image.texture.height;
      if (naturalWidth <= 0 || naturalHeight <= 0) return;
      const scale = DISPLAY_SIZE / Math.max(naturalWidth, naturalHeight);
      this.image.scale.set(scale);
    });
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', this.handleClick);
  }

  private readonly handleClick = () => {
    if (this.clicked) return;
    this.clicked = true;
    this.eventMode = 'none';

    if (this.isCorrect) void this.handleCorrect();
    else void this.handleIncorrect();
  };

  private async handleCorrect() {
    engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    const sx = this.image.scale.x;
    const sy = this.image.scale.y;
    this.image.tint = 0x8ec24d;
    await animate(
      this.image.scale,
      { x: [sx, sx * 1.15, sx], y: [sy, sy * 1.15, sy] },
      { duration: 0.4, ease: 'easeOut' },
    );
    this.image.tint = 0xffffff;
    this.onCorrect?.();
  }

  private async handleIncorrect() {
    engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    useSessionStore.getState().recordMistake();
    const baseX = this.x;
    const amp = DISPLAY_SIZE * 0.06;
    this.image.tint = 0xef5a42;
    await animate(
      this,
      { x: [baseX, baseX + amp, baseX - amp, baseX + amp, baseX - amp, baseX] },
      { duration: 0.4, ease: 'linear' },
    );
    this.image.tint = 0xffffff;
    this.clicked = false;
    this.eventMode = 'static';
  }
}
