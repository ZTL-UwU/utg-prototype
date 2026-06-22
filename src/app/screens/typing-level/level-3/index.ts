import { Container, Graphics, HTMLText, HTMLTextStyle, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { createTypingWordStyle, getPlayableWords } from '../../../../utils/example-words';
import { QuitPopup } from '../../../popups/quit';
import { TutorialPopup } from '../../../popups/tutorial';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { LevelMapScreen } from '../../level-map';
import type { TMapUnit } from '../../level-map/units';

const FONT_SIZE = 100;
const NUM_ROUNDS = 5;
const CARD_WIDTH = 200;
const PAD_Y = 32;
const PAD_X = 48;
const SHADOW_OFFSET = 8;
const CONTENT_GAP = 72;
const IMAGE_SIZE = 300;
const CARD_COLORS = {
  default: 0x6080ab,
  error: 0xff3131,
  success: 0x8ec24d,
};

type Round = {
  letter: string;
  word: string;
  letterIdx: number;
};
function generateRoundsDictionary(): Round[] {
  return getPlayableWords()
    .sort(() => Math.random() - 0.5)
    .slice(0, NUM_ROUNDS)
    .map(([letter, word]) => ({ letter, word, letterIdx: 0 }));
}

export class TypingWordScreen extends Container {
  public static assetBundles = ['typing-level-3', 'typing-level', 'education-letter-images'];
  private background: Sprite;
  private hud: HUD;
  private wordStyle: HTMLTextStyle = createTypingWordStyle(FONT_SIZE);
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

  constructor(mapUnit: TMapUnit) {
    super();
    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level/background-tangri-tah.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: mapUnit.type,
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      onHelp: () =>
        void engine().navigation.showPopup(TutorialPopup, {
          asset: 'tutorial-popups/typing-tutorial.png',
          backdropColor: 0x7d5600,
          exitable: true,
        }),
    });
    this.keyboard = new KeyboardLayout();
    this.rounds = generateRoundsDictionary();

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
  }

  resize(width: number, height: number) {
    this._sw = width;
    this._sh = height;
    this.layout = { width, height };
    this.background.layout = { width, height };
    this.keyboard.resize(width, height);
    this.contentContainer.position.set((width - this.contentContainer.width) / 2, height * 0.15);
  }

  async show() {
    void this.keyboard.resume();
    await this.keyboard.playEnterAnimation();
  }

  async hide() {
    void this.keyboard.pause();
    await this.keyboard.playExitAnimation();
  }

  /**===== GAME LOGIC HELPERS ======= */

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
    this.contentContainer.position.set((this._sw - groupW) / 2, this._sh * 0.15);
  }

  private updateContentContainer(image: Sprite, word: string) {
    this.contentContainer.removeChildren();
    image.layout = { width: IMAGE_SIZE, height: IMAGE_SIZE, flexShrink: 0 };
    this.wordText.text = word;
    this.contentContainer.addChild(image, this.wordContainer);
    this.drawCard();
  }

  // pops the next round from this.rounds and assigns it to currentRound, calls endRound if rounds is empty
  private popAndStartRound() {
    if (this.rounds.length === 0) this.endGame();
    this.currentRound = this.rounds.pop() ?? undefined;
    if (!this.currentRound) return;
    const { letter, word } = this.currentRound!;
    const image: Sprite = new Sprite(
      Texture.from(`education-levels/education-letter-images/${letter}.png`),
    );
    this.updateContentContainer(image, word);
  }
  private endGame() {}
}
