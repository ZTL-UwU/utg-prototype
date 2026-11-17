import { animate } from 'motion';
import { Container, HTMLText, HTMLTextStyle, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { frameDeltaMs } from '../../../engine/utils/maths';
import { responsive } from '../../../engine/utils/viewport';
import { createTypingSentenceStyle, getSentenceMarkup } from '../../../utils/example-words';
import { getTypedText } from '../../../utils/keymap';
import { getSentenceAudioAlias, playSentenceAudio } from '../../../zustandStores/sentenceStore';
import useSessionStore from '../../../zustandStores/sessionStore';
import type { HUD } from '../../ui/hud';
import { KeyboardLayout } from '../../ui/keyboard-layout';
import { TimerBar } from '../../ui/timer-bar';
import { createLevelHud, finishLevel } from '../level-flow';
import { getTypedLevel, type TLevel, type TLevelOf } from '../level-map/units';
import { Book, type BookArt } from './book-layout';
import { generateSentenceRounds, type SentenceRound } from './sentence-rounds';

const FONT_SIZE = 56;
/** Room for five wrapped lines; a phone's narrow page wraps sentences that fit one on desktop. */
const PHONE_SENTENCE_HEIGHT = { sm: 440, lg: 0 };
const PROGRESS_BAR_WIDTH = 780;
const PROGRESS_BAR_HEIGHT = 100;
/** Phones fit the timer between the corner buttons. */
const PROGRESS_BAR_SCALE = { sm: 0.55, lg: 1 };
/** The timer's top, as a share of the screen height. */
const PROGRESS_BAR_TOP = 0.05;

/** The level types that type a story's sentences out of a book against the clock. */
export type SentenceLevelType = 'typing-goat' | 'typing-spring' | 'typing-story';

export type SentenceScreenArt = {
  levelType: SentenceLevelType;
  background: string;
  book: string;
  bookArt: BookArt;
};

/**
 * Type a story's sentences, one at a time, from an open book before the timer runs out. The
 * goat, spring and story levels differ only in their art; each is a subclass naming it.
 */
export abstract class SentenceTypingScreen extends Container {
  public abstract readonly screenName: string;

  private readonly level: TLevelOf<SentenceLevelType>;
  private readonly background: Sprite;
  private readonly book: Book;
  private readonly hud: HUD;
  private readonly keyboard = new KeyboardLayout({ text: 'sentences' });
  private readonly sentenceStyle: HTMLTextStyle;
  private readonly sentenceText: HTMLText;
  private readonly progressBar = new TimerBar({
    width: PROGRESS_BAR_WIDTH,
    height: PROGRESS_BAR_HEIGHT,
    strokeWidth: 8,
    padding: 12,
  });
  private readonly rounds: SentenceRound[];
  private readonly sentenceDurationMs: number;
  private currentRound?: SentenceRound;
  private elapsedMs = 0;
  private timerRunning = false;
  private resolving = false;
  private paused = false;
  private viewWidth = 0;
  private viewHeight = 0;

  constructor(level: TLevel, art: SentenceScreenArt) {
    super();
    this.level = getTypedLevel(level, art.levelType);
    this.sentenceDurationMs = this.level.props.sentenceDurationMs;
    this.rounds = generateSentenceRounds(this.level.props.storyId);

    this.background = new Sprite({
      texture: Texture.from(art.background),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.book = new Book(art.book, art.bookArt);
    this.hud = createLevelHud(this.level);

    this.sentenceStyle = createTypingSentenceStyle(FONT_SIZE, responsive(PHONE_SENTENCE_HEIGHT));
    this.sentenceText = new HTMLText({ style: this.sentenceStyle });
    this.sentenceText.anchor.set(0.5);

    this.addChild(
      this.background,
      this.book,
      this.sentenceText,
      this.progressBar,
      this.hud,
      this.keyboard,
    );
  }

  resize(width: number, height: number) {
    this.viewWidth = width;
    this.viewHeight = height;
    this.layout = { width, height };
    this.background.layout = { width, height };
    this.keyboard.resize(width, height);
    this.layoutContent();
  }

  private layoutContent() {
    if (this.viewWidth === 0 || this.viewHeight === 0) return;

    const { wrapWidth, sentenceY } = this.book.fit(
      this.viewWidth,
      this.viewHeight,
      this.keyboard.y,
      responsive(PHONE_SENTENCE_HEIGHT),
    );
    this.sentenceStyle.wordWrapWidth = wrapWidth;
    this.sentenceText.position.set(this.viewWidth / 2, sentenceY);

    const barScale = responsive(PROGRESS_BAR_SCALE);
    this.progressBar.scale.set(barScale);
    this.progressBar.position.set(
      (this.viewWidth - PROGRESS_BAR_WIDTH * barScale) / 2,
      this.viewHeight * PROGRESS_BAR_TOP,
    );
  }

  update(ticker: Ticker) {
    if (!this.timerRunning || this.paused || this.resolving || !this.currentRound) return;

    this.elapsedMs = Math.min(this.sentenceDurationMs, this.elapsedMs + frameDeltaMs(ticker));
    this.progressBar.setRemaining(1 - this.elapsedMs / this.sentenceDurationMs);
    if (this.elapsedMs >= this.sentenceDurationMs) this.onSentenceTimeout();
  }

  async show() {
    // The first round starts here, not in the constructor, so a story with no sentences
    // ends the level once the screen is up, and the first sentence is read as it appears.
    this.startNextRound();
    if (!this.currentRound) return;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playEnterAnimation();
  }

  async hide() {
    await this.pause();
    await this.keyboard.playExitAnimation();
  }

  async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
  }

  async resume() {
    if (!this.currentRound) return;
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
  }

  private get currentTargetLetter(): string | undefined {
    if (!this.currentRound) return undefined;
    return this.currentRound.sentence[this.currentRound.activeLetterIdx];
  }

  /** The letter after the target, which tells a phone a word-initial ئ comes from a vowel key. */
  private get nextTargetLetter(): string | undefined {
    if (!this.currentRound) return undefined;
    return this.currentRound.sentence[this.currentRound.activeLetterIdx + 1];
  }

  private updateSentenceDisplay() {
    if (!this.currentRound) return;
    const { sentence, activeLetterIdx } = this.currentRound;
    this.sentenceText.text = getSentenceMarkup(sentence, activeLetterIdx);
    this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
  }

  /** Bring up the story's next sentence, or end the level after the last. */
  private startNextRound() {
    this.currentRound = this.rounds.shift();
    if (!this.currentRound) {
      this.endGame();
      return;
    }

    this.elapsedMs = 0;
    this.progressBar.setRemaining(1);
    this.keyboard.setWordStart(true);
    this.updateSentenceDisplay();
    this.timerRunning = true;
    this.layoutContent();
    void playSentenceAudio(getSentenceAudioAlias(this.currentRound.sentenceId));
  }

  private onSentenceTimeout() {
    if (this.resolving || !this.currentRound) return;
    this.timerRunning = false;
    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.startNextRound();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.paused || this.resolving || !this.currentRound) return;
    // Space types ' '; keys that type nothing are ignored.
    const typed = getTypedText(event);
    if (!typed) return;

    const { sentence, activeLetterIdx } = this.currentRound;
    if (sentence.startsWith(typed, activeLetterIdx)) {
      this.keyboard.flashKeyFeedback(event.code, 'success');
      useSessionStore.getState().recordCorrect();
      void this.advanceHighlightedLetter(this.currentRound, typed.length);
    } else {
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      this.keyboard.flashKeyFeedback(event.code, 'error', {
        onCleared: () =>
          this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter),
      });
      useSessionStore.getState().recordMistake();
    }
  };

  private async advanceHighlightedLetter(round: SentenceRound, advanceBy: number) {
    round.activeLetterIdx += advanceBy;
    if (round.activeLetterIdx < round.sentence.length) {
      this.updateSentenceDisplay();
      return;
    }

    this.resolving = true;
    this.timerRunning = false;
    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    await this.playSuccessFlash();
    if (this.destroyed) return;
    this.startNextRound();
    this.resolving = false;
  }

  private async playSuccessFlash(): Promise<void> {
    await animate(
      this.sentenceText.scale,
      { x: 1.06, y: 1.06 },
      { duration: 0.15, ease: 'easeOut', repeat: 1, repeatType: 'reverse' },
    ).finished;
  }

  private endGame() {
    this.paused = true;
    this.timerRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    finishLevel(this, this.level);
  }
}
