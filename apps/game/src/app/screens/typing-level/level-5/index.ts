import { animate } from 'motion';
import { Container, HTMLText, HTMLTextStyle, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import {
  createTypingWordStyle,
  getAdvancedWordMarkup,
  getHighlightedWordMarkup,
} from '../../../../utils/example-words';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getLevelType, type TLevel } from '../../level-map/units';
import { generateRoundsDictionary, type Round } from '../level-4';

const FONT_SIZE = 100;
const PAD_Y = 75;
const PAD_X = 100;
const CONTENT_GAP = 78;
const IMAGE_SIZE = 225;
const FEEDBACK_DURATION_MS = 350;
const CARD_COLORS = {
  default: 0xffffff,
  error: 0xff3131,
  success: 0x8ec24d,
};

function randomTouristTexture() {
  return Texture.from(`typing-levels/typing-level-5/tourist-${Math.ceil(Math.random() * 2)}.png`);
}

export class TypingMarketScreen extends Container {
  public static assetBundles = ['typing-level', 'typing-level-5', 'education-letter-images'];
  public static helpAssets = [
    'tutorial-popups/typing-level-5-1.png',
    'tutorial-popups/typing-level-5-2.png',
  ];

  private background: Sprite;
  private tourist: Sprite;
  private hud: HUD;
  private keyboard: KeyboardLayout;
  private wordStyle: HTMLTextStyle = createTypingWordStyle(FONT_SIZE, 0x6b411e);
  private card: Sprite;
  private wordContainer: Container = new Container();
  private wordText: HTMLText;
  private contentContainer: Container;
  private rounds: Round[];
  private currentRound?: Round;
  private _cardW: number = 0;
  private _sw: number = 0;
  private _sh: number = 0;
  private paused: boolean;
  private level: TLevel;

  constructor(level: TLevel) {
    const mapUnit = findMapUnitForLevel(level);
    super();
    this.level = level;

    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level-5/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });

    this.tourist = new Sprite({
      texture: randomTouristTexture(),
      layout: { position: 'absolute', left: '5%', bottom: '5%' },
    });
    this.tourist.anchor.set(0.5);

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: getLevelType(level),
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    this.keyboard = new KeyboardLayout();
    this.rounds = generateRoundsDictionary();

    this.card = new Sprite({
      texture: Texture.from('typing-levels/typing-level-5/card-background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });
    this.wordText = new HTMLText({ style: this.wordStyle });
    this.wordStyle.align = 'right';
    this.wordStyle.tagStyles = {
      ...this.wordStyle.tagStyles,
      active: { fill: 0xd4a017 },
    };
    this.wordContainer.addChild(this.wordText);

    this.contentContainer = new Container({
      layout: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: PAD_Y,
        paddingBottom: PAD_Y,
        paddingLeft: PAD_X,
        paddingRight: PAD_X,
      },
    });

    this.addChild(this.background, this.tourist, this.hud, this.keyboard, this.contentContainer);
    void this.popAndStartRound();
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
  }

  /** ===== COMPONENT RENDERING HELPERS ===== */

  private drawCard(): Promise<void> {
    return new Promise((resolve) => {
      const attempt = () => {
        const b = this.wordText.getLocalBounds();
        if (b.width === 0) {
          requestAnimationFrame(attempt);
          return;
        }
        const textH = FONT_SIZE + PAD_Y * 2;
        this.wordText.anchor.set(0.5);
        this.wordText.position.set(b.width / 2, textH / 2);
        this.wordContainer.layout = {
          width: b.width,
          height: textH,
          flexShrink: 0,
          marginTop: -38,
        };
        this._cardW = PAD_X * 2 + IMAGE_SIZE + CONTENT_GAP + b.width;
        this.centerContent();
        resolve();
      };
      attempt();
    });
  }

  private centerContent() {
    this.contentContainer.layout = {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      gap: CONTENT_GAP,
      paddingTop: PAD_Y,
      paddingBottom: PAD_Y,
      paddingLeft: PAD_X,
      paddingRight: PAD_X,
      width: this._cardW,
      left: (this._sw - this._cardW) / 2,
      top: this._sh * 0.15,
    };
  }

  private async updateContentContainer(
    image: Sprite,
    word: string,
    activeLetterIdx: number,
  ): Promise<void> {
    this.contentContainer.removeChildren();
    image.layout = { width: IMAGE_SIZE, height: IMAGE_SIZE, flexShrink: 0, marginTop: -20 };
    const len = word[activeLetterIdx].length;
    this.wordText.text = getHighlightedWordMarkup(word, activeLetterIdx, len);
    this.contentContainer.addChild(this.card, image, this.wordContainer);
    await this.drawCard();
  }

  private popAndStartRound(): Promise<void> {
    this.card.tint = CARD_COLORS['default'];
    if (this.rounds.length === 0) this.endGame();
    this.currentRound = this.rounds.pop() ?? undefined;
    if (!this.currentRound) return Promise.resolve();
    const { letter, word, activeLetterIdx } = this.currentRound;
    const image = new Sprite(
      Texture.from(`education-levels/education-letter-images/${letter}.png`),
    );
    return this.updateContentContainer(image, word, activeLetterIdx);
  }

  /** ===== GAME LOGIC ===== */

  private readonly handleKeyDown = async (event: KeyboardEvent) => {
    if (
      this.paused ||
      event.repeat ||
      event.key === 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !this.currentRound
    )
      return;
    const typedLetter = getMappedFromKeyboardEvent(event);
    if (!typedLetter) return;

    const { word, activeLetterIdx } = this.currentRound;
    console.log(event.key);
    if (typedLetter === word[activeLetterIdx]) {
      this.keyboard.setKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      setTimeout(() => this.keyboard.clearKeyFeedback(event.code), FEEDBACK_DURATION_MS);
      useSessionStore.getState().recordCorrect();
      await this.advanceHighlightedLetter();
    } else {
      this.keyboard.setKeyFeedback(event.code, 'error');
      //   this.card.tint = CARD_COLORS.error;
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      setTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        // this.card.tint = CARD_COLORS.default;
      }, FEEDBACK_DURATION_MS);
      useSessionStore.getState().recordMistake();
    }
  };

  private advanceHighlightedLetter = async () => {
    const r = this.currentRound!;
    r.activeLetterIdx += r.word[r.activeLetterIdx].length;

    if (r.activeLetterIdx >= r.word.length) {
      await this.playSuccessFlash();
      this.tourist.texture = randomTouristTexture();
      await this.popAndStartRound();
    } else {
      this.wordText.text = getAdvancedWordMarkup(
        r.word,
        r.activeLetterIdx,
        r.word[r.activeLetterIdx].length,
      );
    }
  };

  private async playSuccessFlash(): Promise<void> {
    this.card.tint = CARD_COLORS.success;
    const controls = animate(
      this.contentContainer.scale,
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
