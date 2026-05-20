import gsap from 'gsap';
import { Container } from 'pixi.js';

import { getAlphabet, getMappedFromKeyboardEvent } from '../../utils/keymap';
import { Letter } from './Letter';

type LetterRowOptions = {
  onCorrect?: () => void;
  onComplete?: () => void;
};

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
  private readonly row = new Container({
    layout: {
      width: ROW_WIDTH,
      height: CARD_SIZE,
    },
  });
  private readonly onCorrect?: () => void;
  private readonly onComplete?: () => void;
  private letters = makeRow();
  private cards: Letter[] = [];
  private removing = false;
  private screenWidth = window.innerWidth;
  private screenHeight = window.innerHeight;
  private listening = false;

  constructor({ onCorrect, onComplete }: LetterRowOptions = {}) {
    super();

    this.onCorrect = onCorrect;
    this.onComplete = onComplete;
    this.addChild(this.row);
    this.buildCards();
    this.resize(this.screenWidth, this.screenHeight);
    this.startListening();
  }

  reset() {
    this.removing = false;
    this.letters = makeRow();
    this.clearCards();
    this.buildCards();
    this.resize(this.screenWidth, this.screenHeight);
  }

  resize(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.layout = {
      width: screenWidth,
      height: screenHeight,
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: Math.max(0, screenHeight * 0.34 - CARD_SIZE / 2),
    };
  }

  pause() {
    this.stopListening();
  }

  resume() {
    this.startListening();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.stopListening();
    gsap.killTweensOf(this.cards);
    super.destroy(options);
  }

  private startListening() {
    if (this.listening) return;

    window.addEventListener('keydown', this.handleKeyDown);
    this.listening = true;
  }

  private stopListening() {
    if (!this.listening) return;

    window.removeEventListener('keydown', this.handleKeyDown);
    this.listening = false;
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Shift' || this.letters.length === 0 || this.removing) {
      return;
    }

    const current = this.cards[0];
    if (!current) return;

    const isCorrect = getMappedFromKeyboardEvent(event) === this.letters[0];

    if (isCorrect) {
      if (event.repeat) return;

      this.removing = true;
      current.setFeedback('success', true);
      window.setTimeout(() => this.removeCurrentLetter(), 600);
      return;
    }

    current.setFeedback('error', !event.repeat);
  };

  private removeCurrentLetter() {
    const card = this.cards.shift();
    this.letters.shift();

    if (card) {
      this.row.removeChild(card);
      card.destroy({ children: true });
    }

    this.removing = false;
    this.onCorrect?.();

    if (this.letters.length === 0) {
      this.onComplete?.();
      return;
    }

    this.cards[0]?.setActive(true);
  }

  private buildCards() {
    this.cards = this.letters.map((letter, index) => {
      const card = new Letter({ letter, cardSize: CARD_SIZE });
      card.layout = {
        position: 'absolute',
        left: index * STEP,
      };
      card.setActive(index === 0);
      this.row.addChild(card);
      return card;
    });
  }

  private clearCards() {
    this.row.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.cards = [];
  }
}
