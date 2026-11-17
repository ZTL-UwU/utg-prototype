import { Container, Sprite, Text, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { frameDeltaMs } from '../../../../engine/utils/maths';
import { randomShuffle } from '../../../../engine/utils/random';
import { isPhone, responsive } from '../../../../engine/utils/viewport';
import { m } from '../../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';
import { getTypedText } from '../../../../utils/keymap';
import { convertKeyboardLettersToCurrentScript } from '../../../../utils/script';
import useSessionStore from '../../../../zustandStores/sessionStore';
import type { HUD } from '../../../ui/hud';
import { BLUE_KEYBOARD_COLORS, KEY_FEEDBACK_MS, KeyboardLayout } from '../../../ui/keyboard-layout';
import { TimerBar, timerBand, type TimerBand } from '../../../ui/timer-bar';
import { TypingLetter } from '../../../ui/typing-letter';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel } from '../../level-map/units';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const BACKGROUND_ZOOM = 1.5;
const BACKGROUND_COVER_MARGIN = 2;

const LAYOUT = {
  backgroundCenterY: 200,
  prompt: { x: 200, y: 70 },
  progressBar: { x: 580, y: 40, width: 780, height: 100 },
  target: { x: 250, y: 125, size: 190 },
  scoreFrame: { x: 1430, y: 0 },
  score: { x: 1640, y: 170 },
  checkMark: { x: 1760, y: 170 },
};

/** Phones zoom in and stack the HUD along the top of a narrower stage. */
const PHONE_STAGE = { width: 1024, top: 170 };
const PHONE_LAYOUT: typeof LAYOUT = {
  ...LAYOUT,
  prompt: { x: 40, y: 110 },
  progressBar: { x: 122, y: 0, width: 780, height: 100 },
  target: { x: 90, y: 165, size: 190 },
  scoreFrame: { x: 610, y: 120 },
  score: { x: 820, y: 290 },
  checkMark: { x: 940, y: 290 },
};

/** The oven heats up as time runs out. */
const TIMER_BACKGROUNDS: Record<TimerBand, string> = {
  green: 'game-levels/game-level-tandoor-rush/background-1.png',
  orange: 'game-levels/game-level-tandoor-rush/background-2.png',
  red: 'game-levels/game-level-tandoor-rush/background-3.png',
};

export class GameTandoorRushScreen extends Container {
  public readonly screenName = 'GameTandoorRushScreen';
  public static assetBundles = ['game-level-tandoor-rush', 'ui'];
  public static loadingBackgroundAsset = 'game-levels/game-level-tandoor-rush/background-1.png';
  public static helpAssets = [
    'tutorial-popups/game-level-tandoor-rush-1.png',
    'tutorial-popups/game-level-tandoor-rush-2.png',
  ];

  private readonly level: TLevel;
  private readonly background = new Sprite({
    texture: Texture.from('game-levels/game-level-tandoor-rush/background-1.png'),
    anchor: 0.5,
  });
  private readonly gameplay = new Container();
  private readonly keyboard = new KeyboardLayout({ colors: BLUE_KEYBOARD_COLORS });
  private readonly progressBar = new TimerBar({
    width: LAYOUT.progressBar.width,
    height: LAYOUT.progressBar.height,
    strokeWidth: 8,
    padding: 12,
  });
  private readonly prompt = new Text({
    text: m.tandoor_type_this_letter(),
    resolution: 2,
    style: {
      fill: 0x6b411e,
      fontFamily: DISPLAY_FONT_FAMILY,
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: 2,
    },
  });
  private readonly scoreFrame = new Sprite({
    texture: Texture.from('game-levels/game-level-tandoor-rush/frame.png'),
  });
  private readonly score = new Text({
    text: '0/0',
    resolution: 2,
    anchor: 0.5,
    style: {
      fill: 0x000000,
      fontFamily: DISPLAY_FONT_FAMILY,
      fontSize: 80,
      fontWeight: '700',
    },
  });
  private readonly checkMark = new Sprite({
    texture: Texture.from('game-levels/game-level-tandoor-rush/check-mark.png'),
    anchor: 0.5,
  });
  private readonly letters: string[];
  private readonly targetCount: number;
  private readonly roundDurationMs: number;
  private readonly hud: HUD;

  private target: TypingLetter;
  private targetIndex = 0;
  private elapsedMs = 0;
  private feedbackTimer?: ReturnType<typeof setTimeout>;
  private playing = false;
  private resolving = false;
  private completed = false;
  private timerBand: TimerBand = 'green';
  private backgroundBaseScale = 1;
  private backgroundGameplayScale = BACKGROUND_ZOOM;
  private backgroundGameplayY: number = LAYOUT.backgroundCenterY;
  /** The stage's layout for this screen size, picked in `resize`. */
  private stageLayout = LAYOUT;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'game-tandoor-rush');
    super();
    this.level = typedLevel;
    this.roundDurationMs = typedLevel.props.roundDurationMs;
    // Each target is a different letter, so there can be no more targets than letters.
    const letters = convertKeyboardLettersToCurrentScript(typedLevel.props.letters);
    this.targetCount = Math.min(typedLevel.props.targetCount, letters.length);
    this.letters = randomShuffle(letters).slice(0, this.targetCount);
    this.score.text = `0/${this.targetCount}`;

    this.hud = createLevelHud(typedLevel);
    this.checkMark.visible = false;

    this.gameplay.addChild(
      this.prompt,
      this.progressBar,
      this.scoreFrame,
      this.score,
      this.checkMark,
      this.keyboard,
    );
    this.target = this.createTarget();
    this.addChild(this.background, this.gameplay, this.hud);
    this.gameplay.visible = false;
  }

  public resize(width: number, height: number) {
    const stage = responsive({ sm: PHONE_LAYOUT, lg: LAYOUT });
    this.stageLayout = stage;
    this.prompt.position.set(stage.prompt.x, stage.prompt.y);
    this.progressBar.position.set(stage.progressBar.x, stage.progressBar.y);
    this.scoreFrame.position.set(stage.scoreFrame.x, stage.scoreFrame.y);
    this.score.position.set(stage.score.x, stage.score.y);
    this.checkMark.position.set(stage.checkMark.x, stage.checkMark.y);
    this.target.position.set(stage.target.x, stage.target.y);

    const uiScale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    this.backgroundBaseScale = Math.max(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    const uiTop = (height - DESIGN_HEIGHT * uiScale) / 2;
    this.backgroundGameplayY = uiTop + LAYOUT.backgroundCenterY * uiScale;
    const minimumScaleForBottomEdge =
      (2 * (height - this.backgroundGameplayY + BACKGROUND_COVER_MARGIN)) / DESIGN_HEIGHT;
    this.backgroundGameplayScale = Math.max(
      this.backgroundBaseScale * BACKGROUND_ZOOM,
      minimumScaleForBottomEdge,
    );
    this.background.position.set(
      width / 2,
      this.gameplay.visible ? this.backgroundGameplayY : height / 2,
    );
    this.background.scale.set(
      this.gameplay.visible ? this.backgroundGameplayScale : this.backgroundBaseScale,
    );

    const stageScale = responsive({ sm: width / PHONE_STAGE.width, lg: uiScale });
    this.gameplay.scale.set(stageScale);
    this.gameplay.position.set(
      responsive({ sm: 0, lg: (width - DESIGN_WIDTH * uiScale) / 2 }),
      responsive({ sm: PHONE_STAGE.top, lg: uiTop }),
    );
    if (isPhone()) this.keyboard.resizeToScreen(this.gameplay, width, height);
    else this.keyboard.resize(DESIGN_WIDTH, DESIGN_HEIGHT);
    this.hud.layout = { width, height };
  }

  public async show() {
    // A level with no letters has nothing to type.
    if (this.targetCount === 0) {
      this.completed = true;
      finishLevel(this, this.level);
      return;
    }
    this.background.texture = Texture.from(TIMER_BACKGROUNDS.green);
    // Gameplay zooms the background in on the oven; resize applies it once gameplay shows.
    this.gameplay.visible = true;
    this.resize(engine().navigation.width, engine().navigation.height);
    window.addEventListener('keydown', this.handleKeyDown);
    await Promise.all([this.keyboard.playEnterAnimation(), this.target.playAppear(0)]);
    this.playing = true;
  }

  public async hide() {
    await this.pause();
    await this.keyboard.playExitAnimation();
  }

  public async pause() {
    this.playing = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
  }

  public async resume() {
    if (this.completed) return;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    this.playing = true;
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    clearTimeout(this.feedbackTimer);
    super.destroy(options);
  }

  public update(ticker: Ticker) {
    if (!this.playing || this.completed) return;

    this.elapsedMs = Math.min(this.roundDurationMs, this.elapsedMs + frameDeltaMs(ticker));
    const remaining = 1 - this.elapsedMs / this.roundDurationMs;
    this.progressBar.setRemaining(remaining);
    const band = timerBand(remaining);
    if (band !== this.timerBand) {
      this.timerBand = band;
      this.background.texture = Texture.from(TIMER_BACKGROUNDS[band]);
    }
    if (this.elapsedMs >= this.roundDurationMs) this.endGame();
  }

  /** The card for the current target letter, just under the keyboard. */
  private createTarget() {
    const target = new TypingLetter({
      letter: this.letters[this.targetIndex] ?? '',
      cardSize: this.stageLayout.target.size,
      cornerRadius: 20,
    });
    target.position.set(this.stageLayout.target.x, this.stageLayout.target.y);
    this.gameplay.addChildAt(target, this.gameplay.getChildIndex(this.keyboard));
    return target;
  }

  private setTargetLetter() {
    this.target.destroy({ children: true });
    this.target = this.createTarget();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.playing || this.completed || this.resolving) return;
    const typed = getTypedText(event);
    if (!typed) return;

    this.resolving = true;
    if (typed === this.letters[this.targetIndex]) {
      this.handleCorrect(event.code);
    } else {
      this.handleIncorrect(event.code);
    }
  };

  private handleCorrect(code: string) {
    useSessionStore.getState().recordCorrect();
    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    this.keyboard.setKeyFeedback(code, 'success');
    this.target.setFeedback('success');
    this.checkMark.visible = true;
    this.targetIndex += 1;
    this.score.text = `${this.targetIndex}/${this.targetCount}`;
    this.feedbackTimer = setTimeout(() => {
      this.keyboard.clearKeyFeedback(code);
      if (this.targetIndex >= this.targetCount) {
        this.endGame();
        return;
      }
      this.checkMark.visible = false;
      this.setTargetLetter();
      this.resolving = false;
    }, KEY_FEEDBACK_MS);
  }

  private handleIncorrect(code: string) {
    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.keyboard.setKeyFeedback(code, 'error');
    this.target.setFeedback('error');

    this.feedbackTimer = setTimeout(() => {
      this.keyboard.clearKeyFeedback(code);
      this.target.setFeedback('none', false);
      this.resolving = false;
    }, KEY_FEEDBACK_MS);
  }

  private endGame() {
    if (this.completed) return;
    this.completed = true;
    this.playing = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    // Targets never reached count as missed.
    useSessionStore.getState().recordMistakes(this.targetCount - this.targetIndex);
    finishLevel(this, this.level);
  }
}
