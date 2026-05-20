import gsap from 'gsap';
import { Container } from 'pixi.js';

import { getAlphabet, getKeyFromChar, getMappedFromKeyboardEvent } from '../../utils/keymap';
import { Letter, type LetterFeedback } from './Letter';

type LetterItem = {
  id: number;
  char: string;
  layerId: string;
};

type LetterRowOptions = {
  onCorrect?: () => void;
};

const GAP = 400;
const ROW_LENGTH = 200;
const LOOKAHEAD = 5;
const ADVANCE_DELAY_MS = 330;

function makeRow(): LetterItem[] {
  const entries = getAlphabet();

  return Array.from({ length: ROW_LENGTH }, (_, i) => {
    const pick = entries[Math.floor(Math.random() * entries.length)];

    return {
      id: i,
      char: pick?.text ?? '',
      layerId: pick?.layerId ?? 'default',
    };
  });
}

export class LetterRow extends Container {
  private readonly onCorrect?: () => void;
  private letters = makeRow();
  private cards: Letter[] = [];
  private progress = 0;
  private currentFeedback: LetterFeedback = 'none';
  private advanceTimer?: number;
  private screenWidth = window.innerWidth;
  private screenHeight = window.innerHeight;
  private listening = false;

  constructor({ onCorrect }: LetterRowOptions = {}) {
    super();

    this.onCorrect = onCorrect;
    this.ensureCards();
    this.updateCards(false);
    this.startListening();
  }

  reset() {
    window.clearTimeout(this.advanceTimer);
    this.advanceTimer = undefined;
    this.progress = 0;
    this.currentFeedback = 'none';
    this.letters = makeRow();
    this.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.cards = [];
    this.ensureCards();
    this.updateCards(false);
    this.resize(this.screenWidth, this.screenHeight);
  }

  resize(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.y = screenHeight / 2 - 40;

    gsap.to(this, {
      x: screenWidth / 2 - this.progress * GAP,
      duration: 0.4,
      ease: 'power3.out',
    });
  }

  pause() {
    this.stopListening();
  }

  resume() {
    this.startListening();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.stopListening();
    window.clearTimeout(this.advanceTimer);
    gsap.killTweensOf(this);
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
    if (event.key === 'Shift' || this.progress >= this.letters.length || this.advanceTimer) {
      return;
    }

    const currentLetter = this.letters[this.progress];
    const nextFeedback =
      getMappedFromKeyboardEvent(event) === currentLetter.char ? 'success' : 'error';

    this.currentFeedback = nextFeedback;
    this.updateCards(!event.repeat);

    if (nextFeedback === 'success' && !event.repeat) {
      this.advanceTimer = window.setTimeout(() => this.advance(), ADVANCE_DELAY_MS);
    }
  };

  private advance() {
    this.advanceTimer = undefined;
    this.progress += 1;
    this.currentFeedback = 'none';
    this.ensureCards();
    this.updateCards(false);
    this.onCorrect?.();
    this.resize(this.screenWidth, this.screenHeight);
  }

  private ensureCards() {
    const nextLength = Math.min(this.letters.length, this.progress + LOOKAHEAD);

    for (let i = this.cards.length; i < nextLength; i += 1) {
      const item = this.letters[i];
      const card = new Letter({
        letter: item.char,
        hint: `${item.layerId === 'shift' ? '⇧ ' : ''}${getKeyFromChar(item.char).replaceAll('Key', '')}`,
        cardColor: i % 2 === 0 ? 0xecc89c : 0xd0823c,
        borderColor: i % 2 === 0 ? 0xe0ceb9 : 0xe5a272,
      });

      card.x = i * GAP;
      this.cards.push(card);
      this.addChild(card);
    }
  }

  private updateCards(animateCurrent: boolean) {
    this.cards.forEach((card, index) => {
      const feedback =
        index < this.progress ? 'success' : index === this.progress ? this.currentFeedback : 'none';

      card.setActive(index === this.progress);
      card.setFeedback(feedback, index === this.progress && animateCurrent);
    });
  }
}
