import { sound } from '@pixi/sound';
import { Container, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { convertToCurrentScript } from '../../../../utils/script';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import {
  getWordAudioAlias,
  REMOTE_WORDS_BUNDLE,
  resolveWordsByIds,
} from '../../../../zustandStores/wordStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { RoundedProgressBar } from '../../../ui/rounded-progress-bar';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getTypedLevel, type TLevel } from '../../level-map/units';
import { CatchCounter } from './catch-counter';
import { Trout } from './trout';

const KEY_FEEDBACK_MS = 300;
const MAX_FRAME_MS = 50;
const HUD_MARGIN = 40;
const KEYBOARD_TOP = 90;
const PROGRESS_BAR = { width: 520, height: 36, y: 28 } as const;

const TIMER_COLORS = {
  green: 0x7ed957,
  orange: 0xe5903a,
  red: 0xff3131,
} as const;

type TimerColor = keyof typeof TIMER_COLORS;

/** River slots as fractions of the design view (left bank, below the keyboard). */
const SLOT_LAYOUT: Array<{ x: number; y: number }> = [
  { x: 0.14, y: 0.58 },
  { x: 0.28, y: 0.72 },
  { x: 0.22, y: 0.86 },
  { x: 0.4, y: 0.62 },
  { x: 0.46, y: 0.8 },
  { x: 0.34, y: 0.5 },
  { x: 0.12, y: 0.74 },
  { x: 0.5, y: 0.7 },
];

export class GameLevelTrout extends Container {
  public static assetBundles = ['game-level', 'game-level-trout', 'ui', REMOTE_WORDS_BUNDLE];
  public static helpAssets: string[] = [];

  private readonly level: TLevel;
  private readonly maxActiveTrout: number;
  private readonly wordDurationMs: number;
  private readonly totalCatches: number;
  private readonly wordFontSize: number;
  private readonly swimSpeed: number;
  private readonly wordPool: Array<{ id: number; word: string }>;

  private readonly background: Sprite;
  private readonly keyboard: KeyboardLayout;
  private readonly progressBar: RoundedProgressBar;
  private readonly catchCounter: CatchCounter;
  private readonly hud: HUD;
  private readonly troutLayer = new Container();

  private screenWidth = 0;
  private screenHeight = 0;
  private trout: Trout[] = [];
  private activeTrout: Trout | null = null;
  private wordTimerMs = 0;
  private timerRunning = false;
  private timerColor: TimerColor = 'green';
  private catches = 0;
  private paused = false;
  private completed = false;
  private resolving = false;
  private feedbackTimeouts: number[] = [];

  constructor(level: TLevel) {
    super();
    const typedLevel = getTypedLevel(level, 'game-trout');
    this.level = typedLevel;
    const props = typedLevel.props;
    this.maxActiveTrout = props.maxActiveTrout;
    this.wordDurationMs = props.wordDurationMs;
    this.totalCatches = props.totalCatches;
    this.wordFontSize = props.wordFontSize;
    this.swimSpeed = props.swimSpeedPxPerSecond;

    this.wordPool = resolveWordsByIds(props.wordIds)
      .map((entry) => ({ id: entry.id, word: convertToCurrentScript(entry.word) }))
      .filter((entry) => entry.word.length > 0);

    this.background = new Sprite({
      texture: Texture.from('game-levels/game-level-trout/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });
    this.keyboard = new KeyboardLayout();
    this.progressBar = new RoundedProgressBar({
      width: PROGRESS_BAR.width,
      height: PROGRESS_BAR.height,
      trackColor: TIMER_COLORS.green,
      fillColor: TIMER_COLORS.green,
      strokeWidth: 6,
      padding: 8,
    });
    this.progressBar.progress = 1;
    this.catchCounter = new CatchCounter();

    const mapUnit = findMapUnitForLevel(typedLevel);
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: 'game',
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
    });

    this.addChild(
      this.background,
      this.troutLayer,
      this.keyboard,
      this.progressBar,
      this.catchCounter,
      this.hud,
    );
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.screenWidth = width;
    this.screenHeight = height;

    this.keyboard.resize(width, height);
    this.keyboard.scale.set(0.8);
    this.keyboard.position.set(Math.round((width - this.keyboard.width) / 2), KEYBOARD_TOP);
    // Mockup places the keyboard under the timer, above the river.
    this.keyboard.position.y = KEYBOARD_TOP;

    this.progressBar.position.set((width - PROGRESS_BAR.width) / 2, PROGRESS_BAR.y);
    this.catchCounter.position.set(width - HUD_MARGIN - this.catchCounter.width, HUD_MARGIN + 24);
    this.hud.layout = { width, height };

    for (let i = 0; i < this.trout.length; i++) {
      const slot = SLOT_LAYOUT[i % SLOT_LAYOUT.length];
      this.trout[i].setHome(width * slot.x, height * slot.y);
    }
  }

  public update(ticker: Ticker) {
    if (this.paused || this.completed) return;
    const deltaMs = Math.min(ticker.deltaMS, MAX_FRAME_MS);

    for (const t of this.trout) t.updateSwim(deltaMs);

    if (!this.timerRunning || this.resolving || !this.activeTrout) return;
    this.wordTimerMs -= deltaMs;
    const remaining = Math.max(0, this.wordTimerMs / this.wordDurationMs);
    const nextColor: TimerColor =
      remaining > 2 / 3 ? 'green' : remaining > 1 / 3 ? 'orange' : 'red';
    if (nextColor !== this.timerColor) {
      this.timerColor = nextColor;
      this.progressBar.setColors(TIMER_COLORS[nextColor]);
    }
    this.progressBar.progress = remaining;
    if (this.wordTimerMs <= 0) void this.onWordTimeout();
  }

  async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  async resume() {
    if (this.completed) return;
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
  }

  async show() {
    this.completed = false;
    this.resolving = false;
    this.paused = false;
    this.timerRunning = false;
    this.wordTimerMs = 0;
    this.catches = 0;
    this.activeTrout = null;
    this.catchCounter.setCount(0);
    this.resetProgressBar();
    this.keyboard.setHintedLetter(undefined);

    this.clearTrout();
    this.spawnRound();
    this.activateNextAvailableTrout();

    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playEnterAnimation();
  }

  async hide() {
    this.timerRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.clearFeedbackTimeouts();
    this.keyboard.setHintedLetter(undefined);
    await this.keyboard.playExitAnimation();
  }

  /** Spawns a fresh set of trout. Catch counter is intentionally left alone. */
  private spawnRound() {
    const count = Math.min(this.maxActiveTrout, SLOT_LAYOUT.length, this.wordPool.length);
    const usedStarts = new Set<string>();

    for (let i = 0; i < count; i++) {
      const entry = pickWordWithUniqueStart(this.wordPool, usedStarts);
      if (!entry) break;
      usedStarts.add(startingLetter(entry.word));

      const slot = SLOT_LAYOUT[i];
      const trout = new Trout({
        wordId: entry.id,
        word: entry.word,
        fontSize: this.wordFontSize,
        homeX: this.screenWidth * slot.x || 200 + i * 120,
        homeY: this.screenHeight * slot.y || 600,
        swimSpeed: this.swimSpeed,
        phase: i * 1.7,
      });
      this.troutLayer.addChild(trout);
      this.trout.push(trout);
    }
  }

  private clearTrout() {
    for (const t of this.trout) {
      t.destroy({ children: true });
    }
    this.trout = [];
    this.troutLayer.removeChildren();
  }

  private removeTrout(trout: Trout) {
    const idx = this.trout.indexOf(trout);
    if (idx >= 0) this.trout.splice(idx, 1);
    this.troutLayer.removeChild(trout);
    trout.destroy({ children: true });
  }

  private hasPlayableTrout(): boolean {
    return this.trout.some((t) => t.isPlayable && !t.isComplete);
  }

  private async startNewRound() {
    this.clearTrout();
    this.activeTrout = null;
    this.timerRunning = false;
    this.resetProgressBar();
    this.keyboard.setHintedLetter(undefined);
    this.spawnRound();
    if (!this.hasPlayableTrout()) {
      this.endGame();
      return;
    }
    this.activateNextAvailableTrout();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.completed || this.resolving || this.paused) return;
    if (event.repeat || event.key === 'Shift' || event.ctrlKey || event.metaKey || event.altKey)
      return;

    const typed = getMappedFromKeyboardEvent(event);
    if (!typed) return;

    const active = this.activeTrout;
    if (active?.isPlayable && active.currentLetter === typed) {
      this.handleActiveTyping(typed, event.code);
      return;
    }

    // Once a word is started, finish it (or time out) before switching to another fish.
    if (active?.isPlayable && !active.isComplete && active.hasProgress) {
      this.handleIncorrect(event.code);
      return;
    }

    // Unique starting letters let the player lock onto a different fish before starting one.
    const target = this.trout.find(
      (t) => t !== active && t.isPlayable && t.startingLetter === typed,
    );
    if (target) {
      if (active?.isPlayable) {
        active.setActive(false);
        active.resetProgress();
      }
      this.activateTrout(target);
      this.handleActiveTyping(typed, event.code);
      return;
    }

    if (!active) {
      const first = this.trout.find(
        (t) => t.isPlayable && !t.isComplete && t.currentLetter === typed,
      );
      if (first) {
        this.activateTrout(first);
        this.handleActiveTyping(typed, event.code);
        return;
      }
    }

    this.handleIncorrect(event.code);
  };

  private handleActiveTyping(typed: string, code: string) {
    const trout = this.activeTrout;
    if (!trout) return;

    if (trout.typeLetter(typed)) {
      useSessionStore.getState().recordCorrect();
      this.keyboard.setKeyFeedback(code, 'success');
      this.pushTimeout(() => this.keyboard.clearKeyFeedback(code), KEY_FEEDBACK_MS);

      if (trout.isComplete) {
        void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
        this.playWordAudio(trout.wordId);
        void this.onWordCaught(trout);
      } else {
        this.keyboard.setHintedLetter(trout.currentLetter);
      }
    } else {
      this.handleIncorrect(code);
    }
  }

  private handleIncorrect(code: string) {
    useSessionStore.getState().recordMistake();
    this.keyboard.setKeyFeedback(code, 'error');
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3', { volume: 0.3 });
    this.pushTimeout(() => {
      this.keyboard.clearKeyFeedback(code);
      this.keyboard.setHintedLetter(this.activeTrout?.currentLetter);
    }, KEY_FEEDBACK_MS);
  }

  private resetProgressBar() {
    this.timerColor = 'green';
    this.progressBar.setColors(TIMER_COLORS.green);
    this.progressBar.progress = 1;
  }

  private activateTrout(trout: Trout) {
    this.activeTrout = trout;
    trout.setActive(true);
    this.wordTimerMs = this.wordDurationMs;
    this.timerRunning = true;
    this.resetProgressBar();
    this.keyboard.setHintedLetter(trout.currentLetter);
  }

  private activateNextAvailableTrout() {
    const next = this.trout.find((t) => t.isPlayable && !t.isComplete);
    if (!next) {
      this.activeTrout = null;
      this.timerRunning = false;
      this.resetProgressBar();
      this.keyboard.setHintedLetter(undefined);
      return;
    }
    this.activateTrout(next);
  }

  private async onWordCaught(trout: Trout) {
    if (this.resolving || this.completed) return;
    this.resolving = true;
    this.timerRunning = false;
    this.activeTrout = null;
    this.keyboard.setHintedLetter(undefined);

    this.catches += 1;
    this.catchCounter.setCount(this.catches);

    await trout.playPopAndHide();
    if (this.completed) return;
    this.removeTrout(trout);

    if (this.catches >= this.totalCatches) {
      this.endGame();
      return;
    }

    if (!this.hasPlayableTrout()) await this.startNewRound();
    else this.activateNextAvailableTrout();
    this.resolving = false;
  }

  private async onWordTimeout() {
    if (this.resolving || this.completed || !this.activeTrout) return;
    this.resolving = true;
    this.timerRunning = false;

    const trout = this.activeTrout;
    this.activeTrout = null;
    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.keyboard.setHintedLetter(undefined);

    await trout.playEscape();
    if (this.completed) return;
    this.removeTrout(trout);

    if (this.catches >= this.totalCatches) {
      this.endGame();
      return;
    }

    if (!this.hasPlayableTrout()) await this.startNewRound();
    else this.activateNextAvailableTrout();
    this.resolving = false;
  }

  private playWordAudio(wordId: number) {
    const alias = getWordAudioAlias(wordId);
    if (sound.exists(alias)) void engine().audio.sfx.play(alias);
  }

  private endGame() {
    if (this.completed) return;
    this.completed = true;
    this.timerRunning = false;
    this.resolving = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.clearFeedbackTimeouts();
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }

  private pushTimeout(fn: () => void, ms: number) {
    this.feedbackTimeouts.push(window.setTimeout(fn, ms));
  }

  private clearFeedbackTimeouts() {
    for (const timeout of this.feedbackTimeouts) window.clearTimeout(timeout);
    this.feedbackTimeouts = [];
  }
}

/** First character after script conversion — matches typing cursor comparison. */
function startingLetter(word: string): string {
  return word[0] ?? '';
}

/**
 * Pick a random word whose starting letter is not already on screen.
 * Works for Arabic, Latin, and Cyrillic because words are pre-converted.
 */
function pickWordWithUniqueStart(
  pool: Array<{ id: number; word: string }>,
  usedStarts: Set<string>,
): { id: number; word: string } | null {
  const candidates = pool.filter((entry) => {
    const start = startingLetter(entry.word);
    return start.length > 0 && !usedStarts.has(start);
  });
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}
