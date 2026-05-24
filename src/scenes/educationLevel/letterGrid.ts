import { Container } from 'pixi.js';

import { getAlphabet, getMappedFromKeyboardEvent } from '../../utils/keymap';
import { Letter } from './letter';

const CARD_SIZE = 250;
const CARD_GAP = 60;
const NUM_CHOICES = 6;

const COLS = Math.ceil(Math.sqrt(NUM_CHOICES));
const ROWS = Math.ceil(NUM_CHOICES / COLS);

export const GRID_W = COLS * CARD_SIZE + (COLS - 1) * CARD_GAP;
export const GRID_H = ROWS * CARD_SIZE + (ROWS - 1) * CARD_GAP;

function pickLetters(): { letters: string[]; correctIndex: number } {
  const entries = getAlphabet();
  const shuffled = [...entries].sort(() => Math.random() - 0.5).slice(0, NUM_CHOICES);
  const letters = shuffled.map((e) => e.text);
  const correctIndex = Math.floor(Math.random() * NUM_CHOICES);
  return { letters, correctIndex };
}

type LetterGridOptions = {
  onComplete: () => void;
};

export class LetterGrid extends Container {
  private letters: string[] = [];
  private correctIndex = 0;
  private cards: Letter[] = [];
  private solved = false;
  private listening = false;
  private readonly onComplete: () => void;

  constructor({ onComplete }: LetterGridOptions) {
    super();
    this.onComplete = onComplete;
    this.build();
    this.startListening();
  }

  getCorrectLetter(): string {
    return this.letters[this.correctIndex] ?? '';
  }

  reset() {
    this.clearCards();
    this.solved = false;
    this.build();
  }

  resize(screenWidth: number, screenHeight: number) {
    this.position.set((screenWidth - GRID_W) / 2, (screenHeight - GRID_H) / 2 + 60);
  }

  pause() {
    this.stopListening();
  }

  resume() {
    this.startListening();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.stopListening();
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
    if (event.key === 'Shift' || this.solved) return;

    const typed = getMappedFromKeyboardEvent(event);
    const matchIndex = this.letters.indexOf(typed);

    if (matchIndex === -1) return;

    const card = this.cards[matchIndex];
    if (!card) return;

    if (matchIndex === this.correctIndex) {
      if (event.repeat) return;
      this.solved = true;
      card.setFeedback('success');
      window.setTimeout(() => this.onComplete(), 700);
    } else {
      card.setFeedback('error', !event.repeat);
    }
  };

  private build() {
    const { letters, correctIndex } = pickLetters();
    this.letters = letters;
    this.correctIndex = correctIndex;

    this.cards = letters.map((letter, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const card = new Letter({ letter, cardSize: CARD_SIZE });
      card.x = col * (CARD_SIZE + CARD_GAP);
      card.y = row * (CARD_SIZE + CARD_GAP);
      this.addChild(card);
      return card;
    });
  }

  private clearCards() {
    this.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.cards = [];
  }
}
