import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { frameDeltaMs } from '../../../../engine/utils/maths';
import { randomFloat, randomShuffle } from '../../../../engine/utils/random';
import { responsive } from '../../../../engine/utils/viewport';
import { getTypedText } from '../../../../utils/keymap';
import { convertKeyboardLettersToCurrentScript } from '../../../../utils/script';
import useSessionStore from '../../../../zustandStores/sessionStore';
import type { HUD } from '../../../ui/hud';
import { KeyboardLayout, type KeyboardColorOptions } from '../../../ui/keyboard-layout';
import { createLevelHud, finishLevel } from '../../level-flow';
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

/** Space between the basket and the keyboard on phones. */
const PHONE_BASKET_GAP = 90;
const SPAWN_X_PADDING = 100;
/** Basket rest height on wide screens, as a share of the screen. */
const WIDE_BASKET_Y = 0.45;
const BASKET_SCALE = 0.75;

export class GameLevelFruitScreen extends Container {
  public readonly screenName = 'GameLevelFruitScreen';
  public static assetBundles = ['game-level-fruit-fall', 'ui'];
  public static loadingBackgroundAsset = 'game-levels/game-level-fruit-fall/background.png';
  public static helpAssets: string[] = [];

  /** False while paused behind a popup or once the level is over. */
  private running = true;
  private completed = false;
  /** Caught fruit still flying into the basket; the level waits for them to land. */
  private landingFruits = 0;
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
  /** The background is cropped to cover the screen, so its own size can exceed it. */
  private screenWidth = 0;
  private screenHeight = 0;

  constructor(level: TLevel) {
    super();
    this.background = new Sprite({
      texture: Texture.from('game-levels/game-level-fruit-fall/background.png'),
      // Cover rather than stretch, so the landscape art keeps its shape on tall phones.
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    const typedLevel = getTypedLevel(level, 'game-fruit-fall');
    this.level = typedLevel;
    const props = typedLevel.props;
    this.maxActiveFruits = props.maxActiveFruits;
    this.minSpawnDelayMs = props.minSpawnDelayMs;
    this.maxSpawnDelayMs = props.maxSpawnDelayMs;
    this.fallVelocity = props.fallVelocity;
    this.totalFruits = props.totalFruits;

    // `totalFruits` of 0 plays every letter once; otherwise a random handful of them.
    const letters = randomShuffle(convertKeyboardLettersToCurrentScript(props.letters));
    const picked = this.totalFruits === 0 ? letters : letters.slice(0, this.totalFruits);
    this.allFruits = picked.map((letter) => new Fruit({ letter }));
    this.fallingFruits = [];
    this.keyboardLayout = new KeyboardLayout({ colors: GREEN_KB_COLOR_OPTIONS });
    this.spawnTimer = 0; // spawnTimer at 0 indicates new fruit should be spawned.
    this.basket = new Sprite({
      texture: Texture.from('game-levels/game-level-fruit-fall/basket.png'),
    });
    this.basket.anchor.set(0.5);
    this.basket.scale.set(BASKET_SCALE);
    this.hud = createLevelHud(typedLevel);

    this.addChild(this.background, this.keyboardLayout, this.basket, this.hud);
  }
  resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.background.layout = { width, height };
    this.keyboardLayout.resize(width, height);
    this.hud.layout = { width, height };
    // center the basket horizontally, sitting above the keyboard. Phones have room to spare
    // above their keyboard, so they rest it just on top, the way desktop screens show it.
    const basketY = responsive({
      sm: this.keyboardLayout.y - PHONE_BASKET_GAP - this.basket.height / 2,
      lg: height * WIDE_BASKET_Y,
    });
    this.basket.position.set(width / 2, basketY);
  }
  async pause() {
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboardLayout.pause();
  }
  async resume() {
    if (this.completed) return;
    this.running = true;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboardLayout.resume();
  }
  async show() {
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboardLayout.playEnterAnimation();
  }
  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.basketAnimation?.stop();
    // Fruit still waiting to fall is not on stage, so the tree does not destroy it.
    for (const fruit of this.allFruits) fruit.destroy({ children: true });
    super.destroy(options);
  }
  update(ticker: Ticker) {
    if (!this.running) return;
    const deltaMs = frameDeltaMs(ticker);
    this.updateFalling(deltaMs);
    this.updateSpawning(deltaMs);
    this.maybeEndGame();
  }

  private updateSpawning(deltaMs: number) {
    if (this.allFruits.length === 0) return;
    if (this.fallingFruits.length >= this.maxActiveFruits) return;
    this.spawnTimer -= deltaMs;
    if (this.spawnTimer > 0) {
      return;
    }
    this.spawnFruit();
    this.spawnTimer = randomFloat(this.minSpawnDelayMs, this.maxSpawnDelayMs);
  }
  private spawnFruit() {
    const nextFruit = this.allFruits.pop();
    if (!nextFruit) return;
    nextFruit.position.set(randomFloat(SPAWN_X_PADDING, this.screenWidth - SPAWN_X_PADDING), 0);
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
    if (!this.running) return;
    const typed = getTypedText(event);
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
    this.keyboardLayout.flashKeyFeedback(code, 'error');
  }

  private async collectFruit(index: number, code: string) {
    const fruit = this.fallingFruits[index];
    // remove from the falling set immediately so it stops falling and can't be re-matched
    this.fallingFruits.splice(index, 1);

    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    this.keyboardLayout.flashKeyFeedback(code, 'success');
    fruit.markCorrect();
    this.landingFruits += 1;

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

    if (this.destroyed) return;
    this.landingFruits -= 1;
    fruit.destroy({ children: true });
  }

  private updateFalling(deltaMs: number) {
    const bottom = this.screenHeight;
    const basketY = this.basket.position.y;
    for (let i = this.fallingFruits.length - 1; i >= 0; i--) {
      const f = this.fallingFruits[i];
      f.position.y += deltaMs * this.fallVelocity;
      if (f.isPlayable && f.position.y > basketY) f.isPlayable = false;
      if (f.position.y - f.height > bottom) {
        // fell past the basket without being caught
        useSessionStore.getState().recordMistake();
        this.fallingFruits.splice(i, 1);
        f.destroy({ children: true });
      }
    }
  }

  private maybeEndGame() {
    if (this.completed) return;
    const done = this.allFruits.length === 0 && this.fallingFruits.length === 0;
    if (done && this.landingFruits === 0) {
      this.endGame();
    }
  }

  private endGame() {
    if (this.completed) return;
    this.completed = true;
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    finishLevel(this, this.level);
  }
}
