import { animate } from 'motion';
import { Container, HTMLText, HTMLTextStyle, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { responsive } from '../../../../engine/utils/viewport';
import {
  createTypingWordStyle,
  getAdvancedWordMarkup,
  getHighlightedWordMarkup,
} from '../../../../utils/example-words';
import { getTypedText } from '../../../../utils/keymap';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { getWordImageAlias, levelWordAssets } from '../../../../zustandStores/wordStore';
import type { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel } from '../../level-map/units';
import { generateWordRounds, playRoundAudio, type WordRound } from '../word-rounds';

/** The card's sizes for this screen; reads the window, so call it on each layout. */
function cardSizes() {
  return {
    fontSize: responsive({ sm: 76, lg: 100 }),
    padY: responsive({ sm: 50, lg: 75 }),
    padX: responsive({ sm: 44, lg: 100 }),
    gap: responsive({ sm: 28, lg: 78 }),
    imageSize: responsive({ sm: 170, lg: 225 }),
  };
}
/** The word sits this much higher than the card's centre line, and the picture a little too. */
const WORD_RAISE = 38;
const IMAGE_RAISE = 20;
/** The card's top, as a share of the screen height. */
const CARD_TOP = 0.15;
/** Frames to wait for the word's HTML text to measure before laying the card out anyway. */
const MAX_MEASURE_FRAMES = 60;
const CARD_COLORS = {
  default: 0xffffff,
  success: 0x8ec24d,
};

function randomTouristTexture() {
  return Texture.from(
    `typing-levels/typing-level-market/tourist-${Math.ceil(Math.random() * 2)}.png`,
  );
}

export class TypingMarketScreen extends Container {
  public readonly screenName = 'TypingMarketScreen';
  public static assetBundles = ['typing-level-market', 'ui'];
  public static assets = levelWordAssets('image', 'standardAudio');
  public static loadingBackgroundAsset = 'typing-levels/typing-level-market/splash.png';
  public static helpAssets = [
    'tutorial-popups/typing-level-market-1.png',
    'tutorial-popups/typing-level-market-2.png',
  ];

  private background: Sprite;
  private tourist: Sprite;
  private hud: HUD;
  private keyboard: KeyboardLayout;
  private wordStyle: HTMLTextStyle = createTypingWordStyle(cardSizes().fontSize, 0x6b411e);
  private card: Sprite;
  private wordContainer: Container = new Container();
  private wordText: HTMLText;
  private image?: Sprite;
  private contentContainer: Container;
  private readonly rounds: WordRound[];
  private currentRound?: WordRound;
  private cardWidth = 0;
  private viewWidth = 0;
  private viewHeight = 0;
  private paused = false;
  /** A finished word is flashing; keys wait for the next one. */
  private resolving = false;
  private readonly level: TLevel;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-market');
    super();
    this.level = typedLevel;

    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level-market/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });

    this.tourist = new Sprite({
      texture: randomTouristTexture(),
      layout: { position: 'absolute', left: '5%', bottom: '5%' },
    });
    this.tourist.anchor.set(0.5);

    this.hud = createLevelHud(typedLevel);

    this.keyboard = new KeyboardLayout({ text: 'words' });
    this.rounds = generateWordRounds(typedLevel.props.wordIds, typedLevel.props.roundCount);

    this.card = new Sprite({
      texture: Texture.from('typing-levels/typing-level-market/card-background.png'),
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
      layout: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
    });

    this.addChild(this.background, this.tourist, this.hud, this.keyboard, this.contentContainer);
  }

  resize(width: number, height: number) {
    this.viewWidth = width;
    this.viewHeight = height;
    this.layout = { width, height };
    this.background.layout = { width, height };
    this.keyboard.resize(width, height);
    this.wordStyle.fontSize = cardSizes().fontSize;
    void this.drawCard();
  }

  async show() {
    // The first round starts here, so an empty word list ends the level once it is up.
    void this.popAndStartRound();
    if (!this.currentRound) return;
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
    if (!this.currentRound) return;
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    this.hintCurrentLetter();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
  }

  /**
   * Fit the card around its picture and word. The word is HTML text, which only measures once
   * rendered, so this waits a few frames for it; it gives up once the screen has gone.
   */
  private drawCard(): Promise<void> {
    return new Promise((resolve) => {
      let frames = 0;
      const attempt = () => {
        if (this.destroyed || this.viewWidth === 0) {
          resolve();
          return;
        }
        const b = this.wordText.getLocalBounds();
        if (b.width === 0 && frames < MAX_MEASURE_FRAMES && this.wordText.text) {
          frames += 1;
          requestAnimationFrame(attempt);
          return;
        }
        const { fontSize, padY, padX, gap, imageSize } = cardSizes();
        const textH = fontSize + padY * 2;
        this.wordText.anchor.set(0.5);
        this.wordText.position.set(b.width / 2, textH / 2);
        this.wordContainer.layout = {
          width: b.width,
          height: textH,
          flexShrink: 0,
          marginTop: -WORD_RAISE,
        };
        if (this.image) {
          this.image.layout = {
            width: imageSize,
            height: imageSize,
            flexShrink: 0,
            marginTop: -IMAGE_RAISE,
          };
        }
        this.cardWidth = padX * 2 + (this.image ? imageSize + gap : 0) + b.width;
        this.contentContainer.layout = {
          gap,
          paddingTop: padY,
          paddingBottom: padY,
          paddingLeft: padX,
          paddingRight: padX,
          width: this.cardWidth,
          left: (this.viewWidth - this.cardWidth) / 2,
          top: this.viewHeight * CARD_TOP,
        };
        resolve();
      };
      attempt();
    });
  }

  private hintCurrentLetter() {
    const round = this.currentRound;
    this.keyboard.setHintedLetter(
      round?.word[round.activeLetterIdx],
      round?.word[round.activeLetterIdx + 1],
    );
  }

  /** Bring up the next word with its picture, or end the level after the last. */
  private popAndStartRound(): Promise<void> {
    this.card.tint = CARD_COLORS.default;
    this.currentRound = this.rounds.pop();
    if (!this.currentRound) {
      this.endGame();
      return Promise.resolve();
    }
    const { wordId, word, activeLetterIdx, hasImage } = this.currentRound;

    // The previous word's picture goes for good, not just off the card.
    this.image?.destroy();
    this.image = hasImage ? new Sprite(Texture.from(getWordImageAlias(wordId))) : undefined;
    this.contentContainer.removeChildren();
    this.contentContainer.addChild(
      this.card,
      ...(this.image ? [this.image] : []),
      this.wordContainer,
    );
    this.wordText.text = getHighlightedWordMarkup(word, activeLetterIdx, 1);

    this.keyboard.setWordStart(true);
    this.hintCurrentLetter();
    playRoundAudio(this.currentRound);
    return this.drawCard();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    const round = this.currentRound;
    // Keys during the success flash would be checked against the finished word.
    if (this.paused || this.resolving || !round) return;
    const typedLetter = getTypedText(event);
    if (!typedLetter) return;

    if (typedLetter === round.word[round.activeLetterIdx]) {
      this.keyboard.flashKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      useSessionStore.getState().recordCorrect();
      void this.advanceHighlightedLetter(round);
    } else {
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      this.keyboard.flashKeyFeedback(event.code, 'error', {
        onCleared: () => this.hintCurrentLetter(),
      });
      useSessionStore.getState().recordMistake();
    }
  };

  private async advanceHighlightedLetter(round: WordRound) {
    round.activeLetterIdx += 1;

    if (round.activeLetterIdx < round.word.length) {
      this.wordText.text = getAdvancedWordMarkup(round.word, round.activeLetterIdx, 1);
      this.hintCurrentLetter();
      return;
    }

    this.resolving = true;
    await this.playSuccessFlash();
    if (this.destroyed) return;
    this.tourist.texture = randomTouristTexture();
    await this.popAndStartRound();
    this.resolving = false;
  }

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
    finishLevel(this, this.level);
  }
}
