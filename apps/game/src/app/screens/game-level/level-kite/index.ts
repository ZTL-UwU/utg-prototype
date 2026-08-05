import { Container, HTMLText, HTMLTextStyle, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { createTypingWordStyle, getHighlightedWordMarkup } from '../../../../utils/example-words';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { KeyboardLayout } from '../../../ui/keyboard-layout';

const WORDS = ['ئاسمان', 'ئەينەك', 'پاختا'];
const FONT_SIZE = 90;
const FONT_COLOR = 0x000000;
const KEY_FEEDBACK_MS = 300;
export class GameLevelKite extends Container {
  public static assetBundles = ['game-level', 'game-level-kite'];
  private background: Sprite;

  private screenWidth: number = 0; // reset on first resize call
  private screenHeight: number = 0;

  private gustContainer: Container;
  private gust: Sprite;
  private currentWord: string;
  private wordPool: string[];
  private wordHTML: HTMLText;
  private wordStyle: HTMLTextStyle = createTypingWordStyle(FONT_SIZE, FONT_COLOR);

  private keyboard: KeyboardLayout;
  private feedbackTimeouts: number[] = [];
  private activeLetterIdx: number = 0;
  private activeWordIdx: number = 0;

  constructor() {
    super();

    this.background = new Sprite({
      texture: Texture.from('game-levels/game-level-kite/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });
    this.gust = new Sprite();
    this.gustContainer = new Container();
    this.updateGustTextureByState('happy');
    this.keyboard = new KeyboardLayout();

    this.wordPool = WORDS;
    this.wordPool.sort(() => Math.random() - 0.5);
    this.currentWord = this.wordPool[this.activeWordIdx];
    this.wordHTML = new HTMLText({
      text: this.currentWord,
      style: this.wordStyle,
    });
    this.renderWord();
    this.wordHTML.anchor.set(0.5);
    this.gust.anchor.set(0.5);
    this.gustContainer.addChild(this.gust, this.wordHTML);

    this.addChild(this.background, this.gustContainer, this.keyboard);
  }
  resize(width: number, height: number) {
    this.layout = { width, height };
    this.screenHeight = height;
    this.screenWidth = width;
    this.gustContainer.position.set(this.screenWidth / 2, this.screenHeight / 4);
    this.keyboard.resize(width, height);
  }
  async show() {
    window.addEventListener('keydown', this.handleKeyDown);
    this.keyboard.playEnterAnimation();
  }
  async hide() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.clearFeedbackTimeouts();
    this.keyboard.playExitAnimation();
  }

  private updateGustTextureByState(state: 'happy' | 'default' | 'grey') {
    this.gust.texture = Texture.from(`game-levels/game-level-kite/gusts/${state}.png`);
  }
  private renderWord() {
    this.wordHTML.text = getHighlightedWordMarkup(
      this.currentWord,
      this.activeLetterIdx,
      this.currentWord[this.activeLetterIdx].length,
    );
    this.keyboard.setHintedLetter(this.currentWord[this.activeLetterIdx]);
  }
  private advanceLetter() {
    if (++this.activeLetterIdx >= this.currentWord.length) {
      this.activeLetterIdx = 0;
      this.currentWord = this.wordPool[++this.activeWordIdx] ?? this.wordPool[0]; // TODO: set up end game behavior
    }
    this.renderWord();
  }
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || event.key === 'Shift' || event.ctrlKey || event.metaKey || event.altKey)
      return;
    const typed = getMappedFromKeyboardEvent(event);
    if (!typed) return;
    if (typed === this.currentWord[this.activeLetterIdx]) {
      useSessionStore.getState().recordCorrect();
      this.keyboard.setKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      this.pushTimeout(() => this.keyboard.clearKeyFeedback(event.code), KEY_FEEDBACK_MS);
      this.advanceLetter();
    } else {
      useSessionStore.getState().recordMistake();
      this.keyboard.setKeyFeedback(event.code, 'error');
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      this.pushTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        this.keyboard.setHintedLetter(this.currentWord[this.activeLetterIdx]);
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
