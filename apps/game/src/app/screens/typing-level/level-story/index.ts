import { animate } from 'motion';
import { Container, HTMLText, HTMLTextStyle, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { responsive } from '../../../../engine/utils/viewport';
import { createTypingSentenceStyle, getSentenceMarkup } from '../../../../utils/example-words';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import {
  getSentenceAudioAlias,
  playSentenceAudio,
  REMOTE_SENTENCES_BUNDLE,
} from '../../../../zustandStores/sentenceStore';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { RoundedProgressBar } from '../../../ui/rounded-progress-bar';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getTypedLevel, type TLevel } from '../../level-map/units';
import { ORANGE_BOOK_ART, Book } from '../book-layout';
import { generateSentenceRounds, type SentenceRound } from '../sentence-rounds';

const FONT_SIZE = 56;
/** Room for five wrapped lines; a phone's narrow page wraps sentences that fit one on desktop. */
const PHONE_SENTENCE_HEIGHT = 440;
const FEEDBACK_DURATION_MS = 350;
const PROGRESS_BAR_WIDTH = 780;
const PROGRESS_BAR_HEIGHT = 100;

type TimerColor = 'green' | 'orange' | 'red';
const TIMER_COLORS: Record<TimerColor, number> = {
  green: 0x7ed957,
  orange: 0xf5a623,
  red: 0xef5a42,
};

export type { SentenceRound };
export { generateSentenceRounds };

export class TypingSentenceScreen extends Container {
  public readonly screenName = 'TypingSentenceScreen';
  public static assetBundles = ['typing-level-story', 'ui', REMOTE_SENTENCES_BUNDLE];
  public static splashBackgroundAsset = 'typing-levels/typing-level-story/background.png';
  public static helpAssets = [
    'tutorial-popups/typing-level-story-1.png',
    'tutorial-popups/typing-level-story-2.png',
    'tutorial-popups/typing-level-story-3.png',
  ];

  private background: Sprite;
  private book: Book;
  private hud: HUD;
  private keyboard: KeyboardLayout;
  private sentenceStyle: HTMLTextStyle;
  private sentenceText: HTMLText;
  private progressBar: RoundedProgressBar;
  private rounds: SentenceRound[];
  private completedRounds = 0;
  private currentRound?: SentenceRound;
  private sentenceDurationMs: number;
  private elapsedMs = 0;
  private timerColor: TimerColor = 'green';
  private timerRunning = false;
  private resolving = false;
  private _sw = 0;
  private _sh = 0;
  private paused: boolean;
  private level: TLevel;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-story');
    const mapUnit = findMapUnitForLevel(typedLevel);
    super();
    this.level = typedLevel;
    this.sentenceDurationMs = typedLevel.props.sentenceDurationMs;

    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level-story/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });

    this.book = new Book('typing-levels/typing-level-story/book.svg', ORANGE_BOOK_ART);

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          mascot: typedLevel.mascot,
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    this.keyboard = new KeyboardLayout({ text: 'sentences' });
    this.rounds = generateSentenceRounds(typedLevel.props.storyId);

    this.sentenceStyle = createTypingSentenceStyle(
      FONT_SIZE,
      responsive({ sm: PHONE_SENTENCE_HEIGHT, lg: 0 }),
    );
    this.sentenceText = new HTMLText({ style: this.sentenceStyle });
    this.sentenceText.anchor.set(0.5);

    this.progressBar = new RoundedProgressBar({
      width: PROGRESS_BAR_WIDTH,
      height: PROGRESS_BAR_HEIGHT,
      trackColor: TIMER_COLORS.green,
      fillColor: TIMER_COLORS.green,
      strokeWidth: 8,
      padding: 12,
    });
    this.progressBar.progress = 1;

    this.addChild(
      this.background,
      this.book,
      this.sentenceText,
      this.progressBar,
      this.hud,
      this.keyboard,
    );

    this.popAndStartRound();
    this.paused = false;
  }

  resize(width: number, height: number) {
    this._sw = width;
    this._sh = height;
    this.layout = { width, height };
    this.background.layout = { width, height };
    this.keyboard.resize(width, height);
    this.layoutContent();
  }

  private layoutContent() {
    if (this._sw === 0 || this._sh === 0) return;

    const { wrapWidth, sentenceY } = this.book.fit(
      this._sw,
      this._sh,
      this.keyboard.y,
      responsive({ sm: PHONE_SENTENCE_HEIGHT, lg: 0 }),
    );
    this.sentenceStyle.wordWrapWidth = wrapWidth;
    this.sentenceText.position.set(this._sw / 2, sentenceY);

    // Phones fit it between the corner buttons.
    const barScale = responsive({ sm: 0.55, lg: 1 });
    this.progressBar.scale.set(barScale);
    this.progressBar.position.set((this._sw - PROGRESS_BAR_WIDTH * barScale) / 2, this._sh * 0.05);
  }

  update(ticker: Ticker) {
    if (!this.timerRunning || this.paused || this.resolving || !this.currentRound) return;

    this.elapsedMs = Math.min(this.sentenceDurationMs, this.elapsedMs + ticker.deltaMS);
    const remaining = 1 - this.elapsedMs / this.sentenceDurationMs;
    const nextColor: TimerColor =
      remaining > 2 / 3 ? 'green' : remaining > 1 / 3 ? 'orange' : 'red';
    if (nextColor !== this.timerColor) {
      this.timerColor = nextColor;
      this.progressBar.setColors(TIMER_COLORS[nextColor]);
    }
    this.progressBar.progress = remaining;

    if (this.elapsedMs >= this.sentenceDurationMs) {
      void this.onSentenceTimeout();
    }
  }

  async show() {
    this.paused = false;
    this.timerRunning = true;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playEnterAnimation();
  }

  async hide() {
    await this.pause();
    await this.keyboard.playExitAnimation();
  }

  async pause() {
    this.paused = true;
    this.timerRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
  }

  async resume() {
    this.paused = false;
    this.timerRunning = !!this.currentRound;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
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

  private resetSentenceTimer() {
    this.elapsedMs = 0;
    this.timerColor = 'green';
    this.progressBar.setColors(TIMER_COLORS.green);
    this.progressBar.progress = 1;
  }

  private updateSentenceDisplay() {
    if (!this.currentRound) return;
    const { sentence, activeLetterIdx } = this.currentRound;
    this.sentenceText.text = getSentenceMarkup(sentence, activeLetterIdx);
    this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
  }

  private popAndStartRound() {
    if (this.rounds.length === 0) {
      this.endGame();
      return;
    }
    this.currentRound = this.rounds.shift();
    if (!this.currentRound) return;

    this.resetSentenceTimer();
    this.keyboard.setWordStart(true);
    this.updateSentenceDisplay();
    this.timerRunning = !this.paused;
    this.layoutContent();
    playSentenceAudio(getSentenceAudioAlias(this.currentRound.sentenceId));
  }

  private async onSentenceTimeout() {
    if (this.resolving || !this.currentRound) return;
    this.resolving = true;
    this.timerRunning = false;
    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.completedRounds += 1;
    this.popAndStartRound();
    this.resolving = false;
  }

  private readonly handleKeyDown = async (event: KeyboardEvent) => {
    if (
      this.paused ||
      this.resolving ||
      event.repeat ||
      event.key === 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !this.currentRound
    )
      return;

    const typedLetter = getMappedFromKeyboardEvent(event);
    // Space maps to ' '; other unmapped keys are ''.
    if (typedLetter === '' && event.code !== 'Space') return;

    const { sentence, activeLetterIdx } = this.currentRound;
    const matched = typedLetter.length > 0 && sentence.startsWith(typedLetter, activeLetterIdx);
    if (matched) {
      this.keyboard.setKeyFeedback(event.code, 'success');
      setTimeout(() => this.keyboard.clearKeyFeedback(event.code), FEEDBACK_DURATION_MS);
      useSessionStore.getState().recordCorrect();
      await this.advanceHighlightedLetter(typedLetter.length);
    } else {
      this.keyboard.setKeyFeedback(event.code, 'error');
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      setTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
      }, FEEDBACK_DURATION_MS);
      useSessionStore.getState().recordMistake();
    }
  };

  private advanceHighlightedLetter = async (advanceBy: number) => {
    const r = this.currentRound!;
    r.activeLetterIdx += advanceBy;

    if (r.activeLetterIdx >= r.sentence.length) {
      this.resolving = true;
      this.timerRunning = false;
      this.completedRounds += 1;
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      await this.playSuccessFlash();
      this.popAndStartRound();
      this.resolving = false;
    } else {
      this.updateSentenceDisplay();
    }
  };

  private async playSuccessFlash(): Promise<void> {
    const controls = animate(
      this.sentenceText.scale,
      { x: 1.06, y: 1.06 },
      { duration: 0.15, ease: 'easeOut', repeat: 1, repeatType: 'reverse' },
    );
    await controls.finished;
  }

  private endGame() {
    this.paused = true;
    this.timerRunning = false;
    this.currentRound = undefined;
    window.removeEventListener('keydown', this.handleKeyDown);
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }
}
