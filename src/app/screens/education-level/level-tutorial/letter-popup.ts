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

const COLORS = {
  BACKGROUND: 0xe8eef8,
  TEXT_BASE: 0x1b427a,
  TEXT_HIGHLIGHT: 0x86bd65,
} as const;

const BASE_WORD_STYLE = new TextStyle({
  fontSize: 128,
  fill: COLORS.TEXT_BASE,
  fontFamily: 'Noto Naskh Arabic Bold',
  padding: 40,
});

const HIGHLIGHTED_WORD_STYLE = new TextStyle({
  fontSize: BASE_WORD_STYLE.fontSize,
  fontFamily: BASE_WORD_STYLE.fontFamily,
  fill: COLORS.TEXT_HIGHLIGHT,
  padding: BASE_WORD_STYLE.padding,
});

export class LetterPopup extends Container {
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

    this.closeButton = this.createCloseButton();
    this.soundButton = new SoundButton({ onClick: () => {}, size: 250 });
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
    const texture = Texture.from(`education-tutorial/letter-items/${this.letter}.png`);
    console.log(texture.width, texture.height);
    const image = new Sprite({ texture });
    image.scale = Math.min(500 / texture.width, 450 / texture.height);
    image.anchor.set(0.5);
    image.layout = { position: 'absolute', left: '65%', top: '25%' };
    return image;
  }

  private buildWordContainer(word: string): Container {
    const group = new Container();

    const base = new Text({ text: word, style: BASE_WORD_STYLE });
    group.addChild(base);

    const highlight = new Text({ text: word, style: HIGHLIGHTED_WORD_STYLE });
    group.addChild(highlight);

    // Measure the visual width of the first cluster as it appears in context.
    const clusterWidth = this.measureClusterWidth(this.letter, BASE_WORD_STYLE);

    const mask = new Graphics()
      .rect(base.width - clusterWidth, 0, clusterWidth, base.height)
      .fill(0xffffff);
    group.addChild(mask);
    highlight.mask = mask;

    group.layout = { position: 'absolute', left: '25%', top: '35%' };
    group.pivot.set(base.width / 2, base.height / 2);

    return group;
  }

  private measureClusterWidth(cluster: string, style: TextStyle): number {
    // Trailing ZWJ forces the cluster to shape in initial form,
    // matching how it appears at the start of an RTL word.
    const ZWJ = '‍';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    // Build a font string that matches the TextStyle.
    ctx.font = `${style.fontSize}px "${style.fontFamily.toString()}"`;
    ctx.direction = 'rtl';

    return ctx.measureText(cluster + ZWJ).width;
  }
}
