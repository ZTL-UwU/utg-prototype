import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { Sprite, Text } from 'pixi.js';

import useSessionStore from '../../../../zustandStores/sessionStore';

const SIZE = 140;

export class LetterBubble extends FancyButton {
  private isCorrect: boolean;
  private readonly onCorrect?: () => void;
  private animation?: AnimationPlaybackControls;
  private floatAnimation?: AnimationPlaybackControls;
  private clicked = false;
  private stopped = false;

  constructor(letter: string, correctLetter: string, onCorrect?: () => void) {
    super({
      defaultView: 'education-level-2/bubble.svg',
      animations: {
        hover: {
          props: { scale: { x: 1.5, y: 1.5 } },
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
          fill: 0x000000,
          fontFamily: 'Noto Sans Arabic',
          fontSize: SIZE * 0.4,
          fontWeight: '600',
          padding: 20,
        },
      }),
      anchor: 0.5,
    });

    this.isCorrect = letter === correctLetter;
    this.onCorrect = onCorrect;

    this.onPress.connect(() => {
      this.clicked = true;
      this.floatAnimation?.stop();
      if (this.isCorrect) this.handleCorrect();
      else this.handleIncorrect();
    });
  }

  public startFloat(endY: number, duration: number, delay = 0, onEscaped?: () => void) {
    this.floatAnimation = animate(this.position, { y: endY }, { duration, ease: 'linear', delay });
    void this.floatAnimation.finished.then(() => {
      if (!this.clicked && !this.stopped) {
        if (this.isCorrect) useSessionStore.getState().recordMistake();
        onEscaped?.();
      }
    });
  }

  public stopFloat() {
    this.stopped = true;
    this.floatAnimation?.stop();
  }

  private handleCorrect() {
    useSessionStore.getState().recordCorrect();
    this.pulse();
  }

  private handleIncorrect() {
    useSessionStore.getState().recordMistake();
    this.shake();
  }

  private pulse() {
    this.tint = 0x8ec24d;
    this.rotation = 0;
    this.animation = animate([
      [this.scale, { x: 1.2, y: 1.2 }, { duration: 0.2, ease: 'easeOut' }],
      [this.scale, { x: 1, y: 1 }, { duration: 0.2, ease: 'easeIn' }],
    ]);
    void this.animation.finished.then(() => {
      this.tint = 0xffffff;
      this.onCorrect?.();
    });
  }

  private shake() {
    this.tint = 0xef5a42;
    this.rotation = 0;
    const deg = Math.PI / 180;
    this.animation = animate([
      [this, { rotation: -16 * deg }, { duration: 0.04, ease: 'linear' }],
      [this, { rotation: 16 * deg }, { duration: 0.08, ease: 'linear' }],
      [this, { rotation: -10 * deg }, { duration: 0.08, ease: 'linear' }],
      [this, { rotation: 6 * deg }, { duration: 0.08, ease: 'linear' }],
      [this, { rotation: 0 }, { duration: 0.06, ease: 'easeOut' }],
    ]);
    void this.animation.finished.then(() => {
      this.tint = 0xffffff;
      this.defaultView = Sprite.from('education-level-2/bubble_popped.svg');
      this.eventMode = 'none';
    });
  }
}
