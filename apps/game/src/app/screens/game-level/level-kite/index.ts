import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { Gust } from './gust';

const WORDS = ['ئاسمان', 'ئەينەك', 'پاختا'];
const KEY_FEEDBACK_MS = 300;

export class GameLevelKite extends Container {
  public static assetBundles = ['game-level', 'game-level-kite'];
  private background: Sprite;

  // layout
  private screenWidth: number = 0; // reset on first resize call
  private screenHeight: number = 0;

  // gust
  private gust?: Gust;
  private wordPool: string[];
  private activeWordIdx: number = 0;

  // keyboard
  private keyboard: KeyboardLayout;
  private feedbackTimeouts: number[] = [];

  constructor() {
    super();

    this.background = new Sprite({
      texture: Texture.from('game-levels/game-level-kite/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });
    this.keyboard = new KeyboardLayout();

    this.wordPool = WORDS;
    this.wordPool.sort(() => Math.random() - 0.5);

    this.addChild(this.background, this.keyboard);
  }
  resize(width: number, height: number) {
    this.layout = { width, height };
    this.screenHeight = height;
    this.screenWidth = width;
    this.gust?.resize(width, height);
    this.keyboard.resize(width, height);
  }
  async pause() {
    this.gust?.pause();
  }
  async resume() {
    this.gust?.resume();
  }
  async show() {
    window.addEventListener('keydown', this.handleKeyDown);
    this.keyboard.playEnterAnimation();
    this.spawnGust();
  }
  async hide() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.gust?.stopAnimations();
    this.clearFeedbackTimeouts();
    this.keyboard.playExitAnimation();
  }

  private spawnGust() {
    const word = this.wordPool[this.activeWordIdx] ?? this.wordPool[0]; // TODO: set up end game behavior
    this.gust = new Gust({ word });
    this.gust.resize(this.screenWidth, this.screenHeight);
    this.addChild(this.gust);
    this.keyboard.setHintedLetter(this.gust.currentLetter);
    void this.gust.playEntryAnimation();
  }
  private advanceWord() {
    this.gust?.playExitAnimation().then(() => {
      this.gust?.destroy({ children: true });
      this.gust = undefined;
      this.activeWordIdx++;
      this.spawnGust();
    });
  }
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || event.key === 'Shift' || event.ctrlKey || event.metaKey || event.altKey)
      return;
    const typed = getMappedFromKeyboardEvent(event);
    if (!typed) return;
    const gust = this.gust;
    if (!gust) return;
    if (gust.typeLetter(typed)) {
      useSessionStore.getState().recordCorrect();
      this.keyboard.setKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      this.pushTimeout(() => this.keyboard.clearKeyFeedback(event.code), KEY_FEEDBACK_MS);
      if (gust.isComplete) this.advanceWord();
      else this.keyboard.setHintedLetter(gust.currentLetter);
    } else {
      useSessionStore.getState().recordMistake();
      this.keyboard.setKeyFeedback(event.code, 'error');
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      this.pushTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        this.keyboard.setHintedLetter(this.gust?.currentLetter);
      }, KEY_FEEDBACK_MS);
    }
  };
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
