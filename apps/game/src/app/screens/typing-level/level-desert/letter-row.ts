import { Container } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getTypedText } from '../../../../utils/keymap';
import { getCurrentKeyboardLetters, isCurrentScriptRtl } from '../../../../utils/script';
import useSessionStore from '../../../../zustandStores/sessionStore';
import type { KeyboardLayout } from '../../../ui/keyboard-layout';
import { TypingLetter } from '../../../ui/typing-letter';
import { finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel, type TLevelOf } from '../../level-map/units';

const CARD_SIZE = 140;
const CARD_GAP = 40;
const STEP = CARD_SIZE + CARD_GAP;
/** How long a correct letter stays lit before it leaves the row. */
const CORRECT_HOLD_MS = 600;

export function makeRow(letters: readonly string[], rowSize: number): string[] {
  return Array.from({ length: rowSize }, () => {
    const pick = letters[Math.floor(Math.random() * letters.length)];
    return pick ?? '';
  });
}

export class LetterRow extends Container {
  private letters: string[] = [];
  private letterCards: TypingLetter[] = [];
  private readonly keyboard: KeyboardLayout;
  private readonly level: TLevelOf<'typing-desert'>;
  private readonly rowSize: number;

  private roundsRemaining: number;
  private isRemoving = false;
  private isTransitioning = false;
  /** Behind a popup: a letter due to leave waits until the popup closes. */
  private paused = false;
  private removalPending = false;
  private removeTimer?: ReturnType<typeof setTimeout>;
  private lettersContainer: Container;
  private readonly rtl = isCurrentScriptRtl();

  constructor(keyboard: KeyboardLayout, level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-desert');
    const { rowSize, rounds } = typedLevel.props;
    const rowWidth = rowSize * CARD_SIZE + (rowSize - 1) * CARD_GAP;

    super({
      layout: {
        width: rowWidth,
        height: CARD_SIZE,
        position: 'absolute',
        top: '25%',
      },
    });

    this.keyboard = keyboard;
    this.level = typedLevel;
    this.rowSize = rowSize;
    this.roundsRemaining = rounds;
    this.lettersContainer = new Container({
      layout: {
        width: rowWidth,
        height: CARD_SIZE,
      },
    });

    this.buildRow();

    window.addEventListener('keydown', this.handleKeyDown);
    this.keyboard.setHintedLetter(this.currentLetter);

    this.addChild(this.lettersContainer);
  }

  private buildRow() {
    this.letters = makeRow(getCurrentKeyboardLetters(), this.rowSize);
    this.letterCards = this.letters.map((letter, index) => {
      const card = new TypingLetter({ letter, cardSize: CARD_SIZE });
      card.layout = {
        position: 'absolute',
        left: index * STEP,
      };
      card.alpha = 0;
      card.setActive(index === this.currentIndex, false);
      this.lettersContainer.addChild(card);
      return card;
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.letters.length === 0 || this.isRemoving || this.isTransitioning) return;
    // Tab, Escape, arrows and modifier chords type nothing, so they are not mistakes.
    const typed = getTypedText(event);
    if (!typed) return;

    const current = this.currentLetterCard;
    const currentLetter = this.currentLetter;
    if (!current || currentLetter === undefined) return;

    if (typed === currentLetter) {
      useSessionStore.getState().recordCorrect();
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      this.isRemoving = true;
      current.setFeedback('success', true);
      this.keyboard.flashKeyFeedback(event.code, 'success', { ms: CORRECT_HOLD_MS });
      this.removeTimer = setTimeout(() => {
        this.removeTimer = undefined;
        if (this.paused) this.removalPending = true;
        else this.removeCurrentLetter();
      }, CORRECT_HOLD_MS);
      return;
    }

    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    current.setFeedback('error', true);
    this.keyboard.flashKeyFeedback(event.code, 'error', {
      onCleared: () => this.keyboard.setHintedLetter(this.currentLetter),
    });
  };

  public async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  public async resume() {
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    if (this.removalPending) {
      this.removalPending = false;
      this.removeCurrentLetter();
      return;
    }
    // mid-transition the hint is set by startNextRound once the new row is in
    if (!this.isTransitioning) this.keyboard.setHintedLetter(this.currentLetter);
  }

  private get currentIndex() {
    return this.rtl ? this.letters.length - 1 : 0;
  }

  private get currentLetter() {
    return this.letters[this.currentIndex];
  }

  private get currentLetterCard() {
    return this.letterCards[this.currentIndex];
  }

  private getStaggerDelay(index: number, delayStep: number) {
    const fromStart = this.rtl ? this.letterCards.length - 1 - index : index;
    return fromStart * delayStep;
  }

  private removeCurrentLetter() {
    const card = this.rtl ? this.letterCards.pop() : this.letterCards.shift();
    if (this.rtl) this.letters.pop();
    else this.letters.shift();

    if (card) {
      this.lettersContainer.removeChild(card);
      card.destroy({ children: true });
    }

    this.isRemoving = false;

    if (this.letters.length === 0) {
      this.roundsRemaining -= 1;

      if (this.roundsRemaining > 0) {
        void this.startNextRound();
      } else {
        this.endGame();
      }
      return;
    }

    this.currentLetterCard?.setActive(true);
    this.keyboard.setHintedLetter(this.currentLetter);
  }

  private async startNextRound() {
    this.isTransitioning = true;
    this.keyboard.setHintedLetter(undefined);

    this.buildRow();
    await this.playEnterAnimation();
    if (this.destroyed) return;

    this.isTransitioning = false;
    this.keyboard.setHintedLetter(this.currentLetter);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    clearTimeout(this.removeTimer);
    super.destroy(options);
  }

  public async playEnterAnimation() {
    await Promise.all(
      this.letterCards.map((card, index) => card.playAppear(this.getStaggerDelay(index, 0.08))),
    );
  }

  public async playExitAnimation() {
    await Promise.all(
      this.letterCards.map((card, index) => card.playDisappear(this.getStaggerDelay(index, 0.02))),
    );
  }

  private endGame() {
    window.removeEventListener('keydown', this.handleKeyDown);
    // The row lives inside the level's screen, which finishLevel checks is still current.
    if (this.parent) finishLevel(this.parent, this.level);
  }
}
