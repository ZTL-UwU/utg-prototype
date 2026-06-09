import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, TextStyle, Text, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { SoundButton } from '../../../ui/sound-button';
import { MissingWordNotice } from './missing-word-notice';

const examples = new Map<string, string>([
  ['ئا', 'ئايروپىلان'],
  ['ئە', 'ئەينەك'],
]);

const BASE_WORD_STYLE = new TextStyle({
  fontSize: 128,
  fill: 0x1b427a,
  fontFamily: 'Noto Naskh Arabic Bold',
});
const HIGHLIGHTED_WORD_STYLE = new TextStyle({
  fontSize: BASE_WORD_STYLE.fontSize,
  fontFamily: BASE_WORD_STYLE.fontFamily,
  fill: 0x86bd65,
});

export class LetterPopup extends Container {
  /**
   *
   */
  public static assetBundles = ['education-tutorial'];

  private letter: string;
  private exampleWord: string | undefined;
  private background: Graphics;
  private closeButton: FancyButton;
  private soundButton: SoundButton;
  constructor(letter: string) {
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    this.letter = letter;
    this.exampleWord = examples.get(letter);
    this.background = new Graphics();
    this.background.layout = { position: 'absolute', width: '100%', height: '100%' };

    this.closeButton = new FancyButton({
      defaultView: 'education-tutorial/x.svg',
      animations: {
        hover: {
          props: { scale: { x: 1.03, y: 1.03 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
    });
    this.closeButton.anchor.set(0.5);
    this.closeButton.layout = { position: 'absolute', top: '10%', left: '5%' };
    this.closeButton.onPress.connect(() => engine().navigation.hidePopup());
    this.soundButton = new SoundButton({ onClick: () => {}, size: 250 });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', bottom: '25%', left: '50%' };
    this.addChild(this.background, this.closeButton, this.soundButton);

    if (this.exampleWord) {
      // WORD + IMAGE RENDER LOGIC
      console.log('word exists');
      const wordContainer = this.returnWordContainer(this.exampleWord);
      const exampleImage: Sprite = new Sprite(
        Texture.from(`education-tutorial/letter-items/${this.letter}.svg`),
      );
      exampleImage.anchor.set(0.5);
      exampleImage.layout = { position: 'absolute', left: '65%', top: '25%' };
      this.addChild(wordContainer, exampleImage);
    } else {
      this.removeChild(this.soundButton);
      const notice = new MissingWordNotice();
      this.addChild(notice);
    }
  }
  resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.clear().rect(0, 0, width, height).fill(0xe8eef8);
  }
  async show() {
    this.y = screen.height + 10;
    await animate(this.position, { y: 0 }, { duration: 0.8, ease: 'easeIn' });
  }
  async hide() {
    await animate(this.position, { y: screen.height + 10 }, { duration: 0.8, ease: 'easeOut' });
  }

  private returnWordContainer(word: string) {
    const baseStyle = BASE_WORD_STYLE;
    const group = new Container();

    // Layer 1: full word, base color — this is the layer that preserves shaping.
    const base = new Text({ text: word, style: BASE_WORD_STYLE });
    group.addChild(base);

    // Layer 2: full word, highlight color, stacked exactly on top.
    const hl = new Text({ text: word, style: HIGHLIGHTED_WORD_STYLE });
    group.addChild(hl);

    // Measure the visual width of the first cluster as it appears in context.
    const clusterWidth = this.measureClusterWidth(this.letter, baseStyle);

    // Mask: rectangle on the RIGHT edge of the bounding box (RTL start).
    // Only the highlight layer is masked — base layer shows through everywhere else.
    const mask = new Graphics()
      .rect(base.width - clusterWidth, 0, clusterWidth, base.height)
      .fill(0xffffff);
    group.addChild(mask);
    hl.mask = mask;

    // Center the group within the popup using layout
    group.layout = { position: 'absolute', left: '25%', top: '35%' };
    group.pivot.set(base.width / 2, base.height / 2);

    return group;
  }

  private measureClusterWidth(cluster: string, style: TextStyle): number {
    // Trailing ZWJ forces the cluster to shape in initial form,
    // matching how it appears at the start of an RTL word.
    const ZWJ = '\u200D';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    // Build a font string that matches the TextStyle. Include weight if your
    // font name doesn't already encode it (yours does — "Noto Naskh Arabic Bold").
    ctx.font = `${style.fontSize}px "${style.fontFamily}"`;
    ctx.direction = 'rtl';

    return ctx.measureText(cluster + ZWJ).width;
  }
}
