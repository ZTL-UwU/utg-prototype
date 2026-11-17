import type { TypingTestProps } from '@utg/level-types';
import { Container, Graphics, Text, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { isPhone } from '../../../../engine/utils/viewport';
import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';
import { getTypedText } from '../../../../utils/keymap';
import { useLevelProgress } from '../../../../zustandStores/levelProgressStore';
import { REMOTE_SENTENCES_BUNDLE } from '../../../../zustandStores/sentenceStore';
import { levelWordAssets } from '../../../../zustandStores/wordStore';
import { hudButtonTop, type HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { createLevelHud } from '../../level-flow';
import {
  findMapUnitForLevel,
  getTypedLevel,
  type TLevel,
  type TMapUnit,
} from '../../level-map/units';
import { createPromptView, type PromptView } from './prompt-views';
import { TypingTestResultsPopup } from './results-popup';
import { TypingTestSettingsPopup, type TypingTestSettings } from './settings-popup';

const PANEL_RADIUS = 32;
const PANEL_WIDTH_RATIO = 0.8;
const PANEL_MAX_WIDTH = 1500;
const PANEL_TOP_RATIO = 0.12;
const PANEL_HEIGHT_RATIO_WITH_KEYBOARD = 0.34;
const PANEL_HEIGHT_RATIO = 0.5;
/** Phones get a near full-width panel; 80% of 768 leaves the letter row no room. */
const PHONE_PANEL_MARGIN_X = 24;
/** Space between the panel and the HUD row above it or the keyboard below it on phones. */
const PHONE_PANEL_GAP = 32;
/** Half the HUD's back button, whose centre `hudButtonTop` gives. */
const HUD_BUTTON_RADIUS = 62;
/** The countdown's right edge, in the top row where a Help button would be. */
const TIMER_RIGHT_INSET = 80;
/** Shortest the prompt panel may get, on very short screens. */
const MIN_PANEL_HEIGHT = 160;

const COLORS = {
  BACKGROUND: 0xfdf3e0,
  PANEL: 0xf5e2c4,
  TIMER: 0x6b411e,
};

/**
 * Remembered across retries so a replay does not re-ask for the same choices. Per level, so
 * another typing test starts from its own defaults.
 */
const lastSettings = new Map<number, TypingTestSettings>();

export class TypingTestScreen extends Container {
  public readonly screenName = 'TypingTestScreen';
  public static assetBundles = ['typing-level-test', REMOTE_SENTENCES_BUNDLE, 'ui'];
  public static assets = levelWordAssets('image', 'standardAudio');
  // A flat fill matching COLORS.BACKGROUND, so the splash and the test read as one screen.
  public static loadingBackgroundAsset = 'typing-levels/typing-level-test/background.svg';
  // Empty so the test opens on its settings popup instead of a tutorial slideshow first.
  public static helpAssets: string[] = [];

  private readonly background = new Graphics();
  private readonly panel = new Graphics();
  private readonly timerText: Text;
  private readonly keyboard: KeyboardLayout;
  private readonly hud: HUD;
  private readonly level: TLevel;
  private readonly mapUnit: TMapUnit;
  private readonly props: TypingTestProps;

  private promptView?: PromptView;
  private settings?: TypingTestSettings;
  private text = '';
  private activeIdx = 0;
  private durationMs = 0;
  private remainingMs = 0;
  private displayedSeconds = -1;
  private armed = false;
  private running = false;
  private paused = false;
  private completing = false;
  private correctChars = 0;
  private mistakes = 0;
  /** Missed target characters, for the results' problem keys. */
  private readonly mistakesByChar = new Map<string, number>();
  private viewWidth = 0;
  private viewHeight = 0;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-test');
    const mapUnit = findMapUnitForLevel(typedLevel);
    super();
    this.level = typedLevel;
    this.mapUnit = mapUnit;
    this.props = typedLevel.props;

    // No help button: the test has no tutorial, and the countdown sits where it would be.
    this.hud = createLevelHud(typedLevel);

    this.keyboard = new KeyboardLayout({ text: 'sentences' });

    this.timerText = new Text({
      text: '',
      resolution: 2,
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: 64,
        fontWeight: '700',
        fill: COLORS.TIMER,
      },
      anchor: { x: 1, y: 0.5 },
    });

    this.addChild(this.background, this.panel, this.timerText, this.hud);
  }

  resize(width: number, height: number) {
    this.viewWidth = width;
    this.viewHeight = height;
    this.layout = { width, height };
    this.keyboard.resize(width, height);
    this.layoutContent();
  }

  private layoutContent() {
    if (this.viewWidth === 0 || this.viewHeight === 0) return;

    this.background.clear().rect(0, 0, this.viewWidth, this.viewHeight).fill(COLORS.BACKGROUND);

    const phone = isPhone();
    const hudCenterY = hudButtonTop(this.viewHeight);

    const panelWidth = phone
      ? this.viewWidth - 2 * PHONE_PANEL_MARGIN_X
      : Math.min(this.viewWidth * PANEL_WIDTH_RATIO, PANEL_MAX_WIDTH);
    const panelX = (this.viewWidth - panelWidth) / 2;
    // A phone's panel is as wide as the screen, so it starts below the back button.
    const panelY = phone
      ? hudCenterY + HUD_BUTTON_RADIUS + PHONE_PANEL_GAP
      : this.viewHeight * PANEL_TOP_RATIO;
    const showKeyboard = this.settings?.showKeyboard ?? false;
    // Never down into the keyboard, and never so short (or negative) on a short screen
    // that the prompt cannot draw.
    const roomAboveKeyboard = this.keyboard.y - PHONE_PANEL_GAP - panelY;
    const preferredHeight =
      phone && showKeyboard
        ? // Fills the space down to the keyboard instead of leaving a gap above it.
          roomAboveKeyboard
        : this.viewHeight * (showKeyboard ? PANEL_HEIGHT_RATIO_WITH_KEYBOARD : PANEL_HEIGHT_RATIO);
    const panelHeight = Math.max(
      MIN_PANEL_HEIGHT,
      showKeyboard ? Math.min(preferredHeight, roomAboveKeyboard) : preferredHeight,
    );

    this.panel
      .clear()
      .roundRect(panelX, panelY, panelWidth, panelHeight, PANEL_RADIUS)
      .fill(COLORS.PANEL);

    this.promptView?.place(panelX, panelY, panelWidth, panelHeight);
    // Level with the back button, which sits in the same top row.
    this.timerText.position.set(this.viewWidth - TIMER_RIGHT_INSET, hudCenterY);
  }

  update(ticker: Ticker) {
    if (!this.running || this.paused) return;

    this.remainingMs = Math.max(0, this.remainingMs - ticker.deltaMS);
    this.updateTimerText();

    if (this.remainingMs === 0) this.endTest();
  }

  async show() {
    // Keys are listened to once the settings popup closes and the screen resumes.
    void engine().navigation.showPopup(TypingTestSettingsPopup, {
      levelProps: this.props,
      defaults: lastSettings.get(this.level.id) ?? this.defaultSettings(),
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
    await this.keyboard.pause();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
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
    lastSettings.set(this.level.id, settings);
    // Phones have no physical keyboard, so the on-screen one is the only way to type.
    const phone = isPhone();
    this.settings = { ...settings, showKeyboard: settings.showKeyboard || phone };
    this.promptView = createPromptView(settings.mode, this.props);
    this.addChildAt(this.promptView, this.getChildIndex(this.panel) + 1);

    this.durationMs = settings.durationSeconds * 1000;
    this.remainingMs = this.durationMs;
    this.armed = true;

    if (this.settings.showKeyboard) {
      this.addChild(this.keyboard);
      this.keyboard.resize(this.viewWidth, this.viewHeight);
      void this.keyboard.playEnterAnimation();
    }

    this.loadNextPage();
    this.updateTimerText();
    this.layoutContent();
  }

  private get currentTargetLetter(): string | undefined {
    return this.armed ? this.text[this.activeIdx] : undefined;
  }

  /** The letter after the target, which tells a phone a word-initial ئ comes from a vowel key. */
  private get nextTargetLetter(): string | undefined {
    return this.armed ? this.text[this.activeIdx + 1] : undefined;
  }

  private updateTimerText() {
    const seconds = Math.ceil(this.remainingMs / 1000);
    if (seconds === this.displayedSeconds) return;
    this.displayedSeconds = seconds;
    // Minute-long tests count down as m:ss so 5 minutes doesn't read as "300".
    this.timerText.text =
      this.durationMs >= 60_000
        ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
        : String(seconds);
  }

  private loadNextPage() {
    this.text = this.promptView?.next() ?? '';
    this.activeIdx = 0;
    this.keyboard.setWordStart(true);
    this.updatePromptDisplay();
  }

  private updatePromptDisplay() {
    if (this.activeIdx < this.text.length) this.promptView?.setProgress(this.activeIdx);
    this.refreshHint();
  }

  /** Shows the next page, row or word once the finished one has played its celebration. */
  private finishItem() {
    const celebration = this.promptView?.playComplete?.();
    if (!celebration) {
      this.loadNextPage();
      return;
    }

    // Keys during the celebration would land on the finished item, so they are dropped.
    this.completing = true;
    void celebration.then(() => {
      this.completing = false;
      if (this.armed) this.loadNextPage();
    });
  }

  private refreshHint() {
    if (!this.settings?.showKeyboard) return;
    this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
  }

  /** Colours a key, then restores the hint, so a stale clear never leaves the board blank. */
  private flashKey(code: string, feedback: 'success' | 'error') {
    this.keyboard.flashKeyFeedback(code, feedback, { onCleared: () => this.refreshHint() });
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.armed || this.paused || this.completing) return;
    // Space types ' '; keys that type nothing are ignored.
    const typedLetter = getTypedText(event);
    if (!typedLetter) return;

    // The clock starts on the first keystroke, so reading the prompt costs no time.
    if (!this.running) this.running = true;

    if (this.text.startsWith(typedLetter, this.activeIdx)) {
      this.correctChars += typedLetter.length;
      this.activeIdx += typedLetter.length;

      if (this.activeIdx >= this.text.length) this.finishItem();
      else this.updatePromptDisplay();

      // Flashed after the hint has moved on, so the new hint cannot wipe the green key.
      this.flashKey(event.code, 'success');
      return;
    }

    this.mistakes += 1;
    this.recordProblemKey();
    this.promptView?.showError();
    this.flashKey(event.code, 'error');
  };

  /**
   * The heatmap flags what should have been typed, not the key that was. Kept by character, so
   * a Shift-layer letter shows as itself rather than its unshifted key.
   */
  private recordProblemKey() {
    const target = this.currentTargetLetter;
    if (!target) return;
    this.mistakesByChar.set(target, (this.mistakesByChar.get(target) ?? 0) + 1);
  }

  private endTest() {
    this.armed = false;
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);

    // The test is endlessly replayable and never scored, so finishing one run is all the
    // map ring can go on.
    useLevelProgress.getState().markAttempted(this.mapUnit.type, this.level.id);

    void engine().navigation.showPopup(TypingTestResultsPopup, {
      level: this.level,
      durationMs: this.durationMs,
      correctChars: this.correctChars,
      mistakes: this.mistakes,
      mistakesByChar: this.mistakesByChar,
      onRetry: () => void engine().navigation.showScreen(TypingTestScreen, this.level),
    });
  }
}
