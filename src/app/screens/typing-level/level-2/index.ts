import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getAllKeys, getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { TutorialPopup } from '../../../popups/tutorial';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { LevelMapScreen } from '../../level-map';
import type { TMapUnit } from '../../level-map/units';
import { Letter } from '../level-1/letter';

const CARD_SIZE = 118;
const LETTER_GOAL = 18;
const MAX_ACTIVE_LETTERS = 3;
const FIRST_SPAWN_DELAY_MS = 200;
const MIN_SPAWN_DELAY_MS = 1400;
const MAX_SPAWN_DELAY_MS = 2200;
const SPAWN_WIDTH_RATIO = 0.5;
const MIN_SPAWN_SEPARATION = CARD_SIZE * 1.35;
const DUST_SIZE = 104;

type FallingLetter = {
  letter: string;
  card: Letter;
  spawnX: number;
  elapsedMs: number;
  fallSpeed: number;
  windSpeed: number;
  swayAmplitude: number;
  swaySpeed: number;
  phase: number;
  startRotation: number;
};

function makeRandomLetter() {
  const entries = getAllKeys();
  const pick = entries[Math.floor(Math.random() * entries.length)];
  return pick?.text ?? '';
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export class TypingSandstormScreen extends Container {
  public static assetBundles = ['typing-level', 'typing-level-2', 'ui'];

  private background: Sprite;
  private keyboard: KeyboardLayout;
  private hud: HUD;
  private cloud: Sprite;
  private sun: Sprite;
  private letterLayer: Container;
  private dustLayer: Container;
  private fallingLetters: FallingLetter[] = [];
  private effectAnimations: AnimationPlaybackControls[] = [];
  private feedbackTimeouts: number[] = [];
  private viewWidth = 0;
  private viewHeight = 0;
  private spawnDelayMs = FIRST_SPAWN_DELAY_MS;
  private spawnedLetters = 0;
  private resolvedLetters = 0;
  private paused = true;
  private completed = false;

  constructor(mapUnit: TMapUnit) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('typing-level/background.png'),
      layout: { width: '100%', height: '100%', position: 'absolute', objectFit: 'cover' },
    });

    this.cloud = new Sprite({
      texture: Texture.from('typing-level-2/cloud.png'),
      layout: { width: '100%', height: '100%', position: 'absolute', objectFit: 'cover' },
    });

    this.sun = new Sprite({
      texture: Texture.from('typing-level-2/sun.png'),
      layout: { width: '100%', height: '100%', position: 'absolute', objectFit: 'cover' },
    });

    this.letterLayer = new Container();
    this.dustLayer = new Container();

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: mapUnit.type,
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      onHelp: () =>
        void engine().navigation.showPopup(TutorialPopup, {
          asset: 'tutorial-popups/typing-tutorial.png',
          backdropColor: 0x7d5600,
          exitable: true,
        }),
    });

    this.keyboard = new KeyboardLayout();

    this.addChild(
      this.background,
      this.sun,
      this.cloud,
      this.keyboard,
      this.hud,
      this.letterLayer,
      this.dustLayer,
    );
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.viewWidth = width;
    this.viewHeight = height;
    this.keyboard.resize(width, height);
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

  public update(ticker: Ticker) {
    if (this.paused || this.completed) return;

    const deltaMs = Math.min(ticker.deltaMS, 50);
    this.updateSpawning(deltaMs);
    this.updateFallingLetters(deltaMs);
  }

  public async show() {
    void this.keyboard.resume();
    window.addEventListener('keydown', this.handleKeyDown);
    this.cloud.y = 300;
    this.cloud.alpha = 0;
    this.paused = false;

    await Promise.all([
      this.keyboard.playEnterAnimation(),
      animate(this.cloud, { y: 0 }, { duration: 1, ease: 'easeOut' }),
      animate(this.cloud, { alpha: 1 }, { duration: 1.4, ease: 'easeOut' }),
    ]);
  }

  public async hide() {
    await this.pause();
    await Promise.all([
      this.keyboard.playExitAnimation(),
      animate(this.cloud, { alpha: 0 }, { duration: 0.2, ease: 'easeIn' }),
      animate(this.cloud, { y: 300 }, { duration: 0.2, ease: 'easeIn' }),
    ]);
  }

  public reset() {
    this.cleanupLevel();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.cleanupLevel();
    super.destroy(options);
  }

  private updateSpawning(deltaMs: number) {
    if (
      this.spawnedLetters >= LETTER_GOAL ||
      this.fallingLetters.length >= MAX_ACTIVE_LETTERS ||
      this.viewWidth <= 0
    ) {
      return;
    }

    this.spawnDelayMs -= deltaMs;
    if (this.spawnDelayMs > 0) return;

    this.spawnLetter();
    this.spawnDelayMs = randomBetween(MIN_SPAWN_DELAY_MS, MAX_SPAWN_DELAY_MS);
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
      falling.card.y += (falling.fallSpeed + gust * 16) * (deltaMs / 1000);
      falling.card.rotation =
        falling.startRotation + Math.sin(elapsedSeconds * 2.4 + falling.phase) * 0.12;

      if (falling.card.y + CARD_SIZE >= this.viewHeight) {
        this.missLetter(index);
      }
    }
  }

  private spawnLetter() {
    const spawnWidth = this.viewWidth * SPAWN_WIDTH_RATIO;
    const spawnLeft = (this.viewWidth - spawnWidth) / 2;
    const spawnRight = spawnLeft + spawnWidth;
    const letter = makeRandomLetter();
    const card = new Letter({ letter, cardSize: CARD_SIZE });
    const spawnX = this.pickSpawnX(spawnLeft, spawnRight - CARD_SIZE);

    card.alpha = 0;
    card.x = spawnX;
    card.y = -CARD_SIZE - randomBetween(0, 80);
    card.rotation = randomBetween(-0.1, 0.1);

    this.letterLayer.addChild(card);
    void card.playAppear(0);

    this.fallingLetters.push({
      letter,
      card,
      spawnX,
      elapsedMs: 0,
      fallSpeed: randomBetween(40, 50),
      windSpeed: randomBetween(-20, 20),
      swayAmplitude: randomBetween(20, 50),
      swaySpeed: randomBetween(1.25, 2.5),
      phase: randomBetween(0, Math.PI * 2),
      startRotation: card.rotation,
    });

    this.spawnedLetters += 1;
  }

  private pickSpawnX(minX: number, maxX: number) {
    const activeXs = this.fallingLetters.map((falling) => falling.card.x);
    if (activeXs.length === 0) {
      return randomBetween(minX, maxX);
    }

    // Make sure the letters don't spawn too close to each other
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = randomBetween(minX, maxX);
      const hasEnoughSpace = activeXs.every(
        (activeX) => Math.abs(activeX - candidate) >= MIN_SPAWN_SEPARATION,
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
    if (
      this.paused ||
      this.completed ||
      event.repeat ||
      event.key === 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;

    const typedLetter = getMappedFromKeyboardEvent(event);
    if (!typedLetter) return;

    const targetIndex = this.findLowestMatchingLetter(typedLetter);
    if (targetIndex >= 0) {
      this.typeLetter(targetIndex, event.code);
      return;
    }

    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.keyboard.setKeyFeedback(event.code, 'error');
    this.feedbackTimeouts.push(
      window.setTimeout(() => this.keyboard.clearKeyFeedback(event.code), 350),
    );
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
    this.keyboard.setKeyFeedback(code, 'success');
    this.feedbackTimeouts.push(window.setTimeout(() => this.keyboard.clearKeyFeedback(code), 350));

    falling.card.setFeedback('success', true);
    const animation = animate(
      falling.card,
      { alpha: 0, y: falling.card.y - 48 },
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

    const dustX = falling.card.x + CARD_SIZE / 2;
    const dustY = this.viewHeight - DUST_SIZE * 0.42;
    this.destroyLetterCard(falling.card);
    this.showDustBall(dustX, dustY);
    this.tryEndGame();
  }

  private showDustBall(x: number, y: number) {
    const dust = new Sprite(Texture.from('typing-level-2/dust-ball.png'));
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

  private destroyLetterCard(card: Letter) {
    card.parent?.removeChild(card);
    card.destroy({ children: true });
  }

  private tryEndGame() {
    if (this.completed || this.resolvedLetters < LETTER_GOAL || this.fallingLetters.length > 0) {
      return;
    }

    this.completed = true;
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, 'typing');
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

    this.fallingLetters = [];

    this.letterLayer.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.dustLayer.removeChildren().forEach((child) => child.destroy({ children: true }));
  }

  private clearFeedbackTimers() {
    for (const timeout of this.feedbackTimeouts) {
      window.clearTimeout(timeout);
    }
    this.feedbackTimeouts = [];
  }
}
