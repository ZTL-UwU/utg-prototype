import { Container, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { frameDeltaMs } from '../../../../engine/utils/maths';
import { randomShuffle } from '../../../../engine/utils/random';
import { topClearance } from '../../../../engine/utils/viewport';
import { getTypedText } from '../../../../utils/keymap';
import { convertToCurrentScript } from '../../../../utils/script';
import useSessionStore from '../../../../zustandStores/sessionStore';
import {
  getWordStandardAudioAlias,
  playWordAudio,
  levelWordAssets,
  resolveWordsByIds,
} from '../../../../zustandStores/wordStore';
import { hudButtonTop, type HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { LivesBar } from '../../../ui/lives-bar';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel } from '../../level-map/units';
import { Gust } from './gust';
import { Kite } from './kite';
import { ScoreCounter } from './score-counter';

const KEY_FEEDBACK_MS = 300;
const WORD_COMPLETE_HOLD_MS = 350; // let the last letter read as completed before the gust exits
const HUD_MARGIN = 40;
/** The score sits this far below the back button's top, clear of the 123-tall button. */
const SCORE_BELOW_HUD = 82;
const KITE_ICON = 'game-levels/game-level-kite/kites/bar.png';
const KITE_ICON_SIZE = 56;
type Round = {
  word: string;
  wordId: number;
};
export class GameLevelKite extends Container {
  public readonly screenName = 'GameLevelKite';
  public static assetBundles = ['game-level-kite', 'ui'];
  public static assets = levelWordAssets('standardAudio');
  public static loadingBackgroundAsset = 'game-levels/game-level-kite/splash.png';
  public static helpAssets: string[] = [];

  private readonly level: TLevel;
  private readonly pointsOnLetter: number;
  private readonly pointsOnWord: number;
  private readonly gustDurationMs: number;
  private readonly wordFontSize: number;

  private background: Sprite;

  // layout
  private screenWidth: number = 0; // reset on first resize call
  private screenHeight: number = 0;

  // gust
  private gust?: Gust;
  private wordPool: Round[];
  private activeWordIdx: number = 0;
  private wordTimerMs: number = 0;
  private timerRunning: boolean = false;
  private resolving: boolean = false; // gust is exiting, ignores input and the clock
  private paused: boolean = false;

  // kite
  private kite: Kite;

  // hud
  private kitesBar: LivesBar;
  private scoreCounter: ScoreCounter;
  private hud: HUD;
  private score: number = 0;

  // keyboard
  private keyboard: KeyboardLayout;
  /** The hold before a finished word's gust exits. */
  private holdTimeout?: ReturnType<typeof setTimeout>;

  private completed: boolean = false;

  constructor(level: TLevel) {
    super();
    const typedLevel = getTypedLevel(level, 'game-kite');
    this.level = typedLevel;
    const props = typedLevel.props;
    this.pointsOnLetter = props.pointsOnLetter;
    this.pointsOnWord = props.pointsOnWord;
    this.gustDurationMs = props.gustDurationSeconds * 1000;
    this.wordFontSize = props.wordFontSize;

    this.background = new Sprite({
      texture: Texture.from('game-levels/game-level-kite/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });
    this.keyboard = new KeyboardLayout({ text: 'words' });

    this.wordPool = randomShuffle(
      resolveWordsByIds(props.wordIds).map((word) => ({
        word: convertToCurrentScript(word.word, { autoCapitalize: false }),
        wordId: word.id,
      })),
    );

    this.kite = new Kite();

    this.kitesBar = new LivesBar({ maxLives: props.maxLives, icon: KITE_ICON });
    this.scoreCounter = new ScoreCounter();
    this.hud = createLevelHud(typedLevel);

    this.addChild(
      this.background,
      this.kite,
      this.keyboard,
      this.kitesBar,
      this.scoreCounter,
      this.hud,
    );
  }
  resize(width: number, height: number) {
    this.layout = { width, height };
    this.screenHeight = height;
    this.screenWidth = width;
    this.gust?.resize(width, height);
    this.kite.resize(width, height);
    this.keyboard.resize(width, height);
    // Both drop below the notch on phones, with the back button.
    this.kitesBar.position.set(
      width - HUD_MARGIN,
      HUD_MARGIN + topClearance(height) + KITE_ICON_SIZE / 2,
    );
    this.scoreCounter.position.set(HUD_MARGIN, hudButtonTop(height) + SCORE_BELOW_HUD);
    this.hud.layout = { width, height };
  }
  public update(ticker: Ticker) {
    if (!this.timerRunning || this.paused || this.completed || this.resolving) return;
    this.wordTimerMs -= frameDeltaMs(ticker);
    if (this.wordTimerMs <= 0) this.blowAwayGust();
  }
  /** Behind a popup such as Quit: the clock stops and keys no longer play. */
  async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
    this.gust?.pause();
    this.kite.pauseIdle();
  }
  async resume() {
    this.paused = false;
    if (!this.completed) window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    this.gust?.resume();
    this.kite.resumeIdle();
  }
  async show() {
    this.completed = false;
    this.resolving = false;
    this.paused = false;
    this.timerRunning = false;
    this.wordTimerMs = 0;
    this.score = 0;
    this.scoreCounter.setScore(0);
    this.kite.reset();
    window.addEventListener('keydown', this.handleKeyDown);
    void this.keyboard.playEnterAnimation();
    this.spawnGust();
  }
  async hide() {
    this.timerRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.gust?.stopAnimations();
    this.kite.stopAnimations();
    clearTimeout(this.holdTimeout);
    void this.keyboard.playExitAnimation();
  }

  private spawnGust() {
    if (this.destroyed || this.completed) return;
    // A carousel: the game only ends on mistakes, so the words come round again.
    const word = this.wordPool[this.activeWordIdx % this.wordPool.length];
    if (!word) return; // no words configured
    this.gust = new Gust({ word: word.word, fontSize: this.wordFontSize });
    this.gust.resize(this.screenWidth, this.screenHeight);
    this.addChildAt(this.gust, this.getChildIndex(this.hud)); // gusts pass under the hud
    this.keyboard.setHintedLetter(this.gust.currentLetter, this.gust.nextLetter);
    this.keyboard.setWordStart(true);
    this.resolving = false;
    this.timerRunning = false;
    void Promise.all([
      this.gust.playEntryAnimation(),
      this.kite.playEntryAnimation(),
      playWordAudio(getWordStandardAudioAlias(word.wordId)),
    ]).then(() => {
      if (this.destroyed || this.completed || this.resolving) return; // left, or already resolved
      this.wordTimerMs = this.gustDurationMs;
      this.timerRunning = true;
    });
  }
  private advanceWord() {
    this.resolving = true;
    this.timerRunning = false;
    this.score += this.pointsOnWord;
    this.scoreCounter.setScore(this.score);
    this.keyboard.setHintedLetter(undefined);
    this.holdTimeout = setTimeout(() => {
      if (this.completed || this.destroyed) return; // screen left while the word was held
      void this.kite.playSoarAnimation().then(() => {
        if (this.destroyed) return;
        void this.gust?.playExitAnimation().then(() => {
          this.gust?.destroy({ children: true });
          this.gust = undefined;
          this.activeWordIdx++;
          this.spawnGust();
        });
      });
    }, WORD_COMPLETE_HOLD_MS);
  }
  // clock ran out
  private blowAwayGust() {
    const gust = this.gust;
    if (!gust || this.resolving) return;
    this.resolving = true;
    this.timerRunning = false;

    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    gust.setState('grey');
    this.keyboard.setHintedLetter(undefined);

    const livesLeft = this.kitesBar.loseLife();
    void this.kite.degrade(livesLeft);

    void gust.playExitAnimation().then(() => {
      if (this.destroyed) return;
      gust.destroy({ children: true });
      this.gust = undefined;
      if (this.completed) return; // out of lives
      this.activeWordIdx++;
      this.spawnGust();
    });

    if (livesLeft <= 0) this.gameOver();
  }
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.completed || this.resolving || this.paused) return;
    const typed = getTypedText(event);
    if (!typed) return;
    const gust = this.gust;
    if (!gust) return;
    if (gust.typeLetter(typed)) {
      useSessionStore.getState().recordCorrect();
      this.score += this.pointsOnLetter;
      this.scoreCounter.setScore(this.score);
      this.keyboard.flashKeyFeedback(event.code, 'success', { ms: KEY_FEEDBACK_MS });
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      if (gust.isComplete) this.advanceWord();
      else this.keyboard.setHintedLetter(gust.currentLetter, gust.nextLetter);
    } else {
      useSessionStore.getState().recordMistake();
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      const livesLeft = this.kitesBar.loseLife();
      void this.kite.degrade(livesLeft);
      if (livesLeft <= 0) {
        this.keyboard.setKeyFeedback(event.code, 'error');
        this.gameOver();
        return;
      }
      this.keyboard.flashKeyFeedback(event.code, 'error', {
        ms: KEY_FEEDBACK_MS,
        onCleared: () =>
          this.keyboard.setHintedLetter(this.gust?.currentLetter, this.gust?.nextLetter),
      });
    }
  };
  private gameOver() {
    if (this.completed) return;
    this.completed = true;
    this.timerRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    clearTimeout(this.holdTimeout);
    this.gust?.stopAnimations();
    finishLevel(this, this.level);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    clearTimeout(this.holdTimeout);
    super.destroy(options);
  }
}
