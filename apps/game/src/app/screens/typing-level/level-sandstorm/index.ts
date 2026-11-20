import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { frameDeltaMs } from '../../../../engine/utils/maths';
import { randomFloat, randomInt } from '../../../../engine/utils/random';
import { responsive } from '../../../../engine/utils/viewport';
import { getTypedText } from '../../../../utils/keymap';
import { getCurrentKeyboardLetters } from '../../../../utils/script';
import useSessionStore from '../../../../zustandStores/sessionStore';
import type { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel } from '../../level-map/units';
import { DustOverlays } from './dust-overlays';
import { LeafLetter } from './leaf-letter';

/**
 * Leaf size, and the share of the screen's width leaves spawn across. Phones are 768 wide:
 * 300 leaves across half of it could never sit the separation below apart, so they stacked.
 */
const CARD_SIZE = { sm: 200, lg: 300 };
const SPAWN_WIDTH_RATIO = { sm: 0.85, lg: 0.5 };
/** Spawn positions keep this many leaf widths apart while there is room. */
const SPAWN_SEPARATION = 1.35;
const SPAWN_ATTEMPTS = 12;
/** How far above the top a leaf may start, past its own height. */
const SPAWN_HEIGHT_JITTER = 80;
const DUST_SIZE = 104;
const LEAF_ASSETS = [
  'typing-levels/typing-level-sandstorm/leaf-1.svg',
  'typing-levels/typing-level-sandstorm/leaf-2.svg',
  'typing-levels/typing-level-sandstorm/leaf-3.svg',
];
/** How a leaf drifts down: its sideways wind, sway and wobble, in px and rad per second. */
const WIND_SPEED = 20;
const SWAY_AMPLITUDE = { min: 20, max: 50 };
const SWAY_SPEED = { min: 1.25, max: 2.5 };
const GUST_FALL_SPEED = 16;
const WOBBLE_SPEED = 2.4;
const WOBBLE_ANGLE = 0.12;
/** A typed leaf lifts this far as it fades. */
const TYPED_LIFT = 48;

type FallingLetter = {
  letter: string;
  card: LeafLetter;
  spawnX: number;
  elapsedMs: number;
  fallSpeed: number;
  windSpeed: number;
  swayAmplitude: number;
  swaySpeed: number;
  phase: number;
  startRotation: number;
};

export class TypingSandstormScreen extends Container {
  public readonly screenName = 'TypingSandstormScreen';
  public static assetBundles = ['typing-level-sandstorm', 'ui'];
  public static loadingBackgroundAsset = 'typing-levels/typing-level-sandstorm/splash.png';
  public static helpAssets = ['tutorial-popups/typing-tutorial.png'];

  private background: Sprite;
  private keyboard: KeyboardLayout;
  private hud: HUD;
  private cloud: Sprite;
  private sun: Sprite;
  private dustOverlays: DustOverlays;
  private letterLayer: Container;
  private dustLayer: Container;
  private fallingLetters: FallingLetter[] = [];
  private effectAnimations: AnimationPlaybackControls[] = [];
  private viewWidth = 0;
  /** Leaf size for this screen, set in `resize`. */
  private cardSize = CARD_SIZE.lg;
  private spawnDelayMs = 0;
  private spawnedLetters = 0;
  private resolvedLetters = 0;
  private paused = true;
  private completed = false;
  private readonly level: TLevel;
  private readonly letterPool: string[];
  private readonly letterGoal: number;
  private readonly maxActiveLetters: number;
  private readonly minSpawnDelayMs: number;
  private readonly maxSpawnDelayMs: number;
  private readonly fallSpeedMin: number;
  private readonly fallSpeedMax: number;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-sandstorm');
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
    this.level = typedLevel;
    this.letterPool = [...getCurrentKeyboardLetters()];
    this.letterGoal = typedLevel.props.letterGoal;
    this.maxActiveLetters = typedLevel.props.maxActiveLetters;
    this.minSpawnDelayMs = typedLevel.props.minSpawnDelayMs;
    this.maxSpawnDelayMs = typedLevel.props.maxSpawnDelayMs;
    this.fallSpeedMin = typedLevel.props.fallSpeedMin;
    this.fallSpeedMax = typedLevel.props.fallSpeedMax;

    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level-sandstorm/background.png'),
      layout: { width: '100%', height: '100%', position: 'absolute', objectFit: 'cover' },
    });

    this.cloud = new Sprite({
      texture: Texture.from('typing-levels/typing-level-sandstorm/cloud.png'),
      layout: { width: '100%', height: '100%', position: 'absolute', objectFit: 'cover' },
    });

    this.sun = new Sprite({
      texture: Texture.from('typing-levels/typing-level-sandstorm/sun.png'),
      layout: { width: '100%', height: '100%', position: 'absolute', objectFit: 'cover' },
    });

    this.dustOverlays = new DustOverlays();
    this.letterLayer = new Container();
    this.dustLayer = new Container();

    this.hud = createLevelHud(typedLevel);

    this.keyboard = new KeyboardLayout();

    this.addChild(
      this.background,
      this.sun,
      this.cloud,
      this.dustOverlays,
      this.keyboard,
      this.hud,
      this.letterLayer,
      this.dustLayer,
    );
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.viewWidth = width;
    this.cardSize = responsive(CARD_SIZE);
    this.dustOverlays.resize(width, height);
    this.keyboard.resize(width, height);
  }

  public async pause() {
    this.paused = true;
    this.dustOverlays.pause();
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
  }

  public async resume() {
    if (this.completed) return;
    this.paused = false;
    this.dustOverlays.resume();
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
  }

  public update(ticker: Ticker) {
    if (this.paused || this.completed) return;

    const deltaMs = frameDeltaMs(ticker);
    this.dustOverlays.update(deltaMs);
    this.updateSpawning(deltaMs);
    this.updateFallingLetters(deltaMs);
  }

  public async show() {
    window.addEventListener('keydown', this.handleKeyDown);
    this.cloud.y = 300;
    this.cloud.alpha = 0;
    this.paused = false;
    this.dustOverlays.alpha = 0;

    await Promise.all([
      this.keyboard.playEnterAnimation(),
      animate(this.cloud, { y: 0 }, { duration: 1, ease: 'easeOut' }),
      animate(this.cloud, { alpha: 1 }, { duration: 1.4, ease: 'easeOut' }),
      animate(this.dustOverlays, { alpha: 1 }, { duration: 1, ease: 'easeOut' }),
    ]);
  }

  public async hide() {
    await this.pause();
    await Promise.all([
      this.keyboard.playExitAnimation(),
      animate(this.cloud, { alpha: 0 }, { duration: 0.2, ease: 'easeIn' }),
      animate(this.cloud, { y: 300 }, { duration: 0.2, ease: 'easeIn' }),
      animate(this.dustOverlays, { alpha: 0 }, { duration: 0.2, ease: 'easeIn' }),
    ]);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.cleanupLevel();
    super.destroy(options);
  }

  private updateSpawning(deltaMs: number) {
    if (
      this.spawnedLetters >= this.letterGoal ||
      this.fallingLetters.length >= this.maxActiveLetters ||
      this.viewWidth <= 0
    ) {
      return;
    }

    this.spawnDelayMs -= deltaMs;
    if (this.spawnDelayMs > 0) return;

    this.spawnLetter();
    this.spawnDelayMs = randomFloat(this.minSpawnDelayMs, this.maxSpawnDelayMs);
  }

  private updateFallingLetters(deltaMs: number) {
    for (let index = this.fallingLetters.length - 1; index >= 0; index -= 1) {
      const falling = this.fallingLetters[index];
      if (!falling) continue;

      falling.elapsedMs += deltaMs;
      const elapsedSeconds = falling.elapsedMs / 1000;
      const gust = Math.sin(elapsedSeconds * falling.swaySpeed + falling.phase);

      falling.card.x =
        falling.spawnX + falling.windSpeed * elapsedSeconds + gust * falling.swayAmplitude;
      falling.card.y += (falling.fallSpeed + gust * GUST_FALL_SPEED) * (deltaMs / 1000);
      falling.card.rotation =
        falling.startRotation +
        Math.sin(elapsedSeconds * WOBBLE_SPEED + falling.phase) * WOBBLE_ANGLE;

      if (falling.card.y + falling.card.leafBottom >= this.keyboard.y) {
        this.missLetter(index);
      }
    }
  }

  private spawnLetter() {
    const size = this.cardSize;
    const spawnWidth = this.viewWidth * responsive(SPAWN_WIDTH_RATIO);
    const spawnLeft = (this.viewWidth - spawnWidth) / 2;
    const spawnRight = spawnLeft + spawnWidth;
    const letter = this.letterPool[randomInt(0, this.letterPool.length - 1)] ?? '';
    const leafAsset = LEAF_ASSETS[randomInt(0, LEAF_ASSETS.length - 1)]!;
    const card = new LeafLetter({ letter, size, leafAsset });
    const spawnX = this.pickSpawnX(spawnLeft, Math.max(spawnLeft, spawnRight - size));

    card.alpha = 0;
    card.x = spawnX;
    card.y = -size - randomFloat(0, SPAWN_HEIGHT_JITTER);
    card.rotation = randomFloat(-0.1, 0.1);

    this.letterLayer.addChild(card);
    void card.playAppear(0);

    this.fallingLetters.push({
      letter,
      card,
      spawnX,
      elapsedMs: 0,
      fallSpeed: randomFloat(this.fallSpeedMin, this.fallSpeedMax),
      windSpeed: randomFloat(-WIND_SPEED, WIND_SPEED),
      swayAmplitude: randomFloat(SWAY_AMPLITUDE.min, SWAY_AMPLITUDE.max),
      swaySpeed: randomFloat(SWAY_SPEED.min, SWAY_SPEED.max),
      phase: randomFloat(0, Math.PI * 2),
      startRotation: card.rotation,
    });

    this.spawnedLetters += 1;
  }

  private pickSpawnX(minX: number, maxX: number) {
    const activeXs = this.fallingLetters.map((falling) => falling.card.x);
    if (activeXs.length === 0) {
      return randomFloat(minX, maxX);
    }

    // Make sure the letters don't spawn too close to each other
    const separation = this.cardSize * SPAWN_SEPARATION;
    for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt += 1) {
      const candidate = randomFloat(minX, maxX);
      const hasEnoughSpace = activeXs.every(
        (activeX) => Math.abs(activeX - candidate) >= separation,
      );
      if (hasEnoughSpace) return candidate;
    }

    const candidates = [minX, (minX + maxX) / 2, maxX];
    return candidates.reduce((best, candidate) => {
      const candidateDistance = Math.min(
        ...activeXs.map((activeX) => Math.abs(activeX - candidate)),
      );
      const bestDistance = Math.min(...activeXs.map((activeX) => Math.abs(activeX - best)));
      return candidateDistance > bestDistance ? candidate : best;
    }, candidates[0]);
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.paused || this.completed) return;
    const typedLetter = getTypedText(event);
    if (!typedLetter) return;

    const targetIndex = this.findLowestMatchingLetter(typedLetter);
    if (targetIndex >= 0) {
      this.typeLetter(targetIndex, event.code);
      return;
    }

    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.keyboard.flashKeyFeedback(event.code, 'error');
  };

  private findLowestMatchingLetter(letter: string) {
    let targetIndex = -1;
    let lowestY = -Infinity;

    this.fallingLetters.forEach((falling, index) => {
      if (falling.letter !== letter || falling.card.y <= lowestY) return;
      targetIndex = index;
      lowestY = falling.card.y;
    });

    return targetIndex;
  }

  private typeLetter(index: number, code: string) {
    const [falling] = this.fallingLetters.splice(index, 1);
    if (!falling) return;

    this.resolvedLetters += 1;
    useSessionStore.getState().recordCorrect();
    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    this.keyboard.flashKeyFeedback(code, 'success');

    falling.card.setFeedback();
    const animation = animate(
      falling.card,
      { alpha: 0, y: falling.card.y - TYPED_LIFT },
      { duration: 0.28, ease: 'easeOut' },
    );
    this.effectAnimations.push(animation);
    void animation.finished.then(() => {
      this.destroyLetterCard(falling.card);
      this.removeEffectAnimation(animation);
      this.tryEndGame();
    });
  }

  private missLetter(index: number) {
    const [falling] = this.fallingLetters.splice(index, 1);
    if (!falling) return;

    this.resolvedLetters += 1;
    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');

    const dustX = falling.card.x + this.cardSize / 2;
    const dustY = this.keyboard.y - DUST_SIZE * 0.42;
    this.destroyLetterCard(falling.card);
    this.showDustBall(dustX, dustY);
    this.tryEndGame();
  }

  private showDustBall(x: number, y: number) {
    const dust = new Sprite(Texture.from('typing-levels/typing-level-sandstorm/dust-ball.png'));
    dust.anchor.set(0.5);
    dust.width = DUST_SIZE;
    dust.height = (DUST_SIZE / dust.texture.width) * dust.texture.height;
    dust.position.set(x, y);
    dust.alpha = 0.95;
    dust.scale.set(0.75);
    this.dustLayer.addChild(dust);

    const animation = animate([
      [dust.scale, { x: 1.08, y: 1.08 }, { duration: 0.2, ease: 'backOut' }],
      [dust, { alpha: 0 }, { duration: 0.5, ease: 'easeOut', delay: 0.2 }],
    ]);
    this.effectAnimations.push(animation);
    void animation.finished.then(() => {
      this.dustLayer.removeChild(dust);
      dust.destroy();
      this.removeEffectAnimation(animation);
    });
  }

  private destroyLetterCard(card: LeafLetter) {
    card.parent?.removeChild(card);
    card.destroy({ children: true });
  }

  private tryEndGame() {
    if (
      this.completed ||
      this.resolvedLetters < this.letterGoal ||
      this.fallingLetters.length > 0
    ) {
      return;
    }

    this.completed = true;
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    finishLevel(this, this.level);
  }

  private removeEffectAnimation(animation: AnimationPlaybackControls) {
    this.effectAnimations = this.effectAnimations.filter((item) => item !== animation);
  }

  private cleanupLevel() {
    window.removeEventListener('keydown', this.handleKeyDown);

    for (const animation of this.effectAnimations) {
      animation.stop();
    }
    this.effectAnimations = [];

    this.fallingLetters = [];

    this.letterLayer.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.dustLayer.removeChildren().forEach((child) => child.destroy({ children: true }));
  }
}
