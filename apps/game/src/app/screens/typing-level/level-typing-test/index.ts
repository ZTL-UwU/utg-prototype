import type { TypingTestProps } from '@utg/level-types';
import { Container, Graphics, HTMLText, HTMLTextStyle, Text, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { createTypingSentenceStyle, getSentenceMarkup } from '../../../../utils/example-words';
import { getKeyFromChar, getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { REMOTE_SENTENCES_BUNDLE } from '../../../../zustandStores/sentenceStore';
import { REMOTE_WORDS_BUNDLE } from '../../../../zustandStores/wordStore';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout, type KeyFeedback } from '../../../ui/keyboard-layout';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getTypedLevel, type TLevel } from '../../level-map/units';
import { TypingTestResultsPopup } from './results-popup';
import { TypingTestSettingsPopup, type TypingTestSettings } from './settings-popup';
import { createPromptSource, type PromptSource } from './test-content';

const FONT_SIZE = 48;
const FEEDBACK_DURATION_MS = 350;
const PANEL_RADIUS = 32;
const PANEL_WIDTH_RATIO = 0.8;
const PANEL_MAX_WIDTH = 1500;
const PANEL_TOP_RATIO = 0.12;
const PANEL_HEIGHT_RATIO_WITH_KEYBOARD = 0.34;
const PANEL_HEIGHT_RATIO = 0.5;
const PANEL_TEXT_MARGIN = 120;

const COLORS = {
  BACKGROUND: 0xfdf3e0,
  PANEL: 0xf5e2c4,
  TIMER: 0x6b411e,
};

/** Remembered across retries so a replay does not re-ask for the same choices. */
let lastSettings: TypingTestSettings | undefined;

export class TypingTestScreen extends Container {
  public static assetBundles = [
    'typing-level-test',
    REMOTE_WORDS_BUNDLE,
    REMOTE_SENTENCES_BUNDLE,
    'ui',
  ];
  // A flat fill matching COLORS.BACKGROUND, so the splash and the test read as one screen.
  public static splashBackgroundAsset = 'typing-levels/typing-level-test/background.svg';
  // Empty so START opens the settings popup instead of a tutorial slideshow first.
  public static helpAssets: string[] = [];

  private readonly background = new Graphics();
  private readonly panel = new Graphics();
  private readonly promptStyle: HTMLTextStyle;
  private readonly promptText: HTMLText;
  private readonly timerText: Text;
  private readonly keyboard: KeyboardLayout;
  private readonly hud: HUD;
  private readonly level: TLevel;
  private readonly props: TypingTestProps;

  private promptSource?: PromptSource;
  private settings?: TypingTestSettings;
  private text = '';
  private activeIdx = 0;
  private durationMs = 0;
  private remainingMs = 0;
  private displayedSeconds = -1;
  private armed = false;
  private running = false;
  private paused = false;
  private correctChars = 0;
  private mistakes = 0;
  private readonly mistakesByCode = new Map<string, number>();
  private readonly feedbackTimeouts = new Map<string, number>();
  private _sw = 0;
  private _sh = 0;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-test');
    const mapUnit = findMapUnitForLevel(typedLevel);
    super();
    this.level = typedLevel;
    this.props = typedLevel.props;

    // No help button: it sits where the countdown is drawn.
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          mascot: typedLevel.mascot,
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
    });

    this.keyboard = new KeyboardLayout();

    this.promptStyle = createTypingSentenceStyle(FONT_SIZE);
    this.promptText = new HTMLText({ style: this.promptStyle });
    this.promptText.anchor.set(0.5);

    this.timerText = new Text({
      text: '',
      resolution: 2,
      style: { fontFamily: 'Concert One', fontSize: 64, fontWeight: '700', fill: COLORS.TIMER },
      anchor: { x: 1, y: 0.5 },
    });

    this.addChild(this.background, this.panel, this.promptText, this.timerText, this.hud);
  }

  resize(width: number, height: number) {
    this._sw = width;
    this._sh = height;
    this.layout = { width, height };
    this.keyboard.resize(width, height);
    this.layoutContent();
  }

  private layoutContent() {
    if (this._sw === 0 || this._sh === 0) return;

    this.background.clear().rect(0, 0, this._sw, this._sh).fill(COLORS.BACKGROUND);

    const panelWidth = Math.min(this._sw * PANEL_WIDTH_RATIO, PANEL_MAX_WIDTH);
    const panelHeight =
      this._sh *
      (this.settings?.showKeyboard ? PANEL_HEIGHT_RATIO_WITH_KEYBOARD : PANEL_HEIGHT_RATIO);
    const panelX = (this._sw - panelWidth) / 2;
    const panelY = this._sh * PANEL_TOP_RATIO;

    this.panel
      .clear()
      .roundRect(panelX, panelY, panelWidth, panelHeight, PANEL_RADIUS)
      .fill(COLORS.PANEL);

    this.promptStyle.wordWrapWidth = panelWidth - PANEL_TEXT_MARGIN;
    this.promptText.position.set(this._sw / 2, panelY + panelHeight / 2);
    this.timerText.position.set(this._sw - 80, panelY / 2);
  }

  update(ticker: Ticker) {
    if (!this.running || this.paused) return;

    this.remainingMs = Math.max(0, this.remainingMs - ticker.deltaMS);
    this.updateTimerText();

    if (this.remainingMs === 0) this.endTest();
  }

  async show() {
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    void engine().navigation.showPopup(TypingTestSettingsPopup, {
      levelProps: this.props,
      defaults: lastSettings ?? this.defaultSettings(),
      onStart: (settings) => this.startTest(settings),
    });
  }

  async hide() {
    await this.pause();
    if (this.settings?.showKeyboard) await this.keyboard.playExitAnimation();
  }

  async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.clearPendingFeedback();
    await this.keyboard.pause();
  }

  async resume() {
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    this.refreshHint();
  }

  private defaultSettings(): TypingTestSettings {
    return {
      mode: this.props.defaultMode,
      durationSeconds: this.props.defaultDurationSeconds,
      showKeyboard: this.props.showKeyboardByDefault,
    };
  }

  private startTest(settings: TypingTestSettings) {
    lastSettings = settings;
    this.settings = settings;
    this.promptSource = createPromptSource(settings.mode, this.props);

    this.durationMs = settings.durationSeconds * 1000;
    this.remainingMs = this.durationMs;
    this.armed = true;

    if (settings.showKeyboard) {
      this.addChild(this.keyboard);
      this.keyboard.resize(this._sw, this._sh);
      void this.keyboard.playEnterAnimation();
    }

    this.loadNextPage();
    this.updateTimerText();
    this.layoutContent();
  }

  private get currentTargetLetter(): string | undefined {
    return this.armed ? this.text[this.activeIdx] : undefined;
  }

  private updateTimerText() {
    const seconds = Math.ceil(this.remainingMs / 1000);
    if (seconds === this.displayedSeconds) return;
    this.displayedSeconds = seconds;
    this.timerText.text = String(seconds);
  }

  private loadNextPage() {
    this.text = this.promptSource?.next() ?? '';
    this.activeIdx = 0;
    this.updatePromptDisplay();
  }

  private updatePromptDisplay() {
    this.promptText.text = getSentenceMarkup(this.text, this.activeIdx);
    this.refreshHint();
  }

  private refreshHint() {
    if (!this.settings?.showKeyboard) return;
    this.keyboard.setHintedLetter(this.currentTargetLetter);
  }

  /** Colours a key, then restores the hint — a stale clear must never leave the board blank. */
  private flashKey(code: string, feedback: KeyFeedback) {
    const pending = this.feedbackTimeouts.get(code);
    if (pending) clearTimeout(pending);

    this.keyboard.setKeyFeedback(code, feedback);
    this.feedbackTimeouts.set(
      code,
      window.setTimeout(() => {
        this.feedbackTimeouts.delete(code);
        this.keyboard.clearKeyFeedback(code);
        this.refreshHint();
      }, FEEDBACK_DURATION_MS),
    );
  }

  private clearPendingFeedback() {
    for (const timeout of this.feedbackTimeouts.values()) clearTimeout(timeout);
    this.feedbackTimeouts.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (
      !this.armed ||
      this.paused ||
      event.repeat ||
      event.key === 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;

    const typedLetter = getMappedFromKeyboardEvent(event);
    // Space maps to ' '; other unmapped keys are ''.
    if (typedLetter === '' && event.code !== 'Space') return;

    // The clock starts on the first keystroke, so reading the prompt costs no time.
    if (!this.running) this.running = true;

    const matched = typedLetter.length > 0 && this.text.startsWith(typedLetter, this.activeIdx);
    if (matched) {
      this.correctChars += typedLetter.length;
      this.activeIdx += typedLetter.length;

      if (this.activeIdx >= this.text.length) this.loadNextPage();
      else this.updatePromptDisplay();

      // Flashed after the hint has moved on, so the new hint cannot wipe the green key.
      this.flashKey(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      return;
    }

    this.mistakes += 1;
    this.recordProblemKey();
    this.flashKey(event.code, 'error');
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
  };

  /** The heatmap flags the key that should have been pressed, not the one that was. */
  private recordProblemKey() {
    const target = this.currentTargetLetter;
    const code = target ? getKeyFromChar(target) : '';
    if (!code) return;
    this.mistakesByCode.set(code, (this.mistakesByCode.get(code) ?? 0) + 1);
  }

  private endTest() {
    this.armed = false;
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.clearPendingFeedback();

    void engine().navigation.showPopup(TypingTestResultsPopup, {
      level: this.level,
      durationMs: this.durationMs,
      correctChars: this.correctChars,
      mistakes: this.mistakes,
      mistakesByCode: this.mistakesByCode,
      onRetry: () => void engine().navigation.showScreen(TypingTestScreen, this.level),
    });
  }
}
