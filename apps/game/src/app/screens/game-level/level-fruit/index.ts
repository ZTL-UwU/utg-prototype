import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout, type KeyboardColorOptions } from '../../../ui/keyboard-layout';
import { getTypedLevel, type TLevel } from '../../level-map/units';
import { Fruit } from './fruit';
const GREEN_KB_COLOR_OPTIONS: KeyboardColorOptions = {
  PANEL_COLOR: 0xf3fadc,
  PANEL_SHADOW_COLOR: 0x000000,
  KEY_COLOR: 0x7a9600,
  KEY_PRESSED_COLOR: 0x4b6533,
  TEXT_COLOR: 0xffffff,
  SHIFT_HINT_COLOR: 0xffde59,
};

const SPAWN_X_PADDING = 100;
const FEEDBACK_DURATION_MS: number = 350;

export class GameLevelFruitScreen extends Container {
  public static assetBundles = ['game-level-fruit', 'ui'];
  public static splashBackgroundAsset = 'game-levels/game-level-fruit/background.png';
  public static helpAssets: string[] = [];

  private isFalling = true;
  private completed = false;
  private readonly level: TLevel;
  private readonly maxActiveFruits: number;
  private readonly minSpawnDelayMs: number;
  private readonly maxSpawnDelayMs: number;
  private readonly fallVelocity: number;
  private background: Sprite;
  private basket: Sprite;
  private spawnTimer: number;
  private allFruits: Fruit[];
  private fallingFruits: Fruit[];
  private keyboardLayout: KeyboardLayout;
  private hud: HUD;
  private basketAnimation?: AnimationPlaybackControls;
  private totalFruits: number;

  constructor(level: TLevel) {
    super();
    this.background = new Sprite({
      texture: Texture.from('game-levels/game-level-fruit/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });
    const typedLevel = getTypedLevel(level, 'game-fruit-fall');
    this.level = typedLevel;
    const props = typedLevel.props;
    this.maxActiveFruits = props.maxActiveFruits;
    this.minSpawnDelayMs = props.minSpawnDelayMs;
    this.maxSpawnDelayMs = props.maxSpawnDelayMs;
    this.fallVelocity = props.fallVelocity;
    this.totalFruits = props.totalFruits;

    const bufferFruits = props.letters.map((letter: string) => {
      return new Fruit({ letter });
    });
    bufferFruits.sort(() => Math.random() - 0.5);

    // build all fruits from the level's letters
    this.allFruits =
      this.totalFruits === 0 ? bufferFruits : bufferFruits.splice(0, this.totalFruits);
    this.fallingFruits = [];
    this.keyboardLayout = new KeyboardLayout(GREEN_KB_COLOR_OPTIONS);
    this.spawnTimer = 0; // spawnTimer at 0 indicates new fruit should be spawned.
    this.basket = new Sprite({ texture: Texture.from('game-levels/game-level-fruit/basket.png') });
    this.basket.anchor.set(0.5);
    this.basket.scale.set(0.75);
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: 'game',
          onQuit: () => this.goHome(),
        }),
    });

    this.addChild(this.background, this.keyboardLayout, this.basket, this.hud);
  }
  resize(width: number, height: number) {
    this.background.layout = { width, height };
    this.keyboardLayout.resize(width, height);
    this.hud.layout = { width, height };
    // center the basket horizontally, sitting above the keyboard
    this.basket.position.set(width / 2, height * 0.45);
  }
  async pause() {
    this.isFalling = false;
    window.removeEventListener('keydown', this.handleKeyDown);
  }
  async resume() {
    if (this.completed) return;
    this.isFalling = true;
    window.addEventListener('keydown', this.handleKeyDown);
  }
  async show() {
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboardLayout.playEnterAnimation();
  }
  reset() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.basketAnimation?.stop();
  }
  update(ticker: Ticker) {
    if (!this.isFalling) return;
    this.updateFalling(ticker.deltaMS);
    this.updateSpawning(ticker.deltaMS);
    this.maybeEndGame();
  }

  updateSpawning(deltaMs: number) {
    if (this.allFruits.length === 0 || !this.isFalling) return;
    if (this.fallingFruits.length >= this.maxActiveFruits) return;
    this.spawnTimer -= deltaMs;
    if (this.spawnTimer > 0) {
      return;
    }
    this.spawnFruit();
    this.spawnTimer = randomBetween(this.minSpawnDelayMs, this.maxSpawnDelayMs);
  }
  private spawnFruit() {
    const nextFruit = this.allFruits.pop();
    if (!nextFruit) return;
    nextFruit.position.set(
      randomBetween(SPAWN_X_PADDING, this.background.width - SPAWN_X_PADDING),
      0,
    );
    // keep fruits below the HUD so the back button stays clickable
    this.addChildAt(nextFruit, this.getChildIndex(this.hud));
    this.fallingFruits.push(nextFruit);
  }

  private findLowestMatchingFruitIdx(letter: string): number | null {
    for (let i = 0; i < this.fallingFruits.length; i++) {
      // checking from idx 0 -> len - 1 automatically finds the lowest fruit because of how they're added
      if (this.fallingFruits[i].isPlayable && this.fallingFruits[i].letter === letter) return i;
    }
    return null;
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (
      !this.isFalling ||
      event.repeat ||
      event.key === 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;

    const typed = getMappedFromKeyboardEvent(event);
    if (!typed) return;

    const idx = this.findLowestMatchingFruitIdx(typed);
    if (idx === null) {
      this.handleIncorrect(event.code);
      return;
    }

    void this.collectFruit(idx, event.code);
  };

  private handleIncorrect(code: string) {
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    useSessionStore.getState().recordMistake();
    this.keyboardLayout.setKeyFeedback(code, 'error');
    window.setTimeout(() => this.keyboardLayout.clearKeyFeedback(code), FEEDBACK_DURATION_MS);
  }

  private async collectFruit(index: number, code: string) {
    const fruit = this.fallingFruits[index];
    // remove from the falling set immediately so it stops falling and can't be re-matched
    this.fallingFruits.splice(index, 1);

    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    this.keyboardLayout.setKeyFeedback(code, 'success');
    fruit.markCorrect();

    const targetX = fruit.position.x;

    // slide the basket horizontally to sit under the fruit
    this.basketAnimation?.stop();
    this.basketAnimation = animate(this.basket, { x: targetX }, { duration: 0.3, ease: 'backOut' });

    // pop the fruit into the basket
    await Promise.all([
      animate(fruit, { x: targetX, y: this.basket.position.y }, { duration: 0.35, ease: 'backIn' }),
      animate(
        fruit.scale,
        { x: [1, 1.25, 0], y: [1, 1.25, 0] },
        { duration: 0.35, ease: 'easeIn' },
      ),
    ]);

    this.keyboardLayout.clearKeyFeedback(code);
    this.removeChild(fruit);
    fruit.destroy({ children: true });
  }

  updateFalling(deltaMs: number) {
    const bottom = this.background.height;
    const basketY = this.basket.position.y;
    for (let i = this.fallingFruits.length - 1; i >= 0; i--) {
      const f = this.fallingFruits[i];
      f.position.y += deltaMs * this.fallVelocity;
      if (f.isPlayable && f.position.y > basketY) f.isPlayable = false;
      if (f.position.y - f.height > bottom) {
        // fell past the basket without being caught
        useSessionStore.getState().recordMistake();
        this.removeChild(f);
        this.fallingFruits.splice(i, 1);
      }
    }
  }

  private maybeEndGame() {
    if (this.completed) return;
    if (this.allFruits.length === 0 && this.fallingFruits.length === 0) {
      this.endGame();
    }
  }

  private endGame() {
    if (this.completed) return;
    this.completed = true;
    this.isFalling = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }

  private goHome() {
    void import('../../home').then(({ HomeScreen }) => engine().navigation.showScreen(HomeScreen));
  }
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
