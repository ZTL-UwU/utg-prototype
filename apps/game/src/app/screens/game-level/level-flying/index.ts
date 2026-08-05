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
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { blinkAlpha, HEART_WIDTH, LivesBar } from './lives-bar';

// PHYSICS CONSTS
const GRAVITY = 0.000495; // px/ms^2
const JUMP = 100; //px
const MAX_FRAME_MS = 50;

// BIRD CONSTS
const BIRD_Y_CEIL = 10;
const DEATH_SPIN = 0.004; // rad/ms
const MAX_DEATH_ROTATION = Math.PI / 2;

// LIVES CONSTS
const MAX_LIVES = 5;
const INVULNERABLE_MS = 1000;
const LIVES_MARGIN = 40;

// COLUMN CONSTS
const COL_VX = 0.1; // px/ms
const MAX_ACTIVE_COLUMNS = 3;
const MIN_COLUMN_SPAWN_GAP_PX = 500;
const MAX_COLUMN_SPAWN_GAP_PX = 700;

// WORD CONSTS
// TODO: replace by level props later
const DUMMY_WORDS = ['ئالما', 'تاۋۇز', 'كىتاب', 'مەكتەپ', 'ياخشى'];
const WORD_FONT_SIZE = 90;
const WORD_BASE_COLOR = 0x333333; // remaining (untyped) letters
const WORD_TOP_RATIO = 0.12; // vertical placement of the word
const KEY_FEEDBACK_MS = 350;

function getRandomIntBetween(first: number, second: number) {
  return Math.floor(first + Math.random() * (second - first + 1));
}

function rectsOverlap(a: Bounds, b: Bounds) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

// playing → dying (cosmetic fall after a hit) → over (gameOver already fired).
type FlyingState = 'playing' | 'dying' | 'over';

export class GameLevelFlying extends Container {
  public static assetBundles = ['game-level', 'game-level-flying', 'ui'];
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
  constructor() {
    super();

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
    this.livesBar = new LivesBar(MAX_LIVES);
    this.bird.anchor.set(0.5);

    this.words = DUMMY_WORDS.map(convertToCurrentScript);
    this.activeWord = this.words[0];
    this.wordStyle = createTypingWordStyle(WORD_FONT_SIZE, WORD_BASE_COLOR);
    this.wordText = new HTMLText({ style: this.wordStyle });
    this.wordText.anchor.set(0.5);

    this.keyboard = new KeyboardLayout();
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: 'game',
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
    this.birdVY += GRAVITY * deltaMS;

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
    this.birdVY += GRAVITY * deltaMs;
    this.bird.y += this.birdVY;
    this.bird.rotation = Math.min(this.bird.rotation + DEATH_SPIN * deltaMs, MAX_DEATH_ROTATION);

    const overshoot = this.bird.getBounds().maxY - this.screenHeight;
    if (overshoot >= 0) {
      this.bird.y -= overshoot; // settle exactly on the floor
      this.state = 'over';
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
    this.invulnerableMs = INVULNERABLE_MS;
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
  private die() {
    // sorry for the morbid name
    if (this.state !== 'playing') return;
    this.state = 'dying';
    window.removeEventListener('keydown', this.handleKeyDown);
    this.flapAnim?.stop();
    this.blinkAnim?.stop();
    this.bird.alpha = 1;
    this.bird.texture = this.flapUp;
    this.birdVY = 0;
  }

  // no TLevel/map unit yet, just returns home
  private gameOver() {
    this.goHome();
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
      this.keyboard.setKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      this.pushTimeout(() => this.keyboard.clearKeyFeedback(event.code), KEY_FEEDBACK_MS);
      this.jump();
      this.advanceLetter();
    } else {
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
    this.bird.y -= JUMP;
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
    if (this.activeLetterIdx >= this.activeWord.length) {
      this.wordIndex = (this.wordIndex + 1) % this.words.length;
      this.activeWord = this.words[this.wordIndex];
      this.activeLetterIdx = 0;
    }
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
      col.x = col.x - COL_VX * deltaMs;
      if (col.x < 0) {
        this.activeColumns.splice(i, 1);
        col.destroy({ children: true });
      }
    }
  }
  private spawnNewColumns(deltaMs: number) {
    this.elapsedDistance += COL_VX * deltaMs;
    if (
      this.activeColumns.length >= MAX_ACTIVE_COLUMNS ||
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
