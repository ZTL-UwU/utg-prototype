import { animate } from 'motion';
import { Container, Text, TextStyle } from 'pixi.js';
import type { DestroyOptions } from 'pixi.js';

import useSessionStore from '../../../../zustandStores/sessionStore';
const BASE_STYLE = new TextStyle({ fontSize: 128, fontFamily: 'Concert One', fill: 0xffffff });
const CORRECT_TEXT = 'CORRECT!';
const WRONG_TEXT = 'WRONG';

export class MessageContainer extends Container {
  private correctText: Text;
  private wrongText: Text;
  private unsubs: Array<() => void> = [];

  constructor() {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    this.correctText = new Text({
      text: CORRECT_TEXT,
      style: BASE_STYLE,
      scale: 0,
      anchor: 0.5,
    });
    this.wrongText = new Text({
      text: WRONG_TEXT,
      style: BASE_STYLE,
      scale: 0,
      anchor: 0.5,
    });
    this.addChild(this.correctText, this.wrongText);

    this.unsubs.push(
      useSessionStore.subscribe(
        (state) => state.correct,
        (correct, prevCorrect) => {
          if (correct > prevCorrect) this.showMessage(true);
        },
      ),
    );

    this.unsubs.push(
      useSessionStore.subscribe(
        (state) => state.mistakes,
        (mistakes, prevMistakes) => {
          if (mistakes > prevMistakes) this.showMessage(false);
        },
      ),
    );
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.correctText.position.set(width / 2, height / 8);
    this.wrongText.position.set(width / 2, height / 8);
  }

  showMessage(isCorrect: boolean) {
    void animate(
      isCorrect ? this.correctText.scale : this.wrongText.scale,
      { x: [0, 1, 1, 0], y: [0, 1, 1, 0] },
      {
        duration: 1.8,
        times: [0, 0.4 / 1.8, 1.4 / 1.8, 1],
        ease: ['easeOut', 'linear', 'easeIn'],
      },
    );
  }

  override destroy(options?: DestroyOptions): void {
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs.length = 0;
    super.destroy(options);
  }
}
