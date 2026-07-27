import { sound } from '@pixi/sound';
import { FancyButton } from '@pixi/ui';
import { EDUCATION_LETTERS, type EducationLetter } from '@utg/letters';
import { animate } from 'motion';
import { Assets, Container, Graphics, HTMLText, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { createExampleWordStyle, getCompletedWordMarkup } from '../../../../utils/example-words';
import {
  getTutorialWordForLetter,
  getWordAudioAlias,
  getWordImageAlias,
  REMOTE_WORDS_BUNDLE,
  type WordSimple,
} from '../../../../zustandStores/wordStore';
import { SoundButton } from '../../../ui/sound-button';
import { MissingWordNotice } from './missing-word-notice';

const COLORS = {
  BACKGROUND: 0xe8eef8,
} as const;

const WORD_STYLE = createExampleWordStyle(180);

function getNextLetter(letter: string): string {
  const index = EDUCATION_LETTERS.indexOf(letter as EducationLetter);
  if (index < 0) return EDUCATION_LETTERS[0]!;
  return EDUCATION_LETTERS[(index + 1) % EDUCATION_LETTERS.length]!;
}

export class LetterPopup extends Container {
  public static assetBundles = [
    'education-tutorial',
    'education-letter-variants',
    'education-letters-audio',
    'ui',
    REMOTE_WORDS_BUNDLE,
  ];
  private isPlaying: boolean = false;
  private letter: string;
  private remoteWord?: WordSimple;
  private exampleWord: string | undefined;
  private wordText?: HTMLText;
  private exampleImage?: Sprite;
  private variantImage: Sprite;
  private background: Graphics;
  private closeButton: FancyButton;
  private nextButton: FancyButton;
  private soundButton: SoundButton;

  constructor(letter: string) {
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    this.letter = letter;

    this.remoteWord = getTutorialWordForLetter(letter);
    this.exampleWord = this.remoteWord?.word.trim();

    this.background = new Graphics();
    this.background.layout = { position: 'absolute', width: '100%', height: '100%' };

    this.closeButton = this.createCloseButton();
    this.nextButton = this.createNextButton();
    this.variantImage = new Sprite({
      texture: Texture.from(`education-levels/education-letter-variants/${this.letter}.png`),
      anchor: 0.5,
      layout: {
        position: 'absolute',
        left: '10%',
        top: '63%',
        width: '50%',
        height: '16%',
        objectFit: 'contain',
      },
    });
    this.soundButton = new SoundButton({
      onClick: () => {
        void this.playSound(this.getSoundAlias());
      },
      size: 300,
      variant: 'large',
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', left: '75%', top: '72%' };

    this.addChild(
      this.background,
      this.closeButton,
      this.nextButton,
      this.variantImage,
      this.soundButton,
    );

    if (this.exampleWord && this.remoteWord) {
      this.wordText = new HTMLText({
        text: getCompletedWordMarkup(this.letter, this.exampleWord),
        style: WORD_STYLE,
        anchor: 0.5,
        layout: { position: 'absolute', left: '20%', top: '25%' },
      });
      this.addChild(this.wordText);

      if (this.remoteWord.image_url) {
        this.exampleImage = new Sprite({
          texture: Texture.from(getWordImageAlias(this.remoteWord.id)),
          anchor: 0.5,
          scale: 0.8,
          layout: { position: 'absolute', left: '65%', top: '20%' },
        });
        this.addChild(this.exampleImage);
      }
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
    if (this.remoteWord?.audio_url) {
      const remoteAlias = getWordAudioAlias(this.remoteWord.id);
      if (Assets.resolver.hasKey(remoteAlias)) return remoteAlias;
    }

    return `education-levels/education-letters-audio/${this.letter}.mp3`;
  }

  async show(animated = true) {
    if (animated) {
      this.y = screen.height + 10;
      await animate(this.position, { y: 0 }, { duration: 0.6, ease: 'easeOut' });
    } else {
      this.y = 0;
    }
    void this.playSound(this.getSoundAlias());
  }

  async hide(animated = true) {
    if (!animated) return;
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

  private createNextButton(): FancyButton {
    const button = new FancyButton({
      defaultView: 'ui/next-button.svg',
      animations: {
        hover: { props: { scale: { x: 1.03, y: 1.03 } }, duration: 100 },
        pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
      },
    });
    button.anchor.set(0.5);
    button.layout = { position: 'absolute', top: '10%', left: '95%' };
    button.onPress.connect(() => {
      engine().audio.sfx.stop(this.getSoundAlias());
      void engine().navigation.showPopup(LetterPopup, getNextLetter(this.letter), {
        animate: false,
      });
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
