import { animate } from 'motion';
import { Container, Sprite, Text, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getAllKeys, getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout, type KeyboardColorOptions } from '../../../ui/keyboard-layout';
import { RoundedProgressBar } from '../../../ui/rounded-progress-bar';
import { TypingLetter } from '../../../ui/typing-letter';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getLevelType, type TLevel } from '../../level-map/units';

const ROUND_DURATION_MS = 30000;
const TARGET_COUNT = 8;
const FEEDBACK_DURATION_MS = 350;
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
} as const;

const TIMER_COLORS = {
  green: 0x7ed957,
  orange: 0xe5903a,
  red: 0xff3131,
} as const;

const TIMER_BACKGROUNDS = {
  green: 'game-levels/game-level-1/background-1.png',
  orange: 'game-levels/game-level-1/background-2.png',
  red: 'game-levels/game-level-1/background-3.png',
} as const;

type TimerColor = keyof typeof TIMER_COLORS;

const KEYBOARD_COLORS: KeyboardColorOptions = {
  PANEL_COLOR: 0x6080ab,
  PANEL_SHADOW_COLOR: 0xe9ddc8,
  KEY_COLOR: 0xf5f3ef,
  KEY_PRESSED_COLOR: 0xafafaf,
  TEXT_COLOR: 0x495669,
};

function shuffledLetters() {
  return [...getAllKeys()]
    .sort(() => Math.random() - 0.5)
    .slice(0, TARGET_COUNT)
    .map(({ text }) => text);
}

export class GameLevelOneScreen extends Container {
  public static assetBundles = ['game-level', 'game-level-1', 'ui'];

  private readonly level: TLevel;
  private readonly background = new Sprite({
    texture: Texture.from('game-levels/game-level-1/background-1.png'),
    anchor: 0.5,
  });
  private readonly gameplay = new Container();
  private readonly keyboard = new KeyboardLayout(KEYBOARD_COLORS);
  private readonly progressBar = new RoundedProgressBar({
    width: LAYOUT.progressBar.width,
    height: LAYOUT.progressBar.height,
    trackColor: 0x7ed957,
    fillColor: 0x7ed957,
    strokeWidth: 8,
    padding: 12,
  });
  private readonly prompt = new Text({
    text: 'TYPE THIS LETTER',
    resolution: 2,
    style: {
      fill: 0x6b411e,
      fontFamily: 'Concert One',
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: 2,
    },
  });
  private readonly scoreFrame = new Sprite({
    texture: Texture.from('game-levels/game-level-1/frame.png'),
  });
  private readonly score = new Text({
    text: `0/${TARGET_COUNT}`,
    resolution: 2,
    anchor: 0.5,
    style: {
      fill: 0x000000,
      fontFamily: 'Concert One',
      fontSize: 80,
      fontWeight: '700',
    },
  });
  private readonly checkMark = new Sprite({
    texture: Texture.from('game-levels/game-level-1/check-mark.png'),
    anchor: 0.5,
  });
  private readonly letters = shuffledLetters();
  private readonly hud: HUD;

  private target!: TypingLetter;
  private targetIndex = 0;
  private elapsedMs = 0;
  private feedbackTimer?: number;
  private playing = false;
  private resolving = false;
  private completed = false;
  private timerColor: TimerColor = 'green';
  private backgroundBaseScale = 1;
  private backgroundGameplayScale = BACKGROUND_ZOOM;
  private backgroundGameplayY: number = LAYOUT.backgroundCenterY;

  constructor(level: TLevel) {
    const mapUnit = findMapUnitForLevel(level);
    super();
    this.level = level;

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: getLevelType(level),
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
    });

    this.prompt.position.set(LAYOUT.prompt.x, LAYOUT.prompt.y);
    this.progressBar.position.set(LAYOUT.progressBar.x, LAYOUT.progressBar.y);
    this.scoreFrame.position.set(LAYOUT.scoreFrame.x, LAYOUT.scoreFrame.y);
    this.score.position.set(LAYOUT.score.x, LAYOUT.score.y);
    this.checkMark.position.set(LAYOUT.checkMark.x, LAYOUT.checkMark.y);
    this.checkMark.visible = false;

    this.gameplay.addChild(
      this.prompt,
      this.progressBar,
      this.scoreFrame,
      this.score,
      this.checkMark,
      this.keyboard,
    );
    this.addChild(this.background, this.gameplay, this.hud);
    this.setTargetLetter();
    this.gameplay.visible = false;
    this.progressBar.progress = 1;
  }

  public resize(width: number, height: number) {
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

    this.gameplay.scale.set(uiScale);
    this.gameplay.position.set(
      (width - DESIGN_WIDTH * uiScale) / 2,
      (height - DESIGN_HEIGHT * uiScale) / 2,
    );
    this.keyboard.resize(DESIGN_WIDTH, DESIGN_HEIGHT);
    this.hud.layout = { width, height };
  }

  public async show() {
    this.background.texture = Texture.from('game-levels/game-level-1/background-1.png');
    this.background.alpha = 1;
    this.background.position.set(engine().navigation.width / 2, engine().navigation.height / 2);
    this.background.scale.set(this.backgroundBaseScale);

    await Promise.all([
      animate(
        this.background.scale,
        { x: this.backgroundGameplayScale, y: this.backgroundGameplayScale },
        { duration: 1.1, ease: 'easeInOut' },
      ),
      animate(
        this.background,
        { y: this.backgroundGameplayY },
        { duration: 1.1, ease: 'easeInOut' },
      ),
    ]);
    this.background.texture = Texture.from(TIMER_BACKGROUNDS.green);
    this.gameplay.visible = true;
    window.addEventListener('keydown', this.handleKeyDown);
    await Promise.all([this.keyboard.playEnterAnimation(), this.target.playAppear(0)]);
    this.playing = true;
  }

  public async hide() {
    this.playing = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
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

  public reset() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.feedbackTimer) window.clearTimeout(this.feedbackTimer);
  }

  public update(ticker: Ticker) {
    if (!this.playing || this.completed) return;

    this.elapsedMs = Math.min(ROUND_DURATION_MS, this.elapsedMs + ticker.deltaMS);
    const remaining = 1 - this.elapsedMs / ROUND_DURATION_MS;
    const nextColor: TimerColor =
      remaining > 2 / 3 ? 'green' : remaining > 1 / 3 ? 'orange' : 'red';
    if (nextColor !== this.timerColor) {
      this.timerColor = nextColor;
      this.progressBar.setColors(TIMER_COLORS[nextColor]);
      this.background.texture = Texture.from(TIMER_BACKGROUNDS[nextColor]);
    }
    this.progressBar.progress = remaining;
    if (this.elapsedMs >= ROUND_DURATION_MS) this.endGame();
  }

  private setTargetLetter() {
    if (this.target) {
      this.gameplay.removeChild(this.target);
      this.target.destroy({ children: true });
    }

    this.target = new TypingLetter({
      letter: this.letters[this.targetIndex] ?? '',
      cardSize: LAYOUT.target.size,
      cornerRadius: 20,
    });
    this.target.position.set(LAYOUT.target.x, LAYOUT.target.y);
    this.gameplay.addChildAt(this.target, this.gameplay.getChildIndex(this.keyboard));
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (
      !this.playing ||
      this.completed ||
      this.resolving ||
      event.repeat ||
      event.key === 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    const typed = getMappedFromKeyboardEvent(event);
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
    this.score.text = `${this.targetIndex}/${TARGET_COUNT}`;
    this.feedbackTimer = window.setTimeout(() => {
      this.keyboard.clearKeyFeedback(code);
      if (this.targetIndex >= TARGET_COUNT) {
        this.endGame();
        return;
      }
      this.checkMark.visible = false;
      this.setTargetLetter();
      this.resolving = false;
    }, FEEDBACK_DURATION_MS);
  }

  private handleIncorrect(code: string) {
    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.keyboard.setKeyFeedback(code, 'error');
    this.target.setFeedback('error');

    this.feedbackTimer = window.setTimeout(() => {
      this.keyboard.clearKeyFeedback(code);
      this.target.setFeedback('none', false);
      this.resolving = false;
    }, FEEDBACK_DURATION_MS);
  }

  private endGame() {
    if (this.completed) return;
    this.completed = true;
    this.playing = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    useSessionStore.getState().mistakes += TARGET_COUNT - this.targetIndex;
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }
}
