import { animate, type AnimationPlaybackControls } from 'motion';
import {
  Container,
  HTMLText,
  HTMLTextStyle,
  Sprite,
  Texture,
  Ticker,
  type Bounds,
  type DestroyOptions,
} from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomInt, randomShuffle } from '../../../../engine/utils/random';
import { responsive, topClearance } from '../../../../engine/utils/viewport';
import { createTypingWordStyle, getHighlightedWordMarkup } from '../../../../utils/example-words';
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
import { blinkAlpha, LivesBar } from '../../../ui/lives-bar';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel } from '../../level-map/units';

/**
 * Phones stand the rocks this far below the keyboard's top instead of on the screen's bottom.
 * Their keyboard covers so much of the screen that rocks on the bottom barely show above it.
 */
const PHONE_ROCK_TUCK = 250;

const MAX_FRAME_MS = 50;
/**
 * The bird's speed is in pixels per 60 Hz frame: levels' gravity and jump were tuned when it
 * moved by its speed once per frame. Scaling by the frame time keeps that feel at any refresh
 * rate, where it used to fall twice as fast at 120 Hz.
 */
const REFERENCE_FRAME_MS = 1000 / 60;

// unit conversion
const MS_PER_SECOND = 1000;
const perSecondToPerMs = (value: number) => value / MS_PER_SECOND;
const perSecondSqToPerMsSq = (value: number) => value / (MS_PER_SECOND * MS_PER_SECOND);

// BIRD CONSTS
const BIRD_Y_CEIL = 10;
const DEATH_SPIN = 0.004; // rad/ms
const MAX_DEATH_ROTATION = Math.PI / 2;

// LIVES CONSTS
const LIVES_MARGIN = 40;
const HEART_ASSET = 'game-levels/game-level-flying/heart-full.png';
const HEART_SIZE = 56;

// COLUMN CONSTS
const MIN_COLUMN_SPAWN_GAP_PX = 500;
const MAX_COLUMN_SPAWN_GAP_PX = 700;

// WORD CONSTS
const WORD_BASE_COLOR = 0x333333; // remaining (untyped) letters
const WORD_TOP_RATIO = 0.12; // vertical placement of the word

function rectsOverlap(a: Bounds, b: Bounds) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/**
 * Randomises the word order; `totalWords` of 0 (or ≥ the pool size) plays every word once,
 * otherwise a random subset of that size. Mirrors the fruit-fall selection.
 */
function pickWords(words: Round[], totalWords: number): Round[] {
  const shuffled = randomShuffle([...words]);
  return totalWords === 0 ? shuffled : shuffled.slice(0, totalWords);
}

// playing → dying (cosmetic fall after a hit) → over (gameOver already fired).
type FlyingState = 'playing' | 'dying' | 'over';
type Round = { word: string; wordId: number };
export class GameLevelFlying extends Container {
  public readonly screenName = 'GameLevelFlying';
  public static assetBundles = ['game-level-flying', 'ui'];
  public static assets = levelWordAssets('standardAudio');
  public static loadingBackgroundAsset = 'game-levels/game-level-flying/background.png';
  public static helpAssets: string[] = [];
  private background: Sprite;
  private bird: Sprite;
  private birdVY = 0;
  private flapUp = Texture.from('game-levels/game-level-flying/bird/flap-up.png');
  private flapDown = Texture.from('game-levels/game-level-flying/bird/flap-down.png');
  private flapAnim?: AnimationPlaybackControls;
  private spawnDistanceThreshold: number;
  private elapsedDistance: number;
  private activeColumns: Sprite[];
  private livesBar: LivesBar;
  private invulnerableMs = 0;
  private blinkAnim?: AnimationPlaybackControls;
  private state: FlyingState = 'playing';
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  /** Where rocks stand: the screen's bottom, or just behind the keyboard on phones. */
  private rockBaseY: number = 0;
  private keyboard: KeyboardLayout;
  private hud: HUD;
  private wordStyle: HTMLTextStyle;
  private wordText: HTMLText;
  private words: Round[];
  private wordIndex = 0;
  private activeRound?: Round;
  private activeLetterIdx = 0;
  /** Behind a popup: the bird and rocks hold still and keys are ignored. */
  private paused = false;
  private readonly level: TLevel;
  private readonly jumpHeight: number;
  private readonly gravity: number;
  private readonly columnVelocity: number;
  private readonly maxActiveColumns: number;
  private readonly invulnerableDurationMs: number;
  constructor(level: TLevel) {
    super();
    const typedLevel = getTypedLevel(level, 'game-flying');
    this.level = typedLevel;
    const props = typedLevel.props;
    this.jumpHeight = props.jumpHeight;
    this.gravity = perSecondSqToPerMsSq(props.gravityPxPerSecondSquared);
    this.columnVelocity = perSecondToPerMs(props.columnSpeedPxPerSecond);
    this.maxActiveColumns = props.maxActiveColumns;
    this.invulnerableDurationMs = props.invulnerableSeconds * MS_PER_SECOND;

    this.background = new Sprite({
      texture: Texture.from('game-levels/game-level-flying/background.png'),
      // Cover rather than stretch, so the landscape keeps its shape on tall phones.
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.bird = new Sprite({
      texture: this.flapUp,
      layout: { position: 'absolute', left: '7%' },
    });
    this.elapsedDistance = 0;
    this.spawnDistanceThreshold = 0;
    this.activeColumns = [];
    this.livesBar = new LivesBar({
      maxLives: props.maxLives,
      icon: HEART_ASSET,
      blinkSeconds: props.invulnerableSeconds,
    });
    this.bird.anchor.set(0.5);

    const wordPool: Round[] = resolveWordsByIds(props.wordIds).map((word) => {
      const round: Round = {
        word: convertToCurrentScript(word.word, { autoCapitalize: false }),
        wordId: word.id,
      };
      return round;
    });
    this.words = pickWords(wordPool, props.totalWords);
    this.activeRound = this.words[0];
    this.wordStyle = createTypingWordStyle(props.wordFontSize, WORD_BASE_COLOR);
    this.wordText = new HTMLText({ style: this.wordStyle });
    this.wordText.anchor.set(0.5);

    this.keyboard = new KeyboardLayout({ text: 'words' });
    this.hud = createLevelHud(typedLevel);

    this.addChild(
      this.background,
      this.keyboard,
      this.bird,
      this.livesBar,
      this.wordText,
      this.hud,
    );
    this.renderWord();
  }

  update(ticker: Ticker) {
    const deltaMs = Math.min(ticker.deltaMS, MAX_FRAME_MS);
    if (this.state === 'over' || this.paused) return;
    if (this.state === 'dying') {
      this.updateDeathFall(deltaMs);
      return;
    }
    if (this.invulnerableMs > 0) this.invulnerableMs -= deltaMs;
    this.updateBird(deltaMs);
    this.updateColumns(deltaMs);
    this.checkCollisions();
  }

  // ticker update fn's
  private updateBird(deltaMS: number) {
    this.birdVY += this.gravity * deltaMS;

    // Y CEILING SHOULD NOT BE BROKEN BY JUMPING BIRD
    const updatedBirdY = this.bird.y + this.birdVY * (deltaMS / REFERENCE_FRAME_MS);
    this.bird.y = Math.max(BIRD_Y_CEIL, updatedBirdY);
  }
  private updateColumns(deltaMs: number) {
    this.advanceExistingColumns(deltaMs);
    this.spawnNewColumns(deltaMs);
  }

  // cosmetic fall
  private updateDeathFall(deltaMs: number) {
    this.birdVY += this.gravity * deltaMs;
    this.bird.y += this.birdVY * (deltaMs / REFERENCE_FRAME_MS);
    this.bird.rotation = Math.min(this.bird.rotation + DEATH_SPIN * deltaMs, MAX_DEATH_ROTATION);

    const overshoot = this.bird.getBounds().maxY - this.screenHeight;
    if (overshoot >= 0) {
      this.bird.y -= overshoot; // settle exactly on the floor
      this.gameOver();
    }
  }

  // COLLISION HELPERS
  private checkCollisions() {
    const birdBounds = this.bird.getBounds();

    // the floor is fatal no matter how many hearts are left
    if (birdBounds.maxY >= this.screenHeight) {
      this.die();
      return;
    }
    if (this.invulnerableMs > 0) return;

    for (const col of this.activeColumns) {
      if (rectsOverlap(birdBounds, col.getBounds())) {
        this.handleColumnHit();
        return;
      }
    }
  }
  private handleColumnHit() {
    const livesLeft = this.livesBar.loseLife();
    if (livesLeft <= 0) {
      this.die();
      return;
    }
    // keep flying, but invincible for a little bit
    this.invulnerableMs = this.invulnerableDurationMs;
    this.blinkAnim?.stop();
    this.bird.alpha = 1;
    // Blinks for as long as it cannot be hit, in step with the heart it lost.
    this.blinkAnim = blinkAlpha((alpha) => (this.bird.alpha = alpha), {
      durationS: this.invulnerableDurationMs / MS_PER_SECOND,
      onComplete: () => (this.bird.alpha = 1),
    });
  }
  // sorry for the morbid name
  private die() {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    window.removeEventListener('keydown', this.handleKeyDown);
    this.flapAnim?.stop();
    this.blinkAnim?.stop();
    this.bird.alpha = 1;
    this.bird.texture = this.flapUp;
    this.birdVY = 0;
  }

  private gameOver() {
    if (this.state === 'over') return;
    this.state = 'over';
    window.removeEventListener('keydown', this.handleKeyDown);
    finishLevel(this, this.level);
  }

  // BIRD FLYING HELPERS

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.state !== 'playing' || this.paused || !this.activeRound) return;
    const typed = getTypedText(event);
    if (!typed) return;

    if (typed === this.currentTargetLetter) {
      useSessionStore.getState().recordCorrect();
      this.keyboard.flashKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      this.jump();
      this.advanceLetter();
    } else {
      useSessionStore.getState().recordMistake();
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      this.keyboard.flashKeyFeedback(event.code, 'error', {
        onCleared: () =>
          this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter),
      });
    }
  };

  private jump() {
    this.flapAnimation();
    this.bird.y -= this.jumpHeight;
    this.birdVY = 0;
  }

  private get currentTargetLetter() {
    return this.activeRound?.word[this.activeLetterIdx];
  }

  /** The letter after the target, which tells a phone a word-initial ئ comes from a vowel key. */
  private get nextTargetLetter() {
    return this.activeRound?.word[this.activeLetterIdx + 1];
  }

  private renderWord() {
    if (!this.activeRound) return;
    this.wordText.text = getHighlightedWordMarkup(this.activeRound.word, this.activeLetterIdx, 1);
    this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
    this.keyboard.setWordStart(this.activeLetterIdx === 0);
  }

  private advanceLetter() {
    if (!this.activeRound) return;
    this.activeLetterIdx += 1;
    if (this.activeLetterIdx < this.activeRound.word.length) {
      this.renderWord();
      return;
    }

    // current word finished — move on, or end the run once every word has been played
    this.wordIndex += 1;

    if (this.wordIndex >= this.words.length) {
      this.gameOver();
      return;
    }
    this.activeRound = this.words[this.wordIndex];
    this.activeLetterIdx = 0;
    void playWordAudio(getWordStandardAudioAlias(this.activeRound.wordId));
    this.renderWord();
  }

  private flapAnimation() {
    this.flapAnim?.stop(); // kill ongoing flap
    this.bird.texture = this.flapDown;

    this.flapAnim = animate(0, 1, {
      duration: 0.15,
      onComplete: () => {
        this.bird.texture = this.flapUp;
      },
    });
  }

  // COLUMN HELPERS
  private advanceExistingColumns(deltaMs: number) {
    for (let i = this.activeColumns.length - 1; i >= 0; i--) {
      let col = this.activeColumns[i];
      col.x = col.x - this.columnVelocity * deltaMs;
      // Anchored at its centre, so only gone once its right edge has left the screen.
      if (col.x + col.width / 2 < 0) {
        this.activeColumns.splice(i, 1);
        col.destroy({ children: true });
      }
    }
  }
  private spawnNewColumns(deltaMs: number) {
    this.elapsedDistance += this.columnVelocity * deltaMs;
    if (
      this.activeColumns.length >= this.maxActiveColumns ||
      this.elapsedDistance < this.spawnDistanceThreshold
    ) {
      return;
    }
    const col: Sprite = this.getRandomColumn();
    col.anchor.set(0.5, 1); // grab bottom-center
    col.x = this.screenWidth + col.width / 2; // enter from beyond the right edge
    col.y = this.rockBaseY; // bottom sits on the floor
    this.activeColumns.push(col);
    // insert under the keyboard so the rocks tuck behind the keyboard panel and the bird
    this.addChildAt(col, this.getChildIndex(this.keyboard));

    // reset spawn distance control
    this.elapsedDistance = 0;
    this.spawnDistanceThreshold = randomInt(MIN_COLUMN_SPAWN_GAP_PX, MAX_COLUMN_SPAWN_GAP_PX);
  }
  private getRandomColumn(): Sprite {
    return new Sprite(Texture.from(`game-levels/game-level-flying/columns/${randomInt(1, 3)}.png`));
  }

  // engine reqs
  async show() {
    // A level with no words has nothing to type.
    if (!this.activeRound) {
      this.state = 'over';
      finishLevel(this, this.level);
      return;
    }
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playEnterAnimation();
  }

  async hide() {
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playExitAnimation();
  }

  async pause() {
    this.paused = true;
    await this.keyboard.pause();
  }

  async resume() {
    this.paused = false;
    await this.keyboard.resume();
  }

  override destroy(options?: DestroyOptions): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.flapAnim?.stop();
    this.blinkAnim?.stop();
    super.destroy(options);
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.layout = { width, height };
    // hearts grow leftward from the origin, so pin it to the top-right corner
    this.livesBar.position.set(
      width - LIVES_MARGIN,
      LIVES_MARGIN + topClearance(height) + HEART_SIZE / 2,
    );
    this.keyboard.resize(width, height);
    this.hud.layout = { width, height };
    this.wordText.position.set(width / 2, height * WORD_TOP_RATIO);
    this.screenHeight = height;
    this.screenWidth = width;
    this.rockBaseY = responsive({ sm: this.keyboard.y + PHONE_ROCK_TUCK, lg: height });
    for (const col of this.activeColumns) col.y = this.rockBaseY;
  }
}
