import { Container } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getAllKeys, getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import type { KeyboardLayout } from '../../../ui/keyboard-layout';
import type { TMapUnit } from '../../level-map/units';
import { Letter } from './letter';

const CARD_SIZE = 140;
const CARD_GAP = 40;
const STEP = CARD_SIZE + CARD_GAP;
const ROW_SIZE = 6;
const ROW_WIDTH = ROW_SIZE * CARD_SIZE + (ROW_SIZE - 1) * CARD_GAP;

function makeRow(): string[] {
  const entries = getAllKeys();

  return Array.from({ length: ROW_SIZE }, () => {
    const pick = entries[Math.floor(Math.random() * entries.length)];
    return pick?.text ?? '';
  });
}

export class LetterRow extends Container {
  private letters = makeRow();
  private letterCards: Letter[] = [];
  private readonly keyboard: KeyboardLayout;
  private readonly mapUnit: TMapUnit;

  private isRemoving = false;
  private lettersContainer = new Container({
    layout: {
      width: ROW_WIDTH,
      height: CARD_SIZE,
    },
  });

  constructor(keyboard: KeyboardLayout, mapUnit: TMapUnit) {
    super({
      layout: {
        width: ROW_WIDTH,
        height: CARD_SIZE,
        position: 'absolute',
        top: '25%',
      },
    });

    this.keyboard = keyboard;
    this.mapUnit = mapUnit;

    this.letterCards = this.letters.map((letter, index) => {
      const card = new Letter({ letter, cardSize: CARD_SIZE });
      card.layout = {
        position: 'absolute',
        left: index * STEP,
      };
      card.alpha = 0;
      card.setActive(index === this.letters.length - 1, false);
      this.lettersContainer.addChild(card);
      return card;
    });

    window.addEventListener('keydown', this.handleKeyDown);

    this.addChild(this.lettersContainer);
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Shift' || this.letters.length === 0 || this.isRemoving) {
      return;
    }

    if (event.repeat) return;

    const current = this.currentLetterCard;
    const currentLetter = this.currentLetter;
    if (!current || currentLetter === undefined) return;

    const isCorrect = getMappedFromKeyboardEvent(event) === currentLetter;

    if (isCorrect) {
      useSessionStore.getState().recordCorrect();
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      this.isRemoving = true;
      current.setFeedback('success', true);
      this.keyboard.setKeyFeedback(event.code, 'success');
      window.setTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        this.removeCurrentLetter();
      }, 600);
      return;
    }

    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    current.setFeedback('error', true);
    if (event.code) {
      this.keyboard.setKeyFeedback(event.code, 'error');
      window.setTimeout(() => this.keyboard.clearKeyFeedback(event.code), 350);
    }
  };

  public async pause() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  public async resume() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private get currentLetter() {
    return this.letters[this.letters.length - 1];
  }

  private get currentLetterCard() {
    return this.letterCards[this.letterCards.length - 1];
  }

  private getRightToLeftDelay(index: number, delayStep: number) {
    return (this.letterCards.length - 1 - index) * delayStep;
  }

  private removeCurrentLetter() {
    const card = this.letterCards.pop();
    this.letters.pop();

    if (card) {
      this.lettersContainer.removeChild(card);
      card.destroy({ children: true });
    }

    this.isRemoving = false;

    if (this.letters.length === 0) {
      this.endGame();
      return;
    }

    this.currentLetterCard?.setActive(true);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
  }

  public async playEnterAnimation() {
    await Promise.all(
      this.letterCards.map((card, index) => card.playAppear(this.getRightToLeftDelay(index, 0.08))),
    );
  }

  public async playExitAnimation() {
    await Promise.all(
      this.letterCards.map((card, index) =>
        card.playDisappear(this.getRightToLeftDelay(index, 0.02)),
      ),
    );
  }

  private endGame() {
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { mapUnit: this.mapUnit });
    return;
  }
}
