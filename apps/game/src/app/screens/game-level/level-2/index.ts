import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { LevelMapScreen } from '../../level-map';
import {
  findMapUnitForLevel,
  getLevelType,
  getTypedLevel,
  type TLevel,
} from '../../level-map/units';
import { LivesBar } from './lives-bar';
import { NaanPiece } from './naan-piece';
import { PlateStack } from './plate-stack';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const FEEDBACK_DURATION_MS = 350;
const NAAN_WIDTH = 220;

const LAYOUT = {
  leftPlate: { x: 390, y: 535 },
  rightPlate: { x: 880, y: 535 },
  naanFlightY: 400,
  lives: { x: 1680, y: 90 },
} as const;

type MovingNaan = {
  letter: string;
  piece: NaanPiece;
  speed: number;
  resolving: boolean;
};

export class GameNaanStackScreen extends Container {
  public static assetBundles = ['game-level-2', 'ui'];
  public static splashBackgroundAsset = 'game-levels/game-level-2/background.png';
  public static helpAssets: string[] = ['tutorial-popups/game-level-2.png'];

  private readonly level: TLevel;
  private readonly letterPool: string[];
  private readonly plateCapacity: number;
  private readonly spawnIntervalMs: number;
  private readonly moveSpeed: number;

  private readonly background = new Sprite({
    texture: Texture.from('game-levels/game-level-2/background.png'),
    anchor: 0.5,
  });
  private readonly gameplay = new Container();
  private readonly naanLayer = new Container();
  private readonly keyboard = new KeyboardLayout();
  private readonly hud: HUD;
  private readonly livesBar: LivesBar;
  private readonly leftPlate: PlateStack;
  private readonly rightPlate: PlateStack;
  private readonly plates: PlateStack[];

  private movingNaan: MovingNaan[] = [];
  private effectAnimations: AnimationPlaybackControls[] = [];
  private feedbackTimeouts: number[] = [];
  private spawnDelayMs = 0;
  private paused = true;
  private completed = false;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'game-naan-stack');
    const mapUnit = findMapUnitForLevel(typedLevel);
    super();
    this.level = typedLevel;
    this.letterPool = typedLevel.props.letters;
    this.plateCapacity = typedLevel.props.plateCapacity;
    this.spawnIntervalMs = typedLevel.props.spawnDelayMs;
    this.moveSpeed = typedLevel.props.moveSpeed;

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: getLevelType(typedLevel),
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
    });

    this.livesBar = new LivesBar(typedLevel.props.maxLives);
    this.livesBar.position.set(LAYOUT.lives.x, LAYOUT.lives.y);

    this.leftPlate = new PlateStack({
      texture: 'game-levels/game-level-2/plate-blue.png',
      capacity: this.plateCapacity,
    });
    this.leftPlate.position.set(LAYOUT.leftPlate.x, LAYOUT.leftPlate.y);

    this.rightPlate = new PlateStack({
      texture: 'game-levels/game-level-2/plate-red.png',
      capacity: this.plateCapacity,
    });
    this.rightPlate.position.set(LAYOUT.rightPlate.x, LAYOUT.rightPlate.y);
    this.plates = [this.leftPlate, this.rightPlate];

    this.gameplay.addChild(
      this.leftPlate,
      this.rightPlate,
      this.naanLayer,
      this.livesBar,
      this.keyboard,
    );
    this.addChild(this.background, this.gameplay, this.hud);
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
    this.keyboard.resize(DESIGN_WIDTH, DESIGN_HEIGHT);
    this.hud.layout = { width, height };
  }

  public async show() {
    window.addEventListener('keydown', this.handleKeyDown);
    this.paused = false;
    await this.keyboard.playEnterAnimation();
  }

  public async hide() {
    await this.pause();
    await this.keyboard.playExitAnimation();
  }

  public async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
  }

  public async resume() {
    if (this.completed) return;
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
  }

  public reset() {
    this.cleanupLevel();
  }

  public update(ticker: Ticker) {
    if (this.paused || this.completed) return;

    const deltaMs = Math.min(ticker.deltaMS, 50);
    this.updateSpawning(deltaMs);
    this.updateMovingNaan(deltaMs);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.cleanupLevel();
    super.destroy(options);
  }

  private updateSpawning(deltaMs: number) {
    if (this.completed || this.plates.every((plate) => plate.isFull)) return;

    this.spawnDelayMs -= deltaMs;
    if (this.spawnDelayMs > 0) return;

    this.spawnNaan();
    this.spawnDelayMs = this.spawnIntervalMs;
  }

  private updateMovingNaan(deltaMs: number) {
    for (let index = this.movingNaan.length - 1; index >= 0; index -= 1) {
      const moving = this.movingNaan[index];
      if (!moving || moving.resolving) continue;

      moving.piece.x -= moving.speed * (deltaMs / 1000);

      if (moving.piece.x + moving.piece.halfWidth < 0) {
        this.missNaan(index);
      }
    }
  }

  private spawnNaan() {
    const letter = this.letterPool[Math.floor(Math.random() * this.letterPool.length)] ?? '';
    const piece = new NaanPiece({ letter, width: NAAN_WIDTH });
    piece.position.set(DESIGN_WIDTH + piece.halfWidth, LAYOUT.naanFlightY);
    piece.alpha = 0;

    this.naanLayer.addChild(piece);
    void piece.playAppear();

    this.movingNaan.push({
      letter,
      piece,
      speed: this.moveSpeed,
      resolving: false,
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (
      this.paused ||
      this.completed ||
      event.repeat ||
      event.key === 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    const typedLetter = getMappedFromKeyboardEvent(event);
    if (!typedLetter) return;

    const targetIndex = this.findStackableNaan(typedLetter);
    if (targetIndex >= 0) {
      void this.stackNaan(targetIndex, event.code);
      return;
    }

    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.keyboard.setKeyFeedback(event.code, 'error');
    this.feedbackTimeouts.push(
      window.setTimeout(() => this.keyboard.clearKeyFeedback(event.code), FEEDBACK_DURATION_MS),
    );
  };

  private findStackableNaan(letter: string) {
    let bestIndex = -1;
    let bestDistance = Infinity;

    this.movingNaan.forEach((moving, index) => {
      if (moving.resolving || moving.letter !== letter) return;

      const plate = this.findPlateInRange(moving.piece.x);
      if (!plate) return;

      const distance = Math.abs(moving.piece.x - plate.x);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  private findPlateInRange(naanX: number) {
    let best: PlateStack | undefined;
    let bestDistance = Infinity;

    for (const plate of this.plates) {
      if (plate.isFull) continue;
      const distance = Math.abs(naanX - plate.x);
      if (distance <= plate.hitHalfWidth && distance < bestDistance) {
        best = plate;
        bestDistance = distance;
      }
    }

    return best;
  }

  private async stackNaan(index: number, code: string) {
    const moving = this.movingNaan[index];
    if (!moving || moving.resolving) return;

    const plate = this.findPlateInRange(moving.piece.x);
    if (!plate) return;

    moving.resolving = true;
    useSessionStore.getState().recordCorrect();
    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    this.keyboard.setKeyFeedback(code, 'success');
    this.feedbackTimeouts.push(
      window.setTimeout(() => this.keyboard.clearKeyFeedback(code), FEEDBACK_DURATION_MS),
    );
    moving.piece.setFeedback('success');

    this.movingNaan.splice(index, 1);

    const targetX = plate.x;
    const targetY = plate.y + plate.nextStackLocalY();
    const animation = animate(
      moving.piece,
      { x: targetX, y: targetY, rotation: 0 },
      { duration: 0.28, ease: 'easeOut' },
    );
    this.effectAnimations.push(animation);

    try {
      await animation.finished;
      this.removeEffectAnimation(animation);
      moving.piece.parent?.removeChild(moving.piece);

      let targetPlate = plate.isFull
        ? (this.plates.find((candidate) => !candidate.isFull) ?? plate)
        : plate;

      if (targetPlate !== plate && !targetPlate.isFull) {
        moving.piece.position.set(targetPlate.x, targetPlate.y + targetPlate.nextStackLocalY());
      }

      const accepted = !targetPlate.isFull && (await targetPlate.acceptNaan(moving.piece));
      if (!accepted) {
        this.destroyNaan(moving.piece);
      }
    } catch {
      // Animation interrupted during cleanup.
    }

    this.tryEndGame();
  }

  private missNaan(index: number) {
    const [moving] = this.movingNaan.splice(index, 1);
    if (!moving) return;

    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.destroyNaan(moving.piece);

    const livesLeft = this.livesBar.loseLife();
    if (livesLeft <= 0) {
      this.endGame();
      return;
    }

    this.tryEndGame();
  }

  private tryEndGame() {
    if (this.completed) return;
    if (!this.plates.every((plate) => plate.isFull)) return;
    if (this.movingNaan.some((moving) => moving.resolving)) return;
    this.endGame();
  }

  private endGame() {
    if (this.completed) return;
    this.completed = true;
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }

  private destroyNaan(piece: NaanPiece) {
    piece.parent?.removeChild(piece);
    piece.destroy({ children: true });
  }

  private removeEffectAnimation(animation: AnimationPlaybackControls) {
    this.effectAnimations = this.effectAnimations.filter((item) => item !== animation);
  }

  private cleanupLevel() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.clearFeedbackTimers();

    for (const animation of this.effectAnimations) {
      animation.stop();
    }
    this.effectAnimations = [];

    this.movingNaan = [];
    this.naanLayer.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.leftPlate.destroyEffects();
    this.rightPlate.destroyEffects();
    this.leftPlate.clearStack();
    this.rightPlate.clearStack();
  }

  private clearFeedbackTimers() {
    for (const timeout of this.feedbackTimeouts) {
      window.clearTimeout(timeout);
    }
    this.feedbackTimeouts = [];
  }
}
