// import { AlphabetGrid, type AlphabetGridColorOptions } from '../../ui/alphabet-grid';
import { sound } from '@pixi/sound';
import { EDUCATION_LETTERS } from '@utg/letters';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { HUD } from '../../ui/hud';
import { HomeScreen } from '../home';
import { OutlineDisplay } from './display';
const BACKGROUND_COLOR = 0xf3e3c6;

// the bundled recording of the letter itself
function getLetterSoundAlias(letter: string) {
  return `education-levels/education-letters-audio/${letter}.m4a`;
}

export type LETTER_FORMS = 'initial' | 'medial' | 'final' | 'isolated';
export class LetterReferenceScreen extends Container {
  public readonly screenName = 'LetterReferenceScreen';
  public static assetBundles = ['letter-reference', 'ui', 'education-letters-audio'];
  private background = new Sprite({
    texture: Texture.WHITE,
    tint: BACKGROUND_COLOR,
    layout: { position: 'absolute', width: '100%', height: '100%' },
  });
  private HUD = new HUD({
    onBack: () => this.goHome(),
  });
  private outlineDisplay: OutlineDisplay;
  private letterIndex = 0;
  private soundTimeout?: ReturnType<typeof setTimeout>;
  //   private letterGrid : AlphabetGrid;

  constructor() {
    super();
    this.outlineDisplay = new OutlineDisplay(EDUCATION_LETTERS[this.letterIndex], {
      onPrev: () => this.stepLetter(-1),
      onNext: () => this.stepLetter(1),
      onSound: () => this.playLetterSound(),
      onHome: () => this.goHome(),
    });
    this.outlineDisplay.setCounter(this.letterIndex + 1, EDUCATION_LETTERS.length);

    this.addChild(this.background, this.HUD, this.outlineDisplay);
  }

  // shared by the HUD back button and the results overlay, so both stop the letter audio
  private goHome() {
    this.stopLetterSound();
    void engine().navigation.showScreen(HomeScreen);
  }

  async show() {
    this.playLetterSound();
  }

  // wraps at both ends so the letters carousel
  private stepLetter(delta: number) {
    // a new letter cuts off the previous one's audio; form changes never reach here
    this.stopLetterSound();
    const count = EDUCATION_LETTERS.length;
    this.letterIndex = (this.letterIndex + delta + count) % count;
    this.outlineDisplay.setLetter(EDUCATION_LETTERS[this.letterIndex]);
    this.outlineDisplay.setCounter(this.letterIndex + 1, count);
    this.playLetterSound();
  }

  private get soundAlias() {
    return getLetterSoundAlias(EDUCATION_LETTERS[this.letterIndex]);
  }

  // spam safe: ignored while the current letter's audio is still playing
  private playLetterSound() {
    const alias = this.soundAlias;
    if (this.soundTimeout !== undefined || !sound.exists(alias)) return;

    const duration = sound.find(alias)?.duration ?? 0;
    void engine().audio.sfx.play(alias);
    this.soundTimeout = setTimeout(() => {
      this.soundTimeout = undefined;
    }, duration * 1000);
  }

  private stopLetterSound() {
    engine().audio.sfx.stop(this.soundAlias);
    clearTimeout(this.soundTimeout);
    this.soundTimeout = undefined;
  }

  resize(width: number, height: number) {
    this.layout = {
      width,
      height,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
    };
    this.background.layout = { width, height };
    this.outlineDisplay.resize(width * 0.75, height * 0.8);
  }
}
