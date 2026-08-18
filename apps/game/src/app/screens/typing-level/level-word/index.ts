import { animate } from 'motion';
import { Container, Graphics, HTMLText, HTMLTextStyle, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { createTypingWordStyle, getHighlightedWordMarkup } from '../../../../utils/example-words';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { convertToCurrentScript } from '../../../../utils/script';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import {
  getWordImageAlias,
  REMOTE_WORDS_BUNDLE,
  resolveWordsByIds,
} from '../../../../zustandStores/wordStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getTypedLevel, type TLevel } from '../../level-map/units';

const FONT_SIZE = 100;
const CARD_WIDTH = 200;
const PAD_Y = 32;
const PAD_X = 48;
const SHADOW_OFFSET = 8;
const CONTENT_GAP = 72;
const IMAGE_SIZE = 300;
const FEEDBACK_DURATION_MS = 350;
const CARD_COLORS = {
  default: 0x7e5433,
  error: 0xef5a42,
  success: 0x8ec24d,
};

export type Round = {
  wordId: number;
  word: string;
  activeLetterIdx: number;
};

/**
 *
 * Round[] to test particular edge cases in dev - uncomment and register in ctor when testing
 *
 */
// const DEV_TEST_ROUNDS: Round[] = [
//   { wordId: 1, word: 'ئايروپىلان', activeLetterIdx: 0 },
//   { wordId: 2, word: 'تاۋۇز', activeLetterIdx: 0 },
// ];
export function generateRoundsDictionary(wordIds: number[] = [], roundCount = 5): Round[] {
  const pool = resolveWordsByIds(wordIds)
    .filter((word) => word.image_url)
    .map((word) => ({
      wordId: word.id,
      word: convertToCurrentScript(word.word.trim()),
      activeLetterIdx: 0,
    }));

  return [...pool].sort(() => Math.random() - 0.5).slice(0, roundCount);
}

export class TypingWordScreen extends Container {
  public static assetBundles = ['typing-level-word', REMOTE_WORDS_BUNDLE];
  public static splashBackgroundAsset = 'typing-levels/typing-level-word/background.png';
  public static helpAssets = ['tutorial-popups/typing-tutorial.png'];
  private background: Sprite;
  private hud: HUD;
  private wordStyle: HTMLTextStyle = createTypingWordStyle(FONT_SIZE, 0xffffff);
  private contentContainer: Container;
  private card: Graphics;
  private cardShadow: Graphics;
  private wordContainer: Container;
  private wordText: HTMLText;
  private keyboard: KeyboardLayout;
  private rounds: Round[];
  private currentRound?: Round;
  private _cardW: number = CARD_WIDTH;
  private _sw: number = 0;
  private _sh: number = 0;
  private paused: boolean;
  private level: TLevel;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-word');
    const mapUnit = findMapUnitForLevel(typedLevel);
    super();
    this.level = typedLevel;
    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level-word/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          mascot: typedLevel.mascot,
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });
    this.keyboard = new KeyboardLayout();
    this.rounds = generateRoundsDictionary(typedLevel.props.wordIds, typedLevel.props.roundCount);
    // this.rounds = DEV_TEST_ROUNDS; // uncomment to assign rounds to selected test set
    this.card = new Graphics();
    this.cardShadow = new Graphics();
    this.wordText = new HTMLText({ style: this.wordStyle });

    this.wordContainer = new Container();
    this.wordContainer.addChild(this.cardShadow, this.card, this.wordText);

    this.contentContainer = new Container({
      layout: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        gap: CONTENT_GAP,
      },
    });
    this.addChild(this.background, this.hud, this.keyboard, this.contentContainer);
    this.popAndStartRound();
    this.paused = false;
  }

  resize(width: number, height: number) {
    this._sw = width;
    this._sh = height;
    this.layout = { width, height };
    this.background.layout = { width, height };
    this.keyboard.resize(width, height);
    this.centerContent();
  }

  async show() {
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playEnterAnimation();
  }

  async hide() {
    await this.pause();
    await this.keyboard.playExitAnimation();
  }
  async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
  }

  async resume() {
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    this.keyboard.setHintedLetter(this.currentTargetLetter);
  }

  private get currentTargetLetter(): string | undefined {
    if (!this.currentRound) return undefined;
    return this.currentRound.word[this.currentRound.activeLetterIdx];
  }

  /**===== COMPONENT RENDERING HELPERS ======= */

  private drawCard() {
    // measure the rendered word
    const b = this.wordText.getLocalBounds();
    const cardW = Math.max(CARD_WIDTH, b.width + PAD_X * 2); // fit, with a floor
    const cardH = FONT_SIZE + PAD_Y * 2;

    this.cardShadow
      .clear()
      .roundRect(SHADOW_OFFSET, SHADOW_OFFSET, cardW, cardH, 20)
      .fill(0x000000);
    this.cardShadow.alpha = 0.5;

    this.card.clear().roundRect(0, 0, cardW, cardH, 20).fill(0xffffff);
    this.card.tint = CARD_COLORS.default;

    this.wordText.anchor.set(0.5);
    this.wordText.position.set(cardW / 2, cardH / 2);

    this.wordContainer.layout = {
      width: cardW + SHADOW_OFFSET,
      height: cardH + SHADOW_OFFSET,
      flexShrink: 0,
    };
    this._cardW = cardW; // for centering
    this.centerContent();
  }

  private centerContent() {
    const groupW = IMAGE_SIZE + CONTENT_GAP + this._cardW + SHADOW_OFFSET;
    this.contentContainer.layout = {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      gap: CONTENT_GAP,
      left: (this._sw - groupW) / 2,
      top: this._sh * 0.15,
    };
  }

  private updateContentContainer(image: Sprite, word: string, activeLetterIdx: number) {
    this.contentContainer.removeChildren();
    image.layout = { width: IMAGE_SIZE, height: IMAGE_SIZE, flexShrink: 0 };
    const len = word[activeLetterIdx].length;
    this.wordText.text = getHighlightedWordMarkup(word, activeLetterIdx, len);
    this.contentContainer.addChild(image, this.wordContainer);
    this.drawCard();
  }

  // pops the next round from this.rounds and assigns it to currentRound, calls endRound if rounds is empty
  private popAndStartRound() {
    if (this.rounds.length === 0) this.endGame();
    this.currentRound = this.rounds.pop() ?? undefined;
    if (!this.currentRound) return;
    const { wordId, word, activeLetterIdx } = this.currentRound!;
    const image: Sprite = new Sprite(Texture.from(getWordImageAlias(wordId)));
    this.updateContentContainer(image, word, activeLetterIdx); // always highlights first letter, letterIdx for new round always at 0
    this.keyboard.setHintedLetter(this.currentTargetLetter);
  }
  /**
   * ======= GAME LOGIC HELPERS =======
   */

  private readonly handleKeyDown = async (event: KeyboardEvent) => {
    if (
      this.paused ||
      event.repeat ||
      event.key == 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !this.currentRound
    )
      return;

    const typedLetter = getMappedFromKeyboardEvent(event);
    if (!typedLetter) return;

    const { word, activeLetterIdx } = this.currentRound!;
    console.log(event.key);
    if (typedLetter === word[activeLetterIdx]) {
      this.keyboard.setKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      setTimeout(() => this.keyboard.clearKeyFeedback(event.code), FEEDBACK_DURATION_MS);
      useSessionStore.getState().recordCorrect();
      await this.advanceHighlightedLetter();
    } else {
      this.keyboard.setKeyFeedback(event.code, 'error');
      this.card.tint = CARD_COLORS['error'];
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');

      setTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        this.card.tint = CARD_COLORS['default'];
        this.keyboard.setHintedLetter(this.currentTargetLetter);
      }, FEEDBACK_DURATION_MS);
      useSessionStore.getState().recordMistake();
    }
  };

  private advanceHighlightedLetter = async () => {
    const r = this.currentRound!;
    r.activeLetterIdx += r.word[r.activeLetterIdx].length;

    if (r.activeLetterIdx >= r.word.length) {
      await this.playSuccessFlash(); // wait for it to finish
      this.popAndStartRound(); // drawCard resets tint to default here
    } else {
      this.wordText.text = getHighlightedWordMarkup(
        r.word,
        r.activeLetterIdx,
        r.word[r.activeLetterIdx].length,
      );
      this.keyboard.setHintedLetter(this.currentTargetLetter);
    }
  };

  private async playSuccessFlash(): Promise<void> {
    this.card.tint = CARD_COLORS.success;

    const controls = animate(
      this.wordContainer.scale,
      { x: 1.12, y: 1.12 },
      { duration: 0.15, ease: 'easeOut', repeat: 1, repeatType: 'reverse' },
    );
    await controls.finished;
  }

  private endGame() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }
}
