import { Container } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { getCurrentKeyboardLetters, isCurrentScriptRtl } from '../../../../utils/script';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import type { KeyboardLayout } from '../../../ui/keyboard-layout';
import { TypingLetter } from '../../../ui/typing-letter';
import { getTypedLevel, type TLevel, type TLevelOf } from '../../level-map/units';

const CARD_SIZE = 140;
const CARD_GAP = 40;
const STEP = CARD_SIZE + CARD_GAP;

function makeRow(letters: readonly string[], rowSize: number): string[] {
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
    if (
      event.key === 'Shift' ||
      this.letters.length === 0 ||
      this.isRemoving ||
      this.isTransitioning
    ) {
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
      window.setTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        this.keyboard.setHintedLetter(this.currentLetter);
      }, 350);
    }
  };

  public async pause() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  public async resume() {
    window.addEventListener('keydown', this.handleKeyDown);
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

    this.isTransitioning = false;
    this.keyboard.setHintedLetter(this.currentLetter);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
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
    this.roundsRemaining = 0;
    window.removeEventListener('keydown', this.handleKeyDown);

    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
    return;
  }
}
