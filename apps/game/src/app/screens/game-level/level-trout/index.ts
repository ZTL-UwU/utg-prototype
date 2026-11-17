import { Container, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { frameDeltaMs } from '../../../../engine/utils/maths';
import { isPhone, responsive, topClearance } from '../../../../engine/utils/viewport';
import { getTypedText } from '../../../../utils/keymap';
import { convertToCurrentScript } from '../../../../utils/script';
import useSessionStore from '../../../../zustandStores/sessionStore';
import {
  getWordStandardAudioAlias,
  playWordAudio,
  levelWordAssets,
  resolveWordsByIds,
} from '../../../../zustandStores/wordStore';
import type { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { TimerBar } from '../../../ui/timer-bar';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel } from '../../level-map/units';
import { CatchCounter } from './catch-counter';
import { Trout } from './trout';

const KEY_FEEDBACK_MS = 300;
const HUD_MARGIN = 40;
/** The catch counter sits this far below the top margin. */
const CATCH_COUNTER_DROP = 24;
const KEYBOARD_TOP = 90;
const WIDE_KEYBOARD_SCALE = 0.8;
const PROGRESS_BAR = { width: 520, height: 36, y: 28 } as const;
/** A wrong key is quieter here: the river is busy with words already. */
const WRONG_KEY_VOLUME = 0.3;

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

/** The phone river runs top to bottom, above the keyboard. */
const PHONE_SLOT_LAYOUT: Array<{ x: number; y: number }> = [
  { x: 0.26, y: 0.22 },
  { x: 0.72, y: 0.27 },
  { x: 0.3, y: 0.36 },
  { x: 0.74, y: 0.42 },
  { x: 0.26, y: 0.5 },
  { x: 0.7, y: 0.57 },
  { x: 0.5, y: 0.32 },
  { x: 0.48, y: 0.63 },
];

export class GameLevelTrout extends Container {
  public readonly screenName = 'GameLevelTrout';
  public static assetBundles = ['game-level-trout', 'ui'];
  public static assets = levelWordAssets('standardAudio');
  public static loadingBackgroundAsset = 'game-levels/game-level-trout/splash.png';
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
  private readonly progressBar: TimerBar;
  private readonly catchCounter: CatchCounter;
  private readonly hud: HUD;
  private readonly troutLayer = new Container();

  private screenWidth = 0;
  private screenHeight = 0;
  private trout: Trout[] = [];
  private activeTrout: Trout | null = null;
  private wordTimerMs = 0;
  private timerRunning = false;
  private catches = 0;
  private paused = false;
  private completed = false;
  private resolving = false;

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
      .map((entry) => ({
        id: entry.id,
        word: convertToCurrentScript(entry.word, { autoCapitalize: false }),
      }))
      .filter((entry) => entry.word.length > 0);

    this.background = new Sprite({
      texture: Texture.from('game-levels/game-level-trout/background.png'),
      // Cover rather than stretch, so the canyon keeps its shape on tall phones.
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.keyboard = new KeyboardLayout({ text: 'words' });
    this.progressBar = new TimerBar({
      width: PROGRESS_BAR.width,
      height: PROGRESS_BAR.height,
      strokeWidth: 6,
      padding: 8,
    });
    this.catchCounter = new CatchCounter();
    this.hud = createLevelHud(typedLevel);

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
    // Mockup places the keyboard under the timer, above the river. Phones keep it at the
    // bottom like every other level, with the river above it.
    if (!isPhone()) {
      this.keyboard.scale.set(WIDE_KEYBOARD_SCALE);
      this.keyboard.position.set(Math.round((width - this.keyboard.width) / 2), KEYBOARD_TOP);
    }

    // The timer and the catch counter drop below the notch on phones.
    const top = topClearance(height);
    const barScale = responsive({ sm: 0.7, lg: 1 });
    this.progressBar.scale.set(barScale);
    this.progressBar.position.set(
      (width - PROGRESS_BAR.width * barScale) / 2,
      PROGRESS_BAR.y + top,
    );
    this.catchCounter.position.set(
      width - HUD_MARGIN - this.catchCounter.width,
      HUD_MARGIN + CATCH_COUNTER_DROP + top,
    );
    this.hud.layout = { width, height };

    const slots = responsive({ sm: PHONE_SLOT_LAYOUT, lg: SLOT_LAYOUT });
    for (let i = 0; i < this.trout.length; i++) {
      const slot = slots[i % slots.length];
      this.trout[i].setHome(width * slot.x, height * slot.y);
    }
  }

  public update(ticker: Ticker) {
    if (this.paused || this.completed) return;
    const deltaMs = frameDeltaMs(ticker);

    for (const t of this.trout) t.updateSwim(deltaMs);

    if (!this.timerRunning || this.resolving || !this.activeTrout) return;
    this.wordTimerMs -= deltaMs;
    this.progressBar.setRemaining(Math.max(0, this.wordTimerMs / this.wordDurationMs));
    if (this.wordTimerMs <= 0) void this.onWordTimeout();
  }

  /** Behind a popup such as Quit: the river and the keyboard hold still. */
  async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
  }

  async resume() {
    if (this.completed) return;
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
  }

  async show() {
    this.catchCounter.setCount(0);
    // An empty or filtered word pool ends the level here.
    this.startNewRound();
    if (this.completed) return;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playEnterAnimation();
  }

  async hide() {
    this.timerRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.keyboard.setHintedLetter(undefined);
    await this.keyboard.playExitAnimation();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
  }

  /** Spawns a fresh set of trout. Catch counter is intentionally left alone. */
  private spawnRound() {
    const count = Math.min(this.maxActiveTrout, SLOT_LAYOUT.length, this.wordPool.length);
    const usedStarts = new Set<string>();

    for (let i = 0; i < count; i++) {
      const entry = pickWordWithUniqueStart(this.wordPool, usedStarts);
      if (!entry) break;
      usedStarts.add(startingLetter(entry.word));

      const slot = responsive({ sm: PHONE_SLOT_LAYOUT, lg: SLOT_LAYOUT })[i];
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

  private startNewRound() {
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
    const typed = getTypedText(event);
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
      this.keyboard.flashKeyFeedback(code, 'success', { ms: KEY_FEEDBACK_MS });

      if (trout.isComplete) {
        void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
        void this.onWordCaught(trout);
      } else {
        this.keyboard.setHintedLetter(trout.currentLetter, trout.nextLetter);
      }
    } else {
      this.handleIncorrect(code);
    }
  }

  private handleIncorrect(code: string) {
    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3', {
      volume: WRONG_KEY_VOLUME,
    });
    this.keyboard.flashKeyFeedback(code, 'error', {
      ms: KEY_FEEDBACK_MS,
      onCleared: () =>
        this.keyboard.setHintedLetter(
          this.activeTrout?.currentLetter,
          this.activeTrout?.nextLetter,
        ),
    });
  }

  private resetProgressBar() {
    this.progressBar.setRemaining(1);
  }

  private activateTrout(trout: Trout) {
    this.activeTrout = trout;
    trout.setActive(true);
    this.wordTimerMs = this.wordDurationMs;
    this.timerRunning = true;
    this.resetProgressBar();
    this.keyboard.setHintedLetter(trout.currentLetter, trout.nextLetter);
    this.keyboard.setWordStart(true);
    // Hear the word as it becomes the target; silent when unrecorded.
    void playWordAudio(getWordStandardAudioAlias(trout.wordId));
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
    await this.finishTrout(trout, trout.playPopAndHide());
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
    await this.finishTrout(trout, trout.playEscape());
  }

  /** Once a caught or escaping trout's animation is over: end, or bring on the next fish. */
  private async finishTrout(trout: Trout, leaving: Promise<void>) {
    await leaving;
    if (this.completed || this.destroyed) return;
    this.removeTrout(trout);

    if (this.catches >= this.totalCatches) {
      this.endGame();
      return;
    }

    if (!this.hasPlayableTrout()) this.startNewRound();
    else this.activateNextAvailableTrout();
    this.resolving = false;
  }

  private endGame() {
    if (this.completed) return;
    this.completed = true;
    this.timerRunning = false;
    this.resolving = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    finishLevel(this, this.level);
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
