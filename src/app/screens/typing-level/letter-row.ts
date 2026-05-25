import { Container } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { getAlphabet, getMappedFromKeyboardEvent } from '../../../utils/keymap';
import { TypingLevelMapScreen } from '../level-map';
import { Letter } from './letter';

const CARD_SIZE = 140;
const CARD_GAP = 40;
const STEP = CARD_SIZE + CARD_GAP;
const ROW_SIZE = 6;
const ROW_WIDTH = ROW_SIZE * CARD_SIZE + (ROW_SIZE - 1) * CARD_GAP;

function makeRow(): string[] {
  const entries = getAlphabet();

  return Array.from({ length: ROW_SIZE }, () => {
    const pick = entries[Math.floor(Math.random() * entries.length)];
    return pick?.text ?? '';
  });
}

export class LetterRow extends Container {
  private letters = makeRow();
  private letterCards: Letter[] = [];

  private isRemoving = false;
  private lettersContainer = new Container({
    layout: {
      width: ROW_WIDTH,
      height: CARD_SIZE,
    },
  });

  constructor() {
    super({
      layout: {
        width: ROW_WIDTH,
        height: CARD_SIZE,
        position: 'absolute',
        top: '25%',
      },
    });

    this.letterCards = this.letters.map((letter, index) => {
      const card = new Letter({ letter, cardSize: CARD_SIZE });
      card.layout = {
        position: 'absolute',
        left: index * STEP,
      };
      card.setActive(index === 0);
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

    const current = this.letterCards[0];
    if (!current) return;

    const isCorrect = getMappedFromKeyboardEvent(event) === this.letters[0];

    if (isCorrect) {
      if (event.repeat) return;

      this.isRemoving = true;
      current.setFeedback('success', true);
      window.setTimeout(() => this.removeCurrentLetter(), 600);
      return;
    }

    current.setFeedback('error', !event.repeat);
  };

  private removeCurrentLetter() {
    const card = this.letterCards.shift();
    this.letters.shift();

    if (card) {
      this.removeChild(card);
      card.destroy({ children: true });
    }

    this.isRemoving = false;

    if (this.letters.length === 0) {
      void engine().navigation.showScreen(TypingLevelMapScreen);
      return;
    }

    this.letterCards[0]?.setActive(true);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
  }
}
