import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Text, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import useSessionStore from '../../../../zustandStores/sessionStore';

const SIZE = 140;

export class LetterBubble extends FancyButton {
  private isCorrect: boolean;
  private readonly onCorrect?: () => void;
  private animation?: AnimationPlaybackControls;
  private floatTick?: (ticker: Ticker) => void;
  private floatStartY = 0;
  private floatEndY = 0;
  private floatDurationMs = 0;
  private floatDelayMs = 0;
  private floatElapsedMs = 0;
  private floatOnEscaped?: () => void;
  private clicked = false;

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
      this.pauseFloat();
      if (this.isCorrect) this.handleCorrect();
      else this.handleIncorrect();
    });
  }

  public startFloat(endY: number, duration: number, delay = 0, onEscaped?: () => void) {
    this.pauseFloat();
    this.floatStartY = this.y;
    this.floatEndY = endY;
    this.floatDurationMs = duration * 1000;
    this.floatDelayMs = delay * 1000;
    this.floatElapsedMs = 0;
    this.floatOnEscaped = onEscaped;
    this.attachFloatTick();
  }

  public pauseFloat() {
    if (this.floatTick) {
      engine().ticker.remove(this.floatTick);
      this.floatTick = undefined;
    }
  }

  public resumeFloat() {
    if (this.clicked || this.floatTick || this.floatDurationMs <= 0) return;
    if (this.floatElapsedMs >= this.floatDelayMs + this.floatDurationMs) return;
    this.attachFloatTick();
  }

  private attachFloatTick() {
    this.floatTick = (ticker: Ticker) => {
      if (this.clicked) return;

      this.floatElapsedMs += ticker.deltaMS;

      if (this.floatElapsedMs < this.floatDelayMs) return;

      const progress = Math.min(
        (this.floatElapsedMs - this.floatDelayMs) / this.floatDurationMs,
        1,
      );
      this.y = this.floatStartY + (this.floatEndY - this.floatStartY) * progress;

      if (progress >= 1) {
        this.pauseFloat();
        if (!this.clicked) {
          if (this.isCorrect) useSessionStore.getState().recordMistake();
          this.floatOnEscaped?.();
        }
      }
    };

    engine().ticker.add(this.floatTick);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.pauseFloat();
    super.destroy(options);
  }

  private handleCorrect() {
    engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    this.pulse();
  }

  private handleIncorrect() {
    engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
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
      engine().audio.sfx.play('education-level-2/bubble-pop.mp3');
      this.tint = 0xffffff;
      this.defaultView = Sprite.from('education-level-2/bubble_popped.svg');
      this.eventMode = 'none';
    });
  }
}
