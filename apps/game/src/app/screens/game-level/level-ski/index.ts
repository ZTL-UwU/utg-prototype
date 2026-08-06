import { animate, type AnimationPlaybackControls } from 'motion';
import {
  Container,
  Graphics,
  HTMLText,
  HTMLTextStyle,
  Sprite,
  Texture,
  type DestroyOptions,
  type Ticker,
} from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import {
  convertToCurrentScript,
  getScriptFontFamily,
  isCurrentScriptRtl,
} from '../../../../utils/script';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import {
  REMOTE_SENTENCES_BUNDLE,
  resolveSentencesByIds,
} from '../../../../zustandStores/sentenceStore';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout, type KeyboardColorOptions } from '../../../ui/keyboard-layout';
import { RoundedProgressBar } from '../../../ui/rounded-progress-bar';
import { LevelMapScreen } from '../../level-map';
import {
  findMapUnitForLevel,
  getLevelType,
  getTypedLevel,
  type TLevel,
} from '../../level-map/units';
import { LivesBar } from './lives-bar';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FEEDBACK_MS = 350;
const MAX_FRAME_MS = 50;

/** Matches the blue on-screen keyboard used in other game levels / mockups. */
const KEYBOARD_COLORS: KeyboardColorOptions = {
  PANEL_COLOR: 0x6080ab,
  PANEL_SHADOW_COLOR: 0xe9ddc8,
  KEY_COLOR: 0xf5f3ef,
  KEY_PRESSED_COLOR: 0xafafaf,
  TEXT_COLOR: 0x495669,
  SHIFT_HINT_COLOR: 0xffde59,
};
const KEYBOARD_SCALE = 0.7;
const KEYBOARD_BOTTOM_MARGIN = 28;

const ASSET = {
  background: 'game-levels/game-level-ski/background.png',
  backgroundFinish: 'game-levels/game-level-ski/background-finish.png',
  barrier: 'game-levels/game-level-ski/barrier.png',
  startGate: 'game-levels/game-level-ski/start-gate.png',
  hit: 'game-levels/game-level-ski/hit.png',
  leopardDefault: 'game-levels/game-level-ski/leopard/default.png',
  leopardLeft: 'game-levels/game-level-ski/leopard/ski-left.png',
  leopardRight: 'game-levels/game-level-ski/leopard/ski-right.png',
  leopardAirborne: 'game-levels/game-level-ski/leopard/airborne.png',
  leopardFailed: 'game-levels/game-level-ski/leopard/failed.png',
  leopardFinish: 'game-levels/game-level-ski/leopard/finish.png',
} as const;

/** Ready / Set / Go in Uyghur Arabic — converted to the player's script at runtime. */
const COUNTDOWN_ARABIC = ['تەييار', 'تەييارلى', 'باشلى!'] as const;
const COUNTDOWN_COLORS = [0xef5a42, 0xf5a623, 0x7ed957] as const;

const SENTENCE_COLORS = {
  completed: 0x86bd65,
  error: 0xef5a42,
  remaining: 0x333333,
} as const;

type TimerColor = 'green' | 'orange' | 'red';
const TIMER_COLORS: Record<TimerColor, number> = {
  green: 0x7ed957,
  orange: 0xf5a623,
  red: 0xef5a42,
};

const LAYOUT = {
  lives: { x: 1920, y: 60 },
  progress: { y: 36, width: 520, height: 48 },
  sentenceY: 160,
  leopardY: 800,
  leopardScale: 0.9,
  /** Banner center is above the sprite's midpoint (poles dominate the art). */
  startGate: { y: 340, width: 1100, bannerOffsetY: -210 },
  /** Barrier far (t=0) → near (t=1) in design coords. */
  barrierFar: { y: 430, scale: 0.35 },
  barrierNear: { y: 640, scale: 1.55 },
  hitOffset: { x: -90, y: -40 },
} as const;

const TRIP_OFFSET_X = 70;
const TRIP_MS = 450;
const JUMP_MS = 1800;
const JUMP_PEAK_OFFSET = 320;
const JUMP_SCALE_PEAK = 1.18;
const CRASH_MS = 2400;
const CRASH_FALL_OFFSET = 120;
const CRASH_ROTATION = 0.55;
const BARRIER_MISS_HOLD_MS = 1400;
const FINISH_RUN_MS = 1400;
const SWAY_OFFSET_X = 28;
const SWAY_RETURN_MS = 180;
const RACE_HUD_FADE_MS = 0.35;

type SkiState =
  | 'countdown'
  | 'racing'
  | 'jumping'
  | 'tripping'
  | 'recovering'
  | 'crashing'
  | 'finishing'
  | 'over';

type SentenceRound = {
  sentence: string;
  correctIdx: number;
  /** How many upcoming letters to paint red (one per consecutive mistake). */
  mistakeCount: number;
};

function pickSentences(sentenceIds: number[], roundCount: number): string[] {
  const pool = resolveSentencesByIds(sentenceIds)
    .map((entry) => convertToCurrentScript(entry.sentence.trim()))
    .filter((sentence) => sentence.length > 0);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, roundCount);
  // If the pool is smaller than roundCount, cycle so we still get N barriers.
  while (picked.length > 0 && picked.length < roundCount) {
    picked.push(shuffled[picked.length % shuffled.length]!);
  }
  return picked;
}

function createSkiSentenceStyle(fontSize: number): HTMLTextStyle {
  const rtl = isCurrentScriptRtl();
  return new HTMLTextStyle({
    fontSize,
    fill: SENTENCE_COLORS.remaining,
    padding: 16,
    wordWrap: true,
    wordWrapWidth: 1400,
    align: 'center',
    fontFamily: getScriptFontFamily(),
    cssOverrides: [`direction: ${rtl ? 'rtl' : 'ltr'}`],
    tagStyles: {
      completed: { fill: SENTENCE_COLORS.completed },
      error: { fill: SENTENCE_COLORS.error },
      remaining: { fill: SENTENCE_COLORS.remaining },
    },
  });
}

function getSkiSentenceMarkup(sentence: string, correctIdx: number, mistakeCount: number): string {
  const completed = sentence.slice(0, correctIdx);
  const errorLen = Math.min(Math.max(0, mistakeCount), sentence.length - correctIdx);
  const errored = sentence.slice(correctIdx, correctIdx + errorLen);
  const remaining = sentence.slice(correctIdx + errorLen);
  return (
    `<completed>${completed}</completed>` +
    `<error>${errored}</error>` +
    `<remaining>${remaining}</remaining>`
  );
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export class GameLevelSki extends Container {
  public static assetBundles = ['game-level', 'game-level-ski', 'ui', REMOTE_SENTENCES_BUNDLE];
  public static helpAssets: string[] = ['tutorial-popups/game-level-3.png'];

  private readonly level: TLevel;
  private readonly approachDurationMs: number;
  private readonly countdownStepMs: number;
  private readonly sentences: string[];

  private readonly gameplay = new Container();
  private readonly background: Sprite;
  private readonly startGate: Sprite;
  private readonly barrier: Sprite;
  private readonly leopard: Sprite;
  private readonly hitFx: Sprite;
  private readonly sentencePanel: Graphics;
  private readonly sentenceText: HTMLText;
  private readonly countdownText: HTMLText;
  private readonly progressBar: RoundedProgressBar;
  private readonly livesBar: LivesBar;
  private readonly keyboard: KeyboardLayout;
  private readonly hud: HUD;
  private readonly sentenceStyle: HTMLTextStyle;

  private state: SkiState = 'countdown';
  private paused = true;
  private sentenceIndex = 0;
  private currentRound?: SentenceRound;
  private approachElapsedMs = 0;
  private countdownIndex = 0;
  private countdownElapsedMs = 0;
  private swayLeft = true;
  private swayReturnTimeout?: number;
  private leopardBaseX = DESIGN_WIDTH / 2;
  private anim?: AnimationPlaybackControls;
  private raceHudAnims: AnimationPlaybackControls[] = [];
  private feedbackTimeouts: number[] = [];
  private timerColor: TimerColor = 'green';
  /** Full viewport width in gameplay (design) coords — wider than DESIGN_WIDTH on ultrawide. */
  private sentencePanelWidth = DESIGN_WIDTH;
  private sentencePanelX = 0;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'game-ski');
    const mapUnit = findMapUnitForLevel(typedLevel);
    super();
    this.level = typedLevel;
    this.approachDurationMs = typedLevel.props.approachDurationMs;
    this.countdownStepMs = typedLevel.props.countdownStepMs;
    this.sentences = pickSentences(typedLevel.props.sentenceIds, typedLevel.props.roundCount);

    this.background = new Sprite({
      texture: Texture.from(ASSET.background),
      anchor: 0.5,
    });

    this.startGate = new Sprite({
      texture: Texture.from(ASSET.startGate),
      anchor: 0.5,
    });
    this.startGate.width = LAYOUT.startGate.width;
    this.startGate.height =
      (LAYOUT.startGate.width / this.startGate.texture.width) * this.startGate.texture.height;
    this.startGate.position.set(DESIGN_WIDTH / 2, LAYOUT.startGate.y);

    this.barrier = new Sprite({
      texture: Texture.from(ASSET.barrier),
      anchor: { x: 0.5, y: 1 },
    });
    this.barrier.visible = false;

    this.leopard = new Sprite({
      texture: Texture.from(ASSET.leopardDefault),
      anchor: { x: 0.5, y: 1 },
    });
    this.leopard.scale.set(LAYOUT.leopardScale);
    this.leopard.position.set(DESIGN_WIDTH / 2, LAYOUT.leopardY);

    this.hitFx = new Sprite({
      texture: Texture.from(ASSET.hit),
      anchor: 0.5,
    });
    this.hitFx.visible = false;
    this.hitFx.scale.set(0.85);

    this.livesBar = new LivesBar(typedLevel.props.maxLives);
    this.livesBar.position.set(LAYOUT.lives.x, LAYOUT.lives.y);
    this.livesBar.visible = false;

    this.progressBar = new RoundedProgressBar({
      width: LAYOUT.progress.width,
      height: LAYOUT.progress.height,
      trackColor: TIMER_COLORS.green,
      fillColor: TIMER_COLORS.green,
      strokeWidth: 6,
      padding: 8,
    });
    this.progressBar.progress = 1;
    this.progressBar.position.set((DESIGN_WIDTH - LAYOUT.progress.width) / 2, LAYOUT.progress.y);
    this.progressBar.visible = false;

    this.sentenceStyle = createSkiSentenceStyle(typedLevel.props.sentenceFontSize);
    this.sentenceText = new HTMLText({ style: this.sentenceStyle });
    this.sentenceText.anchor.set(0.5);
    this.sentenceText.position.set(DESIGN_WIDTH / 2, LAYOUT.sentenceY);
    this.sentenceText.visible = false;

    this.sentencePanel = new Graphics();
    this.sentencePanel.visible = false;

    const countdownStyle = new HTMLTextStyle({
      fontSize: 96,
      fill: COUNTDOWN_COLORS[0],
      fontFamily: getScriptFontFamily(),
      align: 'center',
      cssOverrides: [`direction: ${isCurrentScriptRtl() ? 'rtl' : 'ltr'}`],
    });
    this.countdownText = new HTMLText({
      text: convertToCurrentScript(COUNTDOWN_ARABIC[0]),
      style: countdownStyle,
    });
    this.countdownText.anchor.set(0.5);
    // Sit in the white banner portion of the start-gate art.
    this.countdownText.position.set(
      DESIGN_WIDTH / 2,
      LAYOUT.startGate.y + LAYOUT.startGate.bannerOffsetY,
    );

    this.keyboard = new KeyboardLayout(KEYBOARD_COLORS);
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: getLevelType(typedLevel),
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    this.gameplay.addChild(
      this.startGate,
      this.barrier,
      this.leopard,
      this.hitFx,
      this.sentencePanel,
      this.sentenceText,
      this.countdownText,
      this.progressBar,
      this.livesBar,
      this.keyboard,
    );
    this.addChild(this.background, this.gameplay, this.hud);

    this.keyboard.visible = false;
    this.applyBarrierProgress(0);
  }

  public resize(width: number, height: number) {
    const uiScale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    const backgroundScale = Math.max(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    this.background.position.set(width / 2, height / 2);
    this.background.scale.set(backgroundScale);

    this.gameplay.scale.set(uiScale);
    this.gameplay.position.set(
      (width - DESIGN_WIDTH * uiScale) / 2,
      (height - DESIGN_HEIGHT * uiScale) / 2,
    );
    // Bleed past the letterboxed design area so the banner spans the real screen.
    this.sentencePanelWidth = width / uiScale;
    this.sentencePanelX = (DESIGN_WIDTH - this.sentencePanelWidth) / 2;
    this.layoutSentencePanel();
    this.keyboard.resize(DESIGN_WIDTH, DESIGN_HEIGHT);
    const scale = this.keyboard.scale.x * KEYBOARD_SCALE;
    this.keyboard.scale.set(scale);
    this.keyboard.position.set(
      Math.round((DESIGN_WIDTH - this.keyboard.width) / 2),
      Math.round(DESIGN_HEIGHT - KEYBOARD_BOTTOM_MARGIN - this.keyboard.height),
    );
    this.hud.layout = { width, height };
  }

  public update(ticker: Ticker) {
    if (this.paused || this.state === 'over') return;
    const deltaMs = Math.min(ticker.deltaMS, MAX_FRAME_MS);

    if (this.state === 'countdown') {
      this.updateCountdown(deltaMs);
      return;
    }

    // Keep the barrier approaching while the skier recovers from a trip.
    if (this.state === 'racing' || this.state === 'tripping') {
      this.updateRacing(deltaMs);
    }
  }

  public async show() {
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    // Keyboard stays hidden until the race starts after countdown.
  }

  public async hide() {
    await this.pause();
    if (this.keyboard.visible) await this.keyboard.playExitAnimation();
  }

  public async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.keyboard.visible) await this.keyboard.pause();
  }

  public async resume() {
    if (this.state === 'over') return;
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    if (this.keyboard.visible) {
      await this.keyboard.resume();
      this.keyboard.setHintedLetter(this.currentTargetLetter);
    }
  }

  public reset() {
    this.anim?.stop();
    this.anim = undefined;
    this.stopRaceHudAnims();
    this.clearFeedbackTimeouts();
    this.livesBar.reset();
    this.state = 'countdown';
    this.sentenceIndex = 0;
    this.currentRound = undefined;
    this.approachElapsedMs = 0;
    this.countdownIndex = 0;
    this.countdownElapsedMs = 0;
    this.swayLeft = true;
    this.timerColor = 'green';
    this.background.texture = Texture.from(ASSET.background);
    this.startGate.visible = true;
    this.countdownText.visible = true;
    this.countdownText.style.fill = COUNTDOWN_COLORS[0];
    this.countdownText.text = convertToCurrentScript(COUNTDOWN_ARABIC[0]);
    this.barrier.visible = false;
    this.hitFx.visible = false;
    this.keyboard.visible = false;
    this.keyboard.clearAllKeyFeedback();
    this.setRaceUiVisible(false);
    this.hud.visible = true;
    this.progressBar.progress = 1;
    this.progressBar.setColors(TIMER_COLORS.green);
    this.leopard.texture = Texture.from(ASSET.leopardDefault);
    this.leopard.position.set(DESIGN_WIDTH / 2, LAYOUT.leopardY);
    this.leopard.scale.set(LAYOUT.leopardScale);
    this.leopard.rotation = 0;
    this.leopard.alpha = 1;
    this.leopardBaseX = DESIGN_WIDTH / 2;
    this.applyBarrierProgress(0);
  }

  override destroy(options?: DestroyOptions) {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.anim?.stop();
    this.stopRaceHudAnims();
    this.clearFeedbackTimeouts();
    super.destroy(options);
  }

  private get currentTargetLetter(): string | undefined {
    if (!this.currentRound || this.currentRound.mistakeCount > 0) return undefined;
    return this.currentRound.sentence[this.currentRound.correctIdx];
  }

  private updateCountdown(deltaMs: number) {
    this.countdownElapsedMs += deltaMs;
    if (this.countdownElapsedMs < this.countdownStepMs) return;

    this.countdownElapsedMs = 0;
    this.countdownIndex += 1;

    if (this.countdownIndex >= COUNTDOWN_ARABIC.length) {
      // Leave countdown immediately so a slow beginRace can't double-fire.
      this.state = 'recovering';
      void this.beginRace();
      return;
    }

    this.countdownText.style.fill = COUNTDOWN_COLORS[this.countdownIndex]!;
    this.countdownText.text = convertToCurrentScript(COUNTDOWN_ARABIC[this.countdownIndex]!);
  }

  private async beginRace() {
    this.startGate.visible = false;
    this.countdownText.visible = false;
    this.keyboard.visible = true;
    await this.keyboard.playEnterAnimation();
    this.startSentenceRound(0);
  }

  private startSentenceRound(index: number) {
    if (index >= this.sentences.length) {
      void this.playFinishSequence();
      return;
    }

    this.sentenceIndex = index;
    this.livesBar.reset();
    this.currentRound = {
      sentence: this.sentences[index]!,
      correctIdx: 0,
      mistakeCount: 0,
    };
    this.approachElapsedMs = 0;
    this.timerColor = 'green';
    this.progressBar.setColors(TIMER_COLORS.green);
    this.progressBar.progress = 1;
    this.barrier.visible = true;
    this.hitFx.visible = false;
    this.leopard.texture = Texture.from(ASSET.leopardDefault);
    this.leopard.x = this.leopardBaseX;
    this.leopard.y = LAYOUT.leopardY;
    this.leopard.scale.set(LAYOUT.leopardScale);
    this.leopard.rotation = 0;
    this.leopard.alpha = 1;
    this.applyBarrierProgress(0);
    this.renderSentence();
    this.keyboard.visible = true;
    this.hud.visible = true;
    this.playRaceHudAppear();
    this.state = 'racing';
  }

  private updateRacing(deltaMs: number) {
    this.approachElapsedMs = Math.min(this.approachDurationMs, this.approachElapsedMs + deltaMs);
    const remaining = 1 - this.approachElapsedMs / this.approachDurationMs;
    const nextColor: TimerColor =
      remaining > 2 / 3 ? 'green' : remaining > 1 / 3 ? 'orange' : 'red';
    if (nextColor !== this.timerColor) {
      this.timerColor = nextColor;
      this.progressBar.setColors(TIMER_COLORS[nextColor]);
    }
    this.progressBar.progress = remaining;
    this.applyBarrierProgress(1 - remaining);

    if (this.approachElapsedMs >= this.approachDurationMs) {
      void this.onBarrierMiss();
    }
  }

  private applyBarrierProgress(t: number) {
    const clamped = Math.max(0, Math.min(1, t));
    // Ease so the barrier lingers far away then rushes in.
    const eased = clamped * clamped;
    this.barrier.y = lerp(LAYOUT.barrierFar.y, LAYOUT.barrierNear.y, eased);
    const scale = lerp(LAYOUT.barrierFar.scale, LAYOUT.barrierNear.scale, eased);
    this.barrier.scale.set(scale);
    this.barrier.x = DESIGN_WIDTH / 2;
  }

  private renderSentence() {
    if (!this.currentRound) return;
    const { sentence, correctIdx, mistakeCount } = this.currentRound;
    this.sentenceText.text = getSkiSentenceMarkup(sentence, correctIdx, mistakeCount);
    this.layoutSentencePanel();
    this.keyboard.setHintedLetter(this.currentTargetLetter);
  }

  private layoutSentencePanel() {
    const padY = 18;
    const bounds = this.sentenceText.getLocalBounds();
    const h = Math.max(64, bounds.height + padY * 2);
    this.sentencePanel
      .clear()
      .rect(0, -h / 2, this.sentencePanelWidth, h)
      .fill({ color: 0xffffff });
    this.sentencePanel.position.set(this.sentencePanelX, LAYOUT.sentenceY);
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (
      this.paused ||
      (this.state !== 'racing' && this.state !== 'tripping') ||
      event.repeat ||
      event.key === 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !this.currentRound
    ) {
      return;
    }

    if (event.code === 'Backspace' || event.key === 'Backspace') {
      event.preventDefault();
      this.handleBackspace();
      return;
    }

    const typed = getMappedFromKeyboardEvent(event);
    if (typed === '' && event.code !== 'Space') return;

    // Must backspace red error letters before a correct key can advance.
    if (this.currentRound.mistakeCount > 0) {
      this.onTypingMistake(event.code);
      return;
    }

    const { sentence, correctIdx } = this.currentRound;
    const matched = typed.length > 0 && sentence.startsWith(typed, correctIdx);
    if (matched) {
      this.keyboard.setKeyFeedback(event.code, 'success');
      this.pushTimeout(() => this.keyboard.clearKeyFeedback(event.code), FEEDBACK_MS);
      useSessionStore.getState().recordCorrect();
      this.pulseSkiSway();
      this.currentRound.mistakeCount = 0;
      this.currentRound.correctIdx += typed.length;
      if (this.currentRound.correctIdx >= sentence.length) {
        void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
        void this.onSentenceComplete();
      } else {
        this.renderSentence();
      }
    } else {
      this.onTypingMistake(event.code);
    }
  };

  private pulseSkiSway() {
    // Don't override jump / crash / finish poses, or fight the trip slide.
    if (this.state !== 'racing') return;
    this.swayLeft = !this.swayLeft;
    this.leopard.texture = Texture.from(this.swayLeft ? ASSET.leopardLeft : ASSET.leopardRight);
    const swayX = this.leopardBaseX + (this.swayLeft ? -SWAY_OFFSET_X : SWAY_OFFSET_X);

    this.anim?.stop();
    this.anim = animate(this.leopard.x, swayX, {
      duration: SWAY_RETURN_MS / 2000,
      ease: 'easeOut',
      onUpdate: (x) => {
        this.leopard.x = x;
      },
    });

    if (this.swayReturnTimeout !== undefined) window.clearTimeout(this.swayReturnTimeout);
    this.swayReturnTimeout = window.setTimeout(() => {
      this.swayReturnTimeout = undefined;
      if (this.state !== 'racing') return;
      this.leopard.texture = Texture.from(ASSET.leopardDefault);
      this.anim?.stop();
      this.anim = animate(this.leopard.x, this.leopardBaseX, {
        duration: SWAY_RETURN_MS / 2000,
        ease: 'easeInOut',
        onUpdate: (x) => {
          this.leopard.x = x;
        },
      });
    }, SWAY_RETURN_MS);
  }

  private handleBackspace() {
    if (!this.currentRound || this.currentRound.mistakeCount <= 0) return;
    this.currentRound.mistakeCount -= 1;
    this.keyboard.setKeyFeedback('Backspace', 'success');
    this.pushTimeout(() => this.keyboard.clearKeyFeedback('Backspace'), FEEDBACK_MS);
    this.renderSentence();
  }

  private onTypingMistake(code: string) {
    if (!this.currentRound) return;
    const remaining = this.currentRound.sentence.length - this.currentRound.correctIdx;
    this.currentRound.mistakeCount = Math.min(this.currentRound.mistakeCount + 1, remaining);
    this.keyboard.setKeyFeedback(code, 'error');
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.pushTimeout(() => {
      this.keyboard.clearKeyFeedback(code);
      this.keyboard.setHintedLetter(this.currentTargetLetter);
    }, FEEDBACK_MS);
    useSessionStore.getState().recordMistake();
    this.renderSentence();

    const livesLeft = this.livesBar.loseLife();
    if (livesLeft <= 0) {
      void this.playCrashAndEnd();
      return;
    }
    void this.playTrip();
  }

  private async playTrip() {
    if (this.state !== 'racing') return;
    this.state = 'tripping';
    const fromX = this.leopard.x;
    const tripX = fromX + (Math.random() > 0.5 ? TRIP_OFFSET_X : -TRIP_OFFSET_X);
    this.anim?.stop();
    this.anim = animate(fromX, tripX, {
      duration: TRIP_MS / 2000,
      ease: 'easeOut',
      onUpdate: (x) => {
        this.leopard.x = x;
      },
      onComplete: () => {
        this.anim = animate(tripX, this.leopardBaseX, {
          duration: TRIP_MS / 2000,
          ease: 'easeInOut',
          onUpdate: (x) => {
            this.leopard.x = x;
          },
          onComplete: () => {
            if (this.state === 'tripping') this.state = 'racing';
          },
        });
      },
    });
  }

  private setRaceUiVisible(visible: boolean) {
    this.stopRaceHudAnims();
    for (const el of [this.progressBar, this.livesBar, this.sentenceText, this.sentencePanel]) {
      el.alpha = 1;
      el.visible = visible;
    }
    this.keyboard.visible = visible;
    this.hud.visible = visible;
  }

  private stopRaceHudAnims() {
    for (const anim of this.raceHudAnims) anim.stop();
    this.raceHudAnims = [];
  }

  private playRaceHudAppear() {
    this.stopRaceHudAnims();
    const targets = [this.progressBar, this.livesBar, this.sentenceText, this.sentencePanel];
    for (const el of targets) {
      el.alpha = 0;
      el.visible = true;
    }
    this.raceHudAnims = targets.map((el) =>
      animate(el, { alpha: 1 }, { duration: RACE_HUD_FADE_MS, ease: 'easeOut' }),
    );
  }

  private async onSentenceComplete() {
    if (this.state !== 'racing' && this.state !== 'tripping') return;
    this.state = 'jumping';
    this.anim?.stop();
    this.setRaceUiVisible(false);
    this.leopard.texture = Texture.from(ASSET.leopardAirborne);
    this.leopard.x = this.leopardBaseX;
    this.leopard.rotation = 0;
    this.leopard.alpha = 1;

    const startY = this.leopard.y;
    const peakY = startY - JUMP_PEAK_OFFSET;
    const approachT = Math.min(1, this.approachElapsedMs / this.approachDurationMs);
    this.anim = animate(0, 1, {
      duration: JUMP_MS / 1000,
      ease: 'easeInOut',
      onUpdate: (t) => {
        // Hang near the apex so the airborne pose reads longer.
        const arc = Math.sin(Math.PI * t);
        this.leopard.y = lerp(startY, peakY, arc);
        const scaleBoost = 1 + (JUMP_SCALE_PEAK - 1) * arc;
        this.leopard.scale.set(LAYOUT.leopardScale * scaleBoost);
        this.applyBarrierProgress(Math.min(1, approachT + t * (1 - approachT)));
      },
    });
    await this.anim.finished;

    this.barrier.visible = false;
    this.leopard.y = LAYOUT.leopardY;
    this.leopard.scale.set(LAYOUT.leopardScale);
    this.leopard.texture = Texture.from(ASSET.leopardDefault);
    this.startSentenceRound(this.sentenceIndex + 1);
  }

  private async onBarrierMiss() {
    if (this.state !== 'racing' && this.state !== 'tripping') return;
    this.state = 'recovering';
    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');

    const livesLeft = this.livesBar.loseLife();
    if (livesLeft <= 0) {
      await this.playCrashAndEnd();
      return;
    }

    this.setRaceUiVisible(false);
    this.showHitFx();
    this.leopard.texture = Texture.from(ASSET.leopardFailed);
    this.leopard.x = this.leopardBaseX;

    const startY = this.leopard.y;
    this.anim?.stop();
    this.anim = animate(0, 1, {
      duration: BARRIER_MISS_HOLD_MS / 1000,
      ease: 'easeOut',
      onUpdate: (t) => {
        this.leopard.y = startY + 28 * Math.sin(t * Math.PI);
        this.leopard.rotation = CRASH_ROTATION * 0.35 * Math.sin(t * Math.PI);
        this.leopard.scale.set(LAYOUT.leopardScale * (1 - 0.06 * Math.sin(t * Math.PI)));
      },
    });
    await this.anim.finished;

    this.hitFx.visible = false;
    this.leopard.rotation = 0;
    this.leopard.scale.set(LAYOUT.leopardScale);
    this.leopard.y = LAYOUT.leopardY;
    this.startSentenceRound(this.sentenceIndex + 1);
  }

  private async playCrashAndEnd() {
    if (this.state === 'crashing' || this.state === 'over') return;
    this.state = 'crashing';
    this.anim?.stop();
    this.setRaceUiVisible(false);
    this.showHitFx();
    this.leopard.texture = Texture.from(ASSET.leopardFailed);
    this.leopard.x = this.leopardBaseX;
    this.leopard.alpha = 1;

    const startY = this.leopard.y;
    this.anim = animate(0, 1, {
      duration: CRASH_MS / 1000,
      ease: 'easeIn',
      onUpdate: (t) => {
        // Slow tumble down the slope — rotate, squash, and fade late.
        const fall = t * t;
        this.leopard.y = startY + CRASH_FALL_OFFSET * fall;
        this.leopard.rotation = CRASH_ROTATION * fall;
      },
    });
    await this.anim.finished;
    this.endGame();
  }

  private async playFinishSequence() {
    this.state = 'finishing';
    this.setRaceUiVisible(false);
    this.barrier.visible = false;
    this.hitFx.visible = false;
    this.background.texture = Texture.from(ASSET.backgroundFinish);
    this.leopard.texture = Texture.from(ASSET.leopardDefault);
    this.leopard.x = this.leopardBaseX;
    this.leopard.y = LAYOUT.leopardY;
    this.leopard.rotation = 0;
    this.leopard.alpha = 1;
    this.leopard.scale.set(LAYOUT.leopardScale);

    // Short ski toward the finish, then celebrate with sticks raised.
    this.anim = animate(0, 1, {
      duration: FINISH_RUN_MS / 1000,
      ease: 'easeOut',
      onUpdate: (t) => {
        this.leopard.y = lerp(LAYOUT.leopardY, LAYOUT.leopardY - 30, t);
        this.leopard.scale.set(LAYOUT.leopardScale * (1 - t * 0.08));
      },
    });
    await this.anim.finished;

    this.leopard.texture = Texture.from(ASSET.leopardFinish);
    this.leopard.scale.set(LAYOUT.leopardScale);
    await this.wait(900);
    this.endGame();
  }

  private showHitFx() {
    this.hitFx.visible = true;
    this.hitFx.alpha = 1;
    this.hitFx.scale.set(0.85);
    this.hitFx.position.set(
      this.leopard.x + LAYOUT.hitOffset.x,
      this.leopard.y - this.leopard.height * 0.45 + LAYOUT.hitOffset.y,
    );
  }

  private endGame() {
    if (this.state === 'over') return;
    this.state = 'over';
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
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
    if (this.swayReturnTimeout !== undefined) {
      window.clearTimeout(this.swayReturnTimeout);
      this.swayReturnTimeout = undefined;
    }
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => {
      this.pushTimeout(resolve, ms);
    });
  }
}
