import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, HTMLText, HTMLTextStyle, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { SoundButton } from '../../../ui/sound-button';
import { MissingWordNotice } from './missing-word-notice';

const exampleWords = new Map<string, string>([
  ['خ', 'خوراز'],
  ['چ', 'چاينەك'],
  ['ج', 'جان'],
  ['ت', 'تاۋۇز '],
  ['پ', 'پاراخوت '],
  ['ب', 'بولقا'],
  ['ئە', 'ئەينەك'],
  ['ئا', 'ئايروپىلان'],
  ['ف', 'فونتان'],
  ['غ', 'غاز'],
  ['ش', 'شام'],
  ['س', 'سائەت'],
  ['ژ', 'ژۇرنال'],
  ['ز', 'زەنجىر'],
  ['ر', 'رادىئو'],
  ['د', 'دەزمال'],
  ['ھ', 'ھھارۋا'],
  ['ن', 'نان'],
  ['م', 'ماشىنا'],
  ['ل', 'لەگەن'],
  ['ڭ', 'ڭوز'],
  ['گ', 'گىلەم'],
  ['ك', 'كۆلەيكە'],
  ['ق', 'قوغۇن'],
  ['ي', 'يەلپۈگۈچ'],
  ['ئى', 'ئىت'],
  ['ئې', 'ئېيىق'],
]);

const COLORS = {
  BACKGROUND: 0xe8eef8,
  TEXT_BASE: 0x1b427a,
  TEXT_HIGHLIGHT: 0x86bd65,
} as const;

const WORD_STYLE = new HTMLTextStyle({
  fontSize: 180,
  fill: COLORS.TEXT_BASE,
  fontFamily: 'Noto Naskh Arabic Bold',
  padding: 40,
  cssOverrides: ['direction: rtl'],
  tagStyles: {
    span: {
      fill: COLORS.TEXT_HIGHLIGHT,
    },
  },
});

export class LetterPopup extends Container {
  public static assetBundles = ['education-tutorial', 'education-letter-images'];

  private letter: string;
  private exampleWord: string | undefined;
  private background: Graphics;
  private closeButton: FancyButton;
  private soundButton: SoundButton;

  constructor(letter: string) {
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    this.letter = letter;
    this.exampleWord = exampleWords.get(letter);

    this.background = new Graphics();
    this.background.layout = { position: 'absolute', width: '100%', height: '100%' };

    this.closeButton = this.createCloseButton();
    this.soundButton = new SoundButton({ onClick: () => {}, size: 300 });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', bottom: '25%', left: '50%' };

    this.addChild(this.background, this.closeButton, this.soundButton);

    if (this.exampleWord) {
      this.addChild(this.buildWordContainer(this.exampleWord), this.createExampleImage());
    } else {
      this.removeChild(this.soundButton);
      this.addChild(new MissingWordNotice());
    }
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.clear().rect(0, 0, width, height).fill(COLORS.BACKGROUND);
  }

  async show() {
    this.y = screen.height + 10;
    await animate(this.position, { y: 0 }, { duration: 0.6, ease: 'easeOut' });
  }

  async hide() {
    await animate(this.position, { y: screen.height + 10 }, { duration: 0.4, ease: 'easeOut' });
  }

  private createCloseButton(): FancyButton {
    const button = new FancyButton({
      defaultView: 'education-tutorial/x.svg',
      animations: {
        hover: { props: { scale: { x: 1.03, y: 1.03 } }, duration: 100 },
        pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
      },
    });
    button.anchor.set(0.5);
    button.layout = { position: 'absolute', top: '10%', left: '5%' };
    button.onPress.connect(() => engine().navigation.hidePopup());
    return button;
  }

  private createExampleImage(): Sprite {
    const texture = Texture.from(`education-letter-images/${this.letter}.png`);
    if (!texture) return new Sprite();
    const image = new Sprite({ texture });
    image.scale = Math.min(400 / texture.width, 400 / texture.height);
    image.anchor.set(0.5);
    image.layout = { position: 'absolute', left: '65%', top: '20%' };
    return image;
  }

  private buildWordContainer(word: string): HTMLText {
    return new HTMLText({
      text: `<span>${this.letter}</span>${word.slice(this.letter.length)}`,
      style: WORD_STYLE,
      anchor: 0.5,
      layout: { position: 'absolute', left: '20%', top: '25%' },
    });
  }
}
