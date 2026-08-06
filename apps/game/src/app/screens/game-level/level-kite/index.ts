import { Container, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { convertToCurrentScript } from '../../../../utils/script';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { REMOTE_WORDS_BUNDLE, resolveWordsByIds } from '../../../../zustandStores/wordStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { getTypedLevel, type TLevel } from '../../level-map/units';
import { Gust } from './gust';
import { Kite } from './kite';
import { KITE_WIDTH, KitesBar } from './kites-bar';
import { ScoreCounter } from './score-counter';

const KEY_FEEDBACK_MS = 300;
const WORD_COMPLETE_HOLD_MS = 350; // let the last letter read as completed before the gust exits
const HUD_MARGIN = 40;
const MAX_FRAME_MS = 50; // a backgrounded tab must not eat the timer

export class GameLevelKite extends Container {
  public static assetBundles = ['game-level', 'game-level-kite', REMOTE_WORDS_BUNDLE];
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
  private wordPool: string[];
  private activeWordIdx: number = 0;
  private wordTimerMs: number = 0;
  private timerRunning: boolean = false;
  private resolving: boolean = false; // gust is exiting, ignores input and the clock
  private paused: boolean = false;

  // kite
  private kite: Kite;

  // hud
  private kitesBar: KitesBar;
  private scoreCounter: ScoreCounter;
  private score: number = 0;

  // keyboard
  private keyboard: KeyboardLayout;
  private feedbackTimeouts: number[] = [];

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
    this.keyboard = new KeyboardLayout();

    this.wordPool = resolveWordsByIds(props.wordIds)
      .map((word) => word.word)
      .map(convertToCurrentScript);
    this.wordPool.sort(() => Math.random() - 0.5);

    this.kite = new Kite();

    this.kitesBar = new KitesBar(props.maxLives);
    this.scoreCounter = new ScoreCounter();

    this.addChild(this.background, this.kite, this.keyboard, this.kitesBar, this.scoreCounter);
  }
  resize(width: number, height: number) {
    this.layout = { width, height };
    this.screenHeight = height;
    this.screenWidth = width;
    this.gust?.resize(width, height);
    this.kite.resize(width, height);
    this.keyboard.resize(width, height);
    this.kitesBar.position.set(width - HUD_MARGIN, HUD_MARGIN + KITE_WIDTH / 2);
    this.scoreCounter.position.set(HUD_MARGIN, HUD_MARGIN);
  }
  public update(ticker: Ticker) {
    if (!this.timerRunning || this.paused || this.completed || this.resolving) return;
    this.wordTimerMs -= Math.min(ticker.deltaMS, MAX_FRAME_MS);
    if (this.wordTimerMs <= 0) this.blowAwayGust();
  }
  async pause() {
    this.paused = true;
    this.gust?.pause();
    this.kite.pauseIdle();
  }
  async resume() {
    this.paused = false;
    this.gust?.resume();
    this.kite.resumeIdle();
  }
  async show() {
    this.completed = false;
    this.resolving = false;
    this.paused = false;
    this.timerRunning = false;
    this.wordTimerMs = 0;
    this.kitesBar.reset();
    this.score = 0;
    this.scoreCounter.setScore(0);
    this.kite.reset();
    window.addEventListener('keydown', this.handleKeyDown);
    this.keyboard.playEnterAnimation();
    this.spawnGust();
  }
  async hide() {
    this.timerRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.gust?.stopAnimations();
    this.kite.stopAnimations();
    this.clearFeedbackTimeouts();
    this.keyboard.playExitAnimation();
  }

  private spawnGust() {
    const word = this.wordPool[this.activeWordIdx] ?? this.wordPool[0]; // carousel, game only ends on mistakes
    if (!word) return; // no words configured
    this.gust = new Gust({ word, fontSize: this.wordFontSize });
    this.gust.resize(this.screenWidth, this.screenHeight);
    this.addChild(this.gust);
    this.keyboard.setHintedLetter(this.gust.currentLetter);
    this.resolving = false;
    this.timerRunning = false;
    Promise.all([this.gust.playEntryAnimation(), this.kite.playEntryAnimation()]).then(() => {
      if (this.completed || this.resolving) return; // screen left, or already resolved
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
    this.pushTimeout(() => {
      if (this.completed) return; // screen left while the completed word was held
      this.kite.playSoarAnimation().then(() => {
        this.gust?.playExitAnimation().then(() => {
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
      gust.destroy({ children: true });
      this.gust = undefined;
      if (this.completed) return; // out of lives
      this.activeWordIdx++;
      this.spawnGust();
    });

    if (livesLeft <= 0) this.gameOver();
  }
  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.completed || this.resolving) return;
    if (event.repeat || event.key === 'Shift' || event.ctrlKey || event.metaKey || event.altKey)
      return;
    const typed = getMappedFromKeyboardEvent(event);
    if (!typed) return;
    const gust = this.gust;
    if (!gust) return;
    if (gust.typeLetter(typed)) {
      useSessionStore.getState().recordCorrect();
      this.score += this.pointsOnLetter;
      this.scoreCounter.setScore(this.score);
      this.keyboard.setKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      this.pushTimeout(() => this.keyboard.clearKeyFeedback(event.code), KEY_FEEDBACK_MS);
      if (gust.isComplete) this.advanceWord();
      else this.keyboard.setHintedLetter(gust.currentLetter);
    } else {
      useSessionStore.getState().recordMistake();
      this.keyboard.setKeyFeedback(event.code, 'error');
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      const livesLeft = this.kitesBar.loseLife();
      void this.kite.degrade(livesLeft);
      if (livesLeft <= 0) {
        this.gameOver();
        return;
      }
      this.pushTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        this.keyboard.setHintedLetter(this.gust?.currentLetter);
      }, KEY_FEEDBACK_MS);
    }
  };
  private gameOver() {
    if (this.completed) return;
    this.completed = true;
    this.timerRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.clearFeedbackTimeouts();
    this.gust?.stopAnimations();
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
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
}
