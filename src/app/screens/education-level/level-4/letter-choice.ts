import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import useSessionStore from '../../../../zustandStores/sessionStore';

const DISPLAY_SIZE = 280;

export class LetterChoice extends FancyButton {
  public readonly letter: string;
  private readonly isCorrect: boolean;
  private readonly onCorrect?: () => void;
  private clicked = false;

  constructor(letter: string, correctLetter: string, onCorrect?: () => void) {
    super({
      defaultView: Texture.from(`education-letter-images/${letter}.png`),
      anchor: 0.5,
      animations: {
        hover: {
          props: { scale: { x: 1.05, y: 1.05 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
    });

    this.letter = letter;
    this.isCorrect = letter === correctLetter;
    this.onCorrect = onCorrect;

    this.once('added', () => {
      const texture = Texture.from(`education-letter-images/${letter}.png`);
      const naturalWidth = texture.width;
      const naturalHeight = texture.height;
      if (naturalWidth <= 0 || naturalHeight <= 0) return;
      const scale = DISPLAY_SIZE / Math.max(naturalWidth, naturalHeight);
      this.scale.set(scale);
    });

    this.eventMode = 'static';
    this.onPress.connect(() => {
      if (this.clicked) return;
      this.clicked = true;
      this.eventMode = 'none';

      if (this.isCorrect) void this.handleCorrect();
      else void this.handleIncorrect();
    });
  }

  private async handleCorrect() {
    engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    const sx = this.scale.x;
    const sy = this.scale.y;
    this.tint = 0x8ec24d;
    await animate(
      this.scale,
      { x: [sx, sx * 1.15, sx], y: [sy, sy * 1.15, sy] },
      { duration: 0.4, ease: 'easeOut' },
    );
    this.tint = 0xffffff;
    this.onCorrect?.();
  }

  private async handleIncorrect() {
    engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    useSessionStore.getState().recordMistake();
    const baseX = this.x;
    const amp = DISPLAY_SIZE * 0.06;
    this.tint = 0xef5a42;
    await animate(
      this,
      { x: [baseX, baseX + amp, baseX - amp, baseX + amp, baseX - amp, baseX] },
      { duration: 0.4, ease: 'linear' },
    );
    this.tint = 0xffffff;
    this.clicked = false;
    this.eventMode = 'static';
  }
}
