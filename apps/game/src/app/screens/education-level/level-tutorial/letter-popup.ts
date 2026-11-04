import { sound } from '@pixi/sound';
import { FancyButton } from '@pixi/ui';
import { EDUCATION_LETTERS, type EducationLetter } from '@utg/letters';
import { animate } from 'motion';
import { Container, Graphics, HTMLText, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { responsive } from '../../../../engine/utils/viewport';
import { createExampleWordStyle, getCompletedWordMarkup } from '../../../../utils/example-words';
import { convertToCurrentScript } from '../../../../utils/script';
import {
  getTutorialWordForLetter,
  getWordEducationAudioAlias,
  getWordImageAlias,
  REMOTE_WORDS_BUNDLE,
  type WordSimple,
} from '../../../../zustandStores/wordStore';
import { createLetterNavButtons, layoutLetterPopupControls } from '../../../ui/letter-nav-buttons';
import { SoundButton } from '../../../ui/sound-button';
import { MissingWordNotice } from './missing-word-notice';

const COLORS = {
  BACKGROUND: 0xe8eef8,
} as const;

/** Gap between the close and letter nav buttons and the phone column below them. */
const PHONE_TOP_BAR_GAP = 40;
/** Space kept on each side of a long word that is shrunk to fit a phone. */
const PHONE_SIDE_MARGIN = 20;
/** Box the example picture is fitted into on phones. */
const PHONE_IMAGE_SIZE = 360;

function getAdjacentLetter(letter: string, delta: number): string {
  const index = EDUCATION_LETTERS.indexOf(letter as EducationLetter);
  if (index < 0) return EDUCATION_LETTERS[0]!;
  const count = EDUCATION_LETTERS.length;
  return EDUCATION_LETTERS[(index + delta + count) % count]!;
}

export class LetterPopup extends Container {
  public readonly screenName = 'LetterPopup';
  public static assetBundles = [
    'education-tutorial',
    'education-letter-variants',
    'education-letters-audio',
    'ui',
    REMOTE_WORDS_BUNDLE,
  ];
  private isPlaying: boolean = false;
  private isNavigating = false;
  private letter: string;
  private remoteWord?: WordSimple;
  private exampleWord: string | undefined;
  private wordText?: HTMLText;
  /** Unscaled word width, for shrinking long words to fit phones. */
  private wordWidth = 0;
  private exampleImage?: Sprite;
  private variantImage: Sprite;
  private background: Graphics;
  private closeButton: FancyButton;
  private prevButton: FancyButton;
  private nextButton: FancyButton;
  private soundButton: SoundButton;

  constructor(letter: string) {
    super({
      layout: {
        position: 'relative',
        width: '100%',
        height: '100%',
        // Phones stack the picture, word, letter card and sound button in a centered column.
        ...responsive({
          sm: {
            flexDirection: 'column' as const,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
            gap: 40,
          },
          lg: {},
        }),
      },
    });
    this.letter = letter;

    this.remoteWord = getTutorialWordForLetter(letter);
    this.exampleWord = this.remoteWord
      ? convertToCurrentScript(this.remoteWord.word.trim())
      : undefined;

    this.background = new Graphics();
    // Pinned to the corner: without insets, the phone column's padding would push it down.
    this.background.layout = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    };

    this.closeButton = this.createCloseButton();
    const { prevButton, nextButton } = createLetterNavButtons({
      onPrev: () => this.goToLetter(getAdjacentLetter(this.letter, -1)),
      onNext: () => this.goToLetter(getAdjacentLetter(this.letter, 1)),
    });
    this.prevButton = prevButton;
    this.nextButton = nextButton;
    this.variantImage = new Sprite({
      texture: Texture.from(`education-levels/education-letter-variants/${this.letter}.png`),
      anchor: 0.5,
      layout: {
        objectFit: 'contain',
        ...responsive({
          sm: { width: '80%' as const, height: 220 },
          lg: {
            position: 'absolute' as const,
            left: '10%' as const,
            top: '63%' as const,
            width: '50%' as const,
            height: '16%' as const,
          },
        }),
      },
    });
    this.soundButton = new SoundButton({
      onClick: () => {
        void this.playSound(this.getSoundAlias());
      },
      size: responsive({ sm: 220, lg: 300 }),
      variant: 'large',
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = responsive({
      sm: {},
      lg: { position: 'absolute', left: '75%', top: '72%' },
    });

    this.addChild(this.background, this.closeButton, this.prevButton, this.nextButton);

    if (this.exampleWord && this.remoteWord) {
      if (this.remoteWord.image_url) {
        this.exampleImage = new Sprite({
          texture: Texture.from(getWordImageAlias(this.remoteWord.id)),
          anchor: 0.5,
          scale: responsive({ sm: 1, lg: 0.8 }),
          layout: responsive({
            sm: { width: PHONE_IMAGE_SIZE, height: PHONE_IMAGE_SIZE, objectFit: 'contain' },
            lg: { position: 'absolute', left: '65%', top: '20%' },
          }),
        });
        this.addChild(this.exampleImage);
      }

      this.wordText = new HTMLText({
        text: getCompletedWordMarkup(convertToCurrentScript(this.letter), this.exampleWord),
        style: createExampleWordStyle(180),
        anchor: 0.5,
        layout: responsive({ sm: {}, lg: { position: 'absolute', left: '20%', top: '25%' } }),
      });
      this.wordWidth = this.wordText.getLocalBounds().width;
      this.addChild(this.wordText, this.variantImage, this.soundButton);
    } else {
      this.addChild(this.variantImage, new MissingWordNotice());
    }
  }

  resize(width: number, height: number) {
    const controlsBottom = layoutLetterPopupControls(
      { closeButton: this.closeButton, prevButton: this.prevButton, nextButton: this.nextButton },
      width,
      height,
    );
    this.layout = {
      width,
      height,
      ...responsive({ sm: { paddingTop: controlsBottom + PHONE_TOP_BAR_GAP }, lg: {} }),
    };
    this.background.clear().rect(0, 0, width, height).fill(COLORS.BACKGROUND);
    this.wordText?.scale.set(
      responsive({ sm: Math.min(1, (width - 2 * PHONE_SIDE_MARGIN) / this.wordWidth), lg: 1 }),
    );
  }

  private getSoundAlias(): string {
    if (this.remoteWord?.education_audio_url) {
      const remoteAlias = getWordEducationAudioAlias(this.remoteWord.id);
      // `sound.exists` rather than `Assets.resolver.hasKey`: the latter is true as soon as
      // the bundle is registered, even if the file 404'd, which would skip this fallback.
      if (sound.exists(remoteAlias)) return remoteAlias;
    }

    return `education-levels/education-letters-audio/${this.letter}.m4a`;
  }

  async show(animated = true) {
    window.addEventListener('keydown', this.onKeyDown);
    if (animated) {
      this.y = screen.height + 10;
      await animate(this.position, { y: 0 }, { duration: 0.6, ease: 'easeOut' });
    } else {
      this.y = 0;
    }
    void this.playSound(this.getSoundAlias());
  }

  async hide(animated = true) {
    window.removeEventListener('keydown', this.onKeyDown);
    if (!animated) return;
    await animate(this.position, { y: screen.height + 10 }, { duration: 0.4, ease: 'easeOut' });
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.onKeyDown);
    super.destroy(options);
  }

  private goToLetter(letter: string) {
    if (this.isNavigating || letter === this.letter) return;
    this.isNavigating = true;
    engine().audio.sfx.stop(this.getSoundAlias());
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
    void engine().navigation.showPopup(LetterPopup, letter, { animate: false });
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    if (event.repeat) return;
    this.goToLetter(getAdjacentLetter(this.letter, event.key === 'ArrowRight' ? 1 : -1));
  };

  private createCloseButton(): FancyButton {
    const button = new FancyButton({
      defaultView: 'education-levels/education-tutorial/x.svg',
      animations: {
        hover: { props: { scale: { x: 1.03, y: 1.03 } }, duration: 100 },
        pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
      },
    });
    button.anchor.set(0.5);
    button.onPress.connect(() => {
      engine().audio.sfx.stop(this.getSoundAlias());
      void engine().navigation.hidePopup();
    });
    return button;
  }

  // spam safe playSound method
  private async playSound(alias: string) {
    if (this.isPlaying) return;
    if (!sound.exists(alias)) return;

    this.isPlaying = true;
    const duration = sound.find(alias)?.duration ?? 0;
    void engine().audio.sfx.play(alias);

    // Re-enable after the sound's own duration
    setTimeout(() => {
      this.isPlaying = false;
    }, duration * 1000);
  }
}
