import { sound } from '@pixi/sound';
import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Assets, Container, Graphics, HTMLText, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import {
  createExampleWordStyle,
  EXAMPLE_WORDS,
  getCompletedWordMarkup,
} from '../../../../utils/example-words';
import { SoundButton } from '../../../ui/sound-button';
import { MissingWordNotice } from './missing-word-notice';

const COLORS = {
  BACKGROUND: 0xe8eef8,
} as const;

const WORD_STYLE = createExampleWordStyle(180);

export class LetterPopup extends Container {
  public static assetBundles = ['education-tutorial', 'education-letter-images'];
  private isPlaying: boolean = false;
  private letter: string;
  private exampleWord: string | undefined;
  private wordText?: HTMLText;
  private exampleImage?: Sprite;
  private background: Graphics;
  private closeButton: FancyButton;
  private soundButton: SoundButton;

  constructor(letter: string) {
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    this.letter = letter;
    this.exampleWord = EXAMPLE_WORDS.get(letter);

    this.background = new Graphics();
    this.background.layout = { position: 'absolute', width: '100%', height: '100%' };

    this.closeButton = this.createCloseButton();
    this.soundButton = new SoundButton({
      onClick: () => {
        void this.playSound(this.getSoundAlias());
      },
      size: 300,
      variant: 'large',
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', bottom: '25%', left: '50%' };

    this.addChild(this.background, this.closeButton, this.soundButton);

    if (this.exampleWord) {
      this.wordText = new HTMLText({
        text: getCompletedWordMarkup(this.letter, this.exampleWord),
        style: WORD_STYLE,
        anchor: 0.5,
        layout: { position: 'absolute', left: '20%', top: '25%' },
      });
      this.exampleImage = new Sprite({
        texture: Texture.from(`education-levels/education-letter-images/${this.letter}.png`),
        anchor: 0.5,
        scale: 0.8,
        layout: { position: 'absolute', left: '65%', top: '20%' },
      });

      this.addChild(this.wordText, this.exampleImage);
    } else {
      this.removeChild(this.soundButton);
      this.addChild(new MissingWordNotice());
    }
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.clear().rect(0, 0, width, height).fill(COLORS.BACKGROUND);
  }

  private getSoundAlias(): string {
    const wordsAlias = `education-levels/education-words-audio/${this.letter}.mp3`;
    if (Assets.resolver.hasKey(wordsAlias)) return wordsAlias;

    return `education-levels/education-letters-audio/${this.letter}.mp3`;
  }

  async show() {
    this.y = screen.height + 10;
    await animate(this.position, { y: 0 }, { duration: 0.6, ease: 'easeOut' });
    void this.playSound(this.getSoundAlias());
  }

  async hide() {
    await animate(this.position, { y: screen.height + 10 }, { duration: 0.4, ease: 'easeOut' });
  }

  private createCloseButton(): FancyButton {
    const button = new FancyButton({
      defaultView: 'education-levels/education-tutorial/x.svg',
      animations: {
        hover: { props: { scale: { x: 1.03, y: 1.03 } }, duration: 100 },
        pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
      },
    });
    button.anchor.set(0.5);
    button.layout = { position: 'absolute', top: '10%', left: '5%' };
    button.onPress.connect(() => {
      engine().audio.sfx.stop(this.getSoundAlias());
      void engine().navigation.hidePopup();
    });
    return button;
  }

  // spam safe playSound method
  private async playSound(alias: string) {
    if (this.isPlaying) return;
    if (!Assets.resolver.hasKey(alias)) return;

    this.isPlaying = true;
    const duration = sound.find(alias)?.duration ?? 0;
    void engine().audio.sfx.play(alias);

    // Re-enable after the sound's own duration
    setTimeout(() => {
      this.isPlaying = false;
    }, duration * 1000);
  }
}
