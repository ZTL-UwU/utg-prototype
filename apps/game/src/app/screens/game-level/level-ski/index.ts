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
import { frameDeltaMs, lerp } from '../../../../engine/utils/maths';
import { randomInt } from '../../../../engine/utils/random';
import { responsive, usesPhoneKeyboard } from '../../../../engine/utils/viewport';
import { getSentenceMarkup } from '../../../../utils/example-words';
import { getTypedText } from '../../../../utils/keymap';
import {
  convertToCurrentScript,
  getScriptFontFamily,
  isCurrentScriptRtl,
} from '../../../../utils/script';
import { REMOTE_SENTENCES_BUNDLE } from '../../../../zustandStores/sentenceStore';
import useSessionStore from '../../../../zustandStores/sessionStore';
import type { HUD } from '../../../ui/hud';
import { BLUE_KEYBOARD_COLORS, KeyboardLayout } from '../../../ui/keyboard-layout';
import { LivesBar } from '../../../ui/lives-bar';
import { TimerBar } from '../../../ui/timer-bar';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel } from '../../level-map/units';
import { generateSentenceRounds } from '../../typing-level/sentence-rounds';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const HEART_ASSET = 'game-levels/game-level-ski/heart-full.png';
/** Widest the sentence wraps at, in design units; narrower screens wrap within their view. */
const SENTENCE_MAX_WRAP = 1400;
const SENTENCE_SIDE_PADDING = 40;
const SENTENCE_PANEL_PAD_Y = 18;
const SENTENCE_PANEL_MIN_HEIGHT = 64;
const KEYBOARD_SCALE = 0.7;
/** Design units a phone shows across its width, and how far down the stage starts. */
const PHONE_STAGE = {
  width: 1067,
  top: 240,
  minTop: 190,
  /** Design rows of the sentence banner and the skier's feet. */
  sentenceTop: 100,
  skierBottom: 960,
  keyboardHeight: 500,
};
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
const COUNTDOWN_ARABIC = ['دىققەت', 'تەييارلىق', 'باشلا!'] as const;
const COUNTDOWN_COLORS = [0xef5a42, 0xf5a623, 0x7ed957] as const;

const SENTENCE_COLORS = {
  completed: 0x86bd65,
  remaining: 0x333333,
} as const;

const LAYOUT = {
  lives: { x: 1920, y: 60 },
  phoneLives: { x: 1480, y: -30 },
  progress: { y: 36, width: 520, height: 48 },
  sentenceY: 160,
  leopardY: 800,
  leopardScale: 0.9,
  /** Banner center is above the sprite's midpoint (poles dominate the art). */
  startGate: { y: 340, width: 1100, bannerOffsetY: -210 },
  /** Barrier far (t=0) → near (t=1) in design coords. */
  barrierFar: { y: 430, scale: 0.35 },
  barrierNear: { y: 640, scale: 1.55 },
  /** Cleared-jump end pose — passes under the leopard. */
  barrierJump: { y: 950, scale: 1.75 },
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
const RACE_HUD_FADE_S = 0.35;
/** The celebration's hold before the end popup. */
const FINISH_HOLD_MS = 900;
const FINISH_RISE = 30;
const FINISH_SHRINK = 0.08;
/** The barrier-miss wobble: how far the skier dips and squashes. */
const MISS_DIP = 28;
const MISS_SQUASH = 0.06;

/** Seconds in `ms` milliseconds, for motion's durations. */
const seconds = (ms: number) => ms / 1000;

type SkiState =
  | 'countdown'
  /** Countdown over, waiting for the keyboard to come in. */
  | 'starting'
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
};

/** Every sentence of one random story from the level's pool, in story order. */
function pickStorySentences(storyIds: number[]): string[] {
  if (storyIds.length === 0) return [];
  const storyId = storyIds[randomInt(0, storyIds.length - 1)]!;
  return generateSentenceRounds(storyId).map((round) => round.sentence);
}

function createSkiSentenceStyle(fontSize: number): HTMLTextStyle {
  const rtl = isCurrentScriptRtl();
  return new HTMLTextStyle({
    fontSize,
    fill: SENTENCE_COLORS.remaining,
    padding: 16,
    wordWrap: true,
    wordWrapWidth: SENTENCE_MAX_WRAP,
    align: 'center',
    fontFamily: getScriptFontFamily(),
    cssOverrides: [`direction: ${rtl ? 'rtl' : 'ltr'}`],
    tagStyles: {
      completed: { fill: SENTENCE_COLORS.completed },
      remaining: { fill: SENTENCE_COLORS.remaining },
    },
  });
}

/** The barrier's height on the slope and its scale, `t` of the way from far (0) to near (1). */
function barrierPose(t: number) {
  // Ease so the barrier lingers far away then rushes in.
  const eased = Math.max(0, Math.min(1, t)) ** 2;
  return {
    y: lerp(LAYOUT.barrierFar.y, LAYOUT.barrierNear.y, eased),
    scale: lerp(LAYOUT.barrierFar.scale, LAYOUT.barrierNear.scale, eased),
  };
}

export class GameLevelSki extends Container {
  public readonly screenName = 'GameLevelSki';
  public static assetBundles = ['game-level-ski', 'ui', REMOTE_SENTENCES_BUNDLE];
  public static loadingBackgroundAsset = 'game-levels/game-level-ski/splash.png';
  public static helpAssets: string[] = ['tutorial-popups/game-level-ski.png'];

  private readonly level: TLevel;
  private readonly approachDurationMs: number;
  private readonly countdownStepMs: number;
  private readonly storyIds: number[];
  private sentences: string[] = [];

  private readonly gameplay = new Container();
  private readonly background: Sprite;
  private readonly startGate: Sprite;
  private readonly barrier: Sprite;
  private readonly leopard: Sprite;
  private readonly hitFx: Sprite;
  private readonly sentencePanel: Graphics;
  private readonly sentenceText: HTMLText;
  private readonly countdownText: HTMLText;
  private readonly progressBar: TimerBar;
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
  /** Full viewport width in gameplay (design) coords — wider than DESIGN_WIDTH on ultrawide. */
  private sentencePanelWidth = DESIGN_WIDTH;
  private sentencePanelX = 0;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'game-ski');
    super();
    this.level = typedLevel;
    this.approachDurationMs = typedLevel.props.approachDurationMs;
    this.countdownStepMs = typedLevel.props.countdownStepMs;
    this.storyIds = typedLevel.props.storyIds;
    this.sentences = pickStorySentences(this.storyIds);

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

    this.livesBar = new LivesBar({ maxLives: typedLevel.props.maxLives, icon: HEART_ASSET });
    this.livesBar.visible = false;

    this.progressBar = new TimerBar({
      width: LAYOUT.progress.width,
      height: LAYOUT.progress.height,
      strokeWidth: 6,
      padding: 8,
    });
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

    this.keyboard = new KeyboardLayout({ colors: BLUE_KEYBOARD_COLORS, text: 'sentences' });
    this.hud = createLevelHud(typedLevel);

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
    const fitScale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    // Phones zoom in on the middle of the slope, keeping the skier clear of the keyboard.
    const keyboardTop = height - PHONE_STAGE.keyboardHeight;
    const uiScale = responsive({
      sm: Math.min(
        width / PHONE_STAGE.width,
        (keyboardTop - PHONE_STAGE.minTop) / (PHONE_STAGE.skierBottom - PHONE_STAGE.sentenceTop),
      ),
      lg: fitScale,
    });
    const backgroundScale = Math.max(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    this.background.position.set(width / 2, height / 2);
    this.background.scale.set(backgroundScale);

    this.gameplay.scale.set(uiScale);
    this.gameplay.position.set(
      (width - DESIGN_WIDTH * uiScale) / 2,
      responsive({
        sm: Math.min(PHONE_STAGE.top, keyboardTop - PHONE_STAGE.skierBottom * uiScale),
        lg: (height - DESIGN_HEIGHT * uiScale) / 2,
      }),
    );
    // Bleed past the letterboxed design area so the banner spans the real screen.
    this.sentencePanelWidth = width / uiScale;
    this.sentencePanelX = (DESIGN_WIDTH - this.sentencePanelWidth) / 2;
    // A phone shows only about 1067 design units across, so wrap within what it shows.
    this.sentenceStyle.wordWrapWidth = Math.min(
      SENTENCE_MAX_WRAP,
      this.sentencePanelWidth - 2 * SENTENCE_SIDE_PADDING,
    );
    this.layoutSentencePanel();
    this.livesBar.position.set(
      responsive({ sm: LAYOUT.phoneLives.x, lg: LAYOUT.lives.x }),
      responsive({ sm: LAYOUT.phoneLives.y, lg: LAYOUT.lives.y }),
    );
    if (usesPhoneKeyboard()) {
      this.keyboard.resizeToScreen(this.gameplay, width, height);
    } else {
      this.keyboard.resize(DESIGN_WIDTH, DESIGN_HEIGHT);
      const scale = this.keyboard.scale.x * KEYBOARD_SCALE;
      this.keyboard.scale.set(scale);
      this.keyboard.position.set(
        Math.round((DESIGN_WIDTH - this.keyboard.width) / 2),
        Math.round(DESIGN_HEIGHT - KEYBOARD_BOTTOM_MARGIN - this.keyboard.height),
      );
    }
    this.hud.layout = { width, height };
  }

  public update(ticker: Ticker) {
    if (this.paused || this.state === 'over') return;
    const deltaMs = frameDeltaMs(ticker);

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
      this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
    }
  }

  override destroy(options?: DestroyOptions) {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.anim?.stop();
    this.stopRaceHudAnims();
    this.clearFeedbackTimeouts();
    super.destroy(options);
  }

  private get currentTargetLetter(): string | undefined {
    if (!this.currentRound) return undefined;
    return this.currentRound.sentence[this.currentRound.correctIdx];
  }

  /** The letter after the target, which tells a phone a word-initial ئ comes from a vowel key. */
  private get nextTargetLetter(): string | undefined {
    if (!this.currentRound) return undefined;
    return this.currentRound.sentence[this.currentRound.correctIdx + 1];
  }

  private updateCountdown(deltaMs: number) {
    this.countdownElapsedMs += deltaMs;
    if (this.countdownElapsedMs < this.countdownStepMs) return;

    this.countdownElapsedMs = 0;
    this.countdownIndex += 1;

    if (this.countdownIndex >= COUNTDOWN_ARABIC.length) {
      // Leave countdown immediately so a slow beginRace can't double-fire.
      this.state = 'starting';
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
    if (this.destroyed) return;
    this.startSentenceRound(0);
  }

  /** The skier standing at the centre of the slope in `texture`, its pose undone. */
  private resetLeopard(texture: string = ASSET.leopardDefault) {
    this.leopard.texture = Texture.from(texture);
    this.leopard.x = this.leopardBaseX;
    this.leopard.y = LAYOUT.leopardY;
    this.leopard.scale.set(LAYOUT.leopardScale);
    this.leopard.rotation = 0;
    this.leopard.alpha = 1;
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
    };
    this.keyboard.setWordStart(true);
    this.approachElapsedMs = 0;
    this.progressBar.setRemaining(1);
    this.barrier.visible = true;
    this.hitFx.visible = false;
    this.resetLeopard();
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
    this.progressBar.setRemaining(remaining);
    this.applyBarrierProgress(1 - remaining);

    if (this.approachElapsedMs >= this.approachDurationMs) {
      void this.onBarrierMiss();
    }
  }

  private applyBarrierProgress(t: number) {
    const { y, scale } = barrierPose(t);
    this.barrier.y = y;
    this.barrier.scale.set(scale);
    this.barrier.x = DESIGN_WIDTH / 2;
  }

  private renderSentence() {
    if (!this.currentRound) return;
    const { sentence, correctIdx } = this.currentRound;
    this.sentenceText.text = getSentenceMarkup(sentence, correctIdx);
    this.layoutSentencePanel();
    this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
  }

  private layoutSentencePanel() {
    const bounds = this.sentenceText.getLocalBounds();
    const h = Math.max(SENTENCE_PANEL_MIN_HEIGHT, bounds.height + SENTENCE_PANEL_PAD_Y * 2);
    this.sentencePanel
      .clear()
      .rect(0, -h / 2, this.sentencePanelWidth, h)
      .fill({ color: 0xffffff });
    this.sentencePanel.position.set(this.sentencePanelX, LAYOUT.sentenceY);
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.paused || (this.state !== 'racing' && this.state !== 'tripping')) return;
    if (!this.currentRound) return;
    const typed = getTypedText(event);
    if (!typed) return;

    const { sentence, correctIdx } = this.currentRound;
    if (sentence.startsWith(typed, correctIdx)) {
      this.keyboard.flashKeyFeedback(event.code, 'success');
      useSessionStore.getState().recordCorrect();
      this.pulseSkiSway();
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
    // Out in half the sway's time, held, then back in the other half.
    this.anim = animate(this.leopard.x, swayX, {
      duration: seconds(SWAY_RETURN_MS / 2),
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
        duration: seconds(SWAY_RETURN_MS / 2),
        ease: 'easeInOut',
        onUpdate: (x) => {
          this.leopard.x = x;
        },
      });
    }, SWAY_RETURN_MS);
  }

  private onTypingMistake(code: string) {
    if (!this.currentRound) return;
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.keyboard.flashKeyFeedback(code, 'error', {
      onCleared: () =>
        this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter),
    });
    useSessionStore.getState().recordMistake();

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
    // Out in half the trip, then back in the other half.
    this.anim = animate(fromX, tripX, {
      duration: seconds(TRIP_MS / 2),
      ease: 'easeOut',
      onUpdate: (x) => {
        this.leopard.x = x;
      },
      onComplete: () => {
        this.anim = animate(tripX, this.leopardBaseX, {
          duration: seconds(TRIP_MS / 2),
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
    // Keyframe [0, 1] so Motion doesn't reuse a settled alpha=1 from the prior round
    // (which left these at the manual alpha=0 and never faded back in).
    this.raceHudAnims = targets.map((el) =>
      animate(el, { alpha: [0, 1] }, { duration: RACE_HUD_FADE_S, ease: 'easeOut' }),
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
    // The jump carries the barrier on from where it is now.
    const barrierStart = barrierPose(this.approachElapsedMs / this.approachDurationMs);
    this.anim = animate(0, 1, {
      duration: seconds(JUMP_MS),
      ease: 'easeInOut',
      onUpdate: (t) => {
        // Hang near the apex so the airborne pose reads longer.
        const arc = Math.sin(Math.PI * t);
        this.leopard.y = lerp(startY, peakY, arc);
        const scaleBoost = 1 + (JUMP_SCALE_PEAK - 1) * arc;
        this.leopard.scale.set(LAYOUT.leopardScale * scaleBoost);
        this.barrier.y = lerp(barrierStart.y, LAYOUT.barrierJump.y, t);
        this.barrier.scale.set(lerp(barrierStart.scale, LAYOUT.barrierJump.scale, t));
        this.barrier.x = DESIGN_WIDTH / 2;
      },
    });
    await this.anim.finished;

    this.barrier.visible = false;
    this.resetLeopard();
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
      duration: seconds(BARRIER_MISS_HOLD_MS),
      ease: 'easeOut',
      onUpdate: (t) => {
        const wobble = Math.sin(t * Math.PI);
        this.leopard.y = startY + MISS_DIP * wobble;
        this.leopard.rotation = CRASH_ROTATION * 0.35 * wobble;
        this.leopard.scale.set(LAYOUT.leopardScale * (1 - MISS_SQUASH * wobble));
      },
    });
    await this.anim.finished;

    this.hitFx.visible = false;
    this.resetLeopard(ASSET.leopardFailed);
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
      duration: seconds(CRASH_MS),
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
    this.resetLeopard();

    // Short ski toward the finish, then celebrate with sticks raised.
    this.anim = animate(0, 1, {
      duration: seconds(FINISH_RUN_MS),
      ease: 'easeOut',
      onUpdate: (t) => {
        this.leopard.y = lerp(LAYOUT.leopardY, LAYOUT.leopardY - FINISH_RISE, t);
        this.leopard.scale.set(LAYOUT.leopardScale * (1 - t * FINISH_SHRINK));
      },
    });
    await this.anim.finished;

    this.leopard.texture = Texture.from(ASSET.leopardFinish);
    this.leopard.scale.set(LAYOUT.leopardScale);
    await this.wait(FINISH_HOLD_MS);
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
    finishLevel(this, this.level);
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
