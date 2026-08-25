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
import { createTypingWordStyle, getHighlightedWordMarkup } from '../../../../utils/example-words';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { convertToCurrentScript } from '../../../../utils/script';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { REMOTE_WORDS_BUNDLE, resolveWordsByIds } from '../../../../zustandStores/wordStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { getTypedLevel, type TLevel } from '../../level-map/units';
import { blinkAlpha, HEART_WIDTH, LivesBar } from './lives-bar';

const MAX_FRAME_MS = 50;

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

// COLUMN CONSTS
const MIN_COLUMN_SPAWN_GAP_PX = 500;
const MAX_COLUMN_SPAWN_GAP_PX = 700;

// WORD CONSTS
const WORD_BASE_COLOR = 0x333333; // remaining (untyped) letters
const WORD_TOP_RATIO = 0.12; // vertical placement of the word
const KEY_FEEDBACK_MS = 350;

function getRandomIntBetween(first: number, second: number) {
  return Math.floor(first + Math.random() * (second - first + 1));
}

function rectsOverlap(a: Bounds, b: Bounds) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/**
 * Randomises the word order; `totalWords` of 0 (or ≥ the pool size) plays every word once,
 * otherwise a random subset of that size. Mirrors the fruit-fall selection.
 */
function pickWords(words: string[], totalWords: number): string[] {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return totalWords === 0 ? shuffled : shuffled.slice(0, totalWords);
}

// playing → dying (cosmetic fall after a hit) → over (gameOver already fired).
type FlyingState = 'playing' | 'dying' | 'over';

export class GameLevelFlying extends Container {
  public static assetBundles = ['game-level-flying', 'ui', REMOTE_WORDS_BUNDLE];
  public static splashBackgroundAsset = 'game-levels/game-level-flying/background.png';
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
  private keyboard: KeyboardLayout;
  private hud: HUD;
  private wordStyle: HTMLTextStyle;
  private wordText: HTMLText;
  private words: string[];
  private wordIndex = 0;
  private activeWord: string;
  private activeLetterIdx = 0;
  private feedbackTimeouts: number[] = [];
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
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });
    this.bird = new Sprite({
      texture: this.flapUp,
      layout: { position: 'absolute', left: '7%' },
    });
    this.elapsedDistance = 0;
    this.spawnDistanceThreshold = 0;
    this.activeColumns = [];
    this.livesBar = new LivesBar(props.maxLives);
    this.bird.anchor.set(0.5);

    const wordPool = resolveWordsByIds(props.wordIds).map((word) => word.word);
    this.words = pickWords(wordPool, props.totalWords).map((word) =>
      convertToCurrentScript(word, { autoCapitalize: false }),
    );
    this.activeWord = this.words[0];
    this.wordStyle = createTypingWordStyle(props.wordFontSize, WORD_BASE_COLOR);
    this.wordText = new HTMLText({ style: this.wordStyle });
    this.wordText.anchor.set(0.5);

    this.keyboard = new KeyboardLayout();
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          mascot: typedLevel.mascot,
          onQuit: () => this.goHome(),
        }),
    });

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
    if (this.state === 'over') return;
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
    const updatedBirdY = this.bird.y + this.birdVY;
    this.bird.y = updatedBirdY <= BIRD_Y_CEIL ? BIRD_Y_CEIL : updatedBirdY;
  }
  private updateColumns(deltaMs: number) {
    this.advanceExistingColumns(deltaMs);
    this.spawnNewColumns(deltaMs);
  }

  // cosmetic fall
  private updateDeathFall(deltaMs: number) {
    this.birdVY += this.gravity * deltaMs;
    this.bird.y += this.birdVY;
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
    this.blinkAnim = blinkAlpha(
      (alpha) => {
        this.bird.alpha = alpha;
      },
      () => {
        this.bird.alpha = 1;
      },
    );
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
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }

  // BIRD FLYING HELPERS

  private handleKeyDown = (event: KeyboardEvent) => {
    if (
      this.state !== 'playing' ||
      event.repeat ||
      event.key === 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;

    const typed = getMappedFromKeyboardEvent(event);
    if (!typed) return;

    if (typed === this.activeWord[this.activeLetterIdx]) {
      useSessionStore.getState().recordCorrect();
      this.keyboard.setKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      this.pushTimeout(() => this.keyboard.clearKeyFeedback(event.code), KEY_FEEDBACK_MS);
      this.jump();
      this.advanceLetter();
    } else {
      useSessionStore.getState().recordMistake();
      this.keyboard.setKeyFeedback(event.code, 'error');
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      this.pushTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        this.keyboard.setHintedLetter(this.currentTargetLetter);
      }, KEY_FEEDBACK_MS);
    }
  };

  private jump() {
    this.flapAnimation();
    this.bird.y -= this.jumpHeight;
    this.birdVY = 0;
  }

  private get currentTargetLetter() {
    return this.activeWord[this.activeLetterIdx];
  }

  private renderWord() {
    const len = this.activeWord[this.activeLetterIdx]?.length ?? 1;
    this.wordText.text = getHighlightedWordMarkup(this.activeWord, this.activeLetterIdx, len);
    this.keyboard.setHintedLetter(this.currentTargetLetter);
  }

  private advanceLetter() {
    this.activeLetterIdx += this.activeWord[this.activeLetterIdx].length;
    if (this.activeLetterIdx < this.activeWord.length) {
      this.renderWord();
      return;
    }

    // current word finished — move on, or end the run once every word has been played
    this.wordIndex += 1;
    if (this.wordIndex >= this.words.length) {
      this.gameOver();
      return;
    }
    this.activeWord = this.words[this.wordIndex];
    this.activeLetterIdx = 0;
    this.renderWord();
  }

  private pushTimeout(fn: () => void, ms: number) {
    this.feedbackTimeouts.push(window.setTimeout(fn, ms));
  }

  private clearFeedbackTimeouts() {
    for (const timeout of this.feedbackTimeouts) {
      window.clearTimeout(timeout);
    }
    this.feedbackTimeouts = [];
  }

  private goHome() {
    void import('../../home').then(({ HomeScreen }) => engine().navigation.showScreen(HomeScreen));
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
      if (col.x < 0) {
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
    col.x = this.screenWidth; // enter from right edge
    col.y = this.screenHeight; // bottom sits on the floor
    this.activeColumns.push(col);
    // insert under the keyboard so the rocks tuck behind the keyboard panel and the bird
    this.addChildAt(col, this.getChildIndex(this.keyboard));

    // reset spawn distance control
    this.elapsedDistance = 0;
    this.spawnDistanceThreshold = getRandomIntBetween(
      MIN_COLUMN_SPAWN_GAP_PX,
      MAX_COLUMN_SPAWN_GAP_PX,
    );
  }
  private getRandomColumn(): Sprite {
    return new Sprite(
      Texture.from(`game-levels/game-level-flying/columns/${getRandomIntBetween(1, 3)}.png`),
    );
  }

  // engine reqs
  async show() {
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playEnterAnimation();
    this.renderWord();
  }
  async hide() {
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playExitAnimation();
  }

  reset() {
    this.state = 'playing';
    this.birdVY = 0;
    this.bird.y = 0;
    this.bird.rotation = 0;
    this.bird.alpha = 1;
    this.flapAnim?.stop();
    this.blinkAnim?.stop();
    this.invulnerableMs = 0;
    this.livesBar.reset();
    this.bird.texture = this.flapUp;
    for (const col of this.activeColumns) {
      col.destroy({ children: true });
    }
    this.activeColumns = [];
    this.elapsedDistance = 0;
    this.spawnDistanceThreshold = 0;
    this.clearFeedbackTimeouts();
    this.keyboard.clearAllKeyFeedback();
    this.wordIndex = 0;
    this.activeWord = this.words[0];
    this.activeLetterIdx = 0;
    this.renderWord();
  }
  destroy(options?: DestroyOptions): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.clearFeedbackTimeouts();
    this.flapAnim?.stop();
    this.blinkAnim?.stop();
    super.destroy(options);
  }
  resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.layout = { width, height };
    // hearts grow leftward from the origin, so pin it to the top-right corner
    this.livesBar.position.set(width - LIVES_MARGIN, LIVES_MARGIN + HEART_WIDTH / 2);
    this.keyboard.resize(width, height);
    this.hud.layout = { width, height };
    this.wordText.position.set(width / 2, height * WORD_TOP_RATIO);
    this.screenHeight = height;
    this.screenWidth = width;
  }
}
