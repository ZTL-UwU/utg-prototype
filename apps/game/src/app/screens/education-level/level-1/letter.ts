import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

import { EducationLevelScreen } from '.';
import { engine } from '../../../../engine/getEngine';
import useSessionStore from '../../../../zustandStores/sessionStore';
import type { TLevel } from '../../level-map/units';
import { LetterGrid } from './letter-grid';

export type LetterFeedback = 'none' | 'error' | 'success';

type LetterOptions = {
  letter: string;
  correctLetter: string;
  cardSize?: number;
  cornerRadius?: number;
  level: TLevel;
};

const cardColors = {
  default: 0x5a8cd4,
  success: 0x8ec24d,
  error: 0xef5a42,
};

const shadowColors = {
  default: 0x020023,
  success: 0x74a637,
  error: 0xd4452f,
};

export class Letter extends Container {
  private readonly contentContainer: Container;
  private readonly feedbackContainer = new Container();
  private readonly focusContainer = new Container();
  private readonly shadow = new Graphics();
  private readonly card = new Graphics();
  private readonly cardSize: number;
  private readonly cornerRadius: number;
  private readonly isCorrect: boolean;
  private readonly level: TLevel;

  private feedback: LetterFeedback = 'none';
  private focusAnimation?: AnimationPlaybackControls;
  private contentAnimation?: AnimationPlaybackControls;

  constructor({ letter, correctLetter, cardSize = 88, cornerRadius = 18, level }: LetterOptions) {
    super({
      layout: {
        width: cardSize,
        height: cardSize,
        flexShrink: 0,
      },
    });

    this.cardSize = cardSize;
    this.cornerRadius = cornerRadius;
    this.contentContainer = new Container({
      layout: {
        width: cardSize,
        height: cardSize,
        alignItems: 'center',
        justifyContent: 'center',
        transformOrigin: 'center',
      },
    });
    this.focusContainer.layout = {
      width: cardSize,
      height: cardSize,
      transformOrigin: 'center',
    };

    const letterLabel = new Text({
      text: letter,
      resolution: 2,
      style: {
        align: 'center',
        fill: 0xffffff,
        fontFamily: 'Noto Naskh Arabic Bold',
        fontSize: cardSize * 0.48,
        fontWeight: '700',
        padding: 20,
      },
    });
    letterLabel.layout = true;

    this.isCorrect = letter === correctLetter;
    this.level = level;
    this.drawShadow();
    this.drawCard();
    this.contentContainer.addChild(this.shadow, this.card, letterLabel);
    this.feedbackContainer.addChild(this.contentContainer);
    this.focusContainer.addChild(this.feedbackContainer);
    this.eventMode = 'static';
    this.onclick = () => {
      this.handleClick();
    };
    this.addChild(this.focusContainer);
  }

  setFeedback(feedback: LetterFeedback, animateFeedback = true) {
    if (this.feedback === feedback && !animateFeedback) return;

    this.feedback = feedback;
    this.drawShadow();
    this.drawCard();

    if (!animateFeedback) return;

    if (feedback === 'success') {
      this.pulse();
    } else if (feedback === 'error') {
      this.shake();
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.focusAnimation?.stop();
    this.contentAnimation?.stop();
    super.destroy(options);
  }

  private drawShadow() {
    const shadowColor = shadowColors[this.feedback === 'none' ? 'default' : this.feedback];

    this.shadow
      .clear()
      .roundRect(0, 10, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: shadowColor });
  }

  private drawCard() {
    const fillColor = cardColors[this.feedback === 'none' ? 'default' : this.feedback];

    this.card
      .clear()
      .roundRect(0, 0, this.cardSize, this.cardSize, this.cornerRadius)
      .fill({ color: fillColor });
  }

  private pulse() {
    this.contentContainer.rotation = 0;
    this.contentAnimation = animate([
      [this.contentContainer.scale, { x: 1.12, y: 1.12 }, { duration: 1, ease: 'backOut' }],
      [this.contentContainer.scale, { x: 1, y: 1 }, { type: 'spring', bounce: 1, duration: 1 }],
    ]);
    void this.contentAnimation.finished.then(() => {
      setTimeout(() => this.setFeedback('none', false), 250);
    });
  }

  private shake() {
    this.contentContainer.rotation = 0;
    const deg = Math.PI / 180;
    this.contentAnimation = animate([
      [this.contentContainer, { rotation: -16 * deg }, { duration: 0.04, ease: 'linear' }],
      [this.contentContainer, { rotation: 16 * deg }, { duration: 0.08, ease: 'linear' }],
      [this.contentContainer, { rotation: -10 * deg }, { duration: 0.08, ease: 'linear' }],
      [this.contentContainer, { rotation: 6 * deg }, { duration: 0.08, ease: 'linear' }],
      [this.contentContainer, { rotation: 0 }, { duration: 0.06, ease: 'easeOut' }],
    ]);
    void this.contentAnimation.finished.then(() => this.setFeedback('none', false));
  }

  private readonly handleClick = () => {
    if (this.isCorrect) {
      this.setFeedback('success');
      this.eventMode = 'none';
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      useSessionStore.getState().recordCorrect();
      setTimeout(() => {
        if (++LetterGrid.rounds < LetterGrid.roundOrder.length) {
          void engine().navigation.showScreen(EducationLevelScreen, this.level);
        } else {
          LetterGrid.endGame(this.level);
        }
      }, 1000);
    } else {
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');

      useSessionStore.getState().recordMistake();
      this.setFeedback('error');
    }
  };
}
