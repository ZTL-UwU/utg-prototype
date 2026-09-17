// import { AlphabetGrid, type AlphabetGridColorOptions } from '../../ui/alphabet-grid';
import { EDUCATION_LETTERS } from '@utg/letters';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { HUD } from '../../ui/hud';
import { HomeScreen } from '../home';
import { OutlineDisplay } from './display';
const BACKGROUND_COLOR = 0xf3e3c6;
// const GRID_COLOR_OPTIONS : AlphabetGridColorOptions = {
//     panelColor: 0x5d4a18,
//     panelShadowColor: 0x8e8575,
//     keyColor: BACKGROUND_COLOR,
//     keyPressedColor: BACKGROUND_COLOR,
//     keyShadowColor: 0xf3e3c6,
//     keyHoverShadowColor: 0xc4d4f3,
//     keyPressedShadowColor: 0xf3e3c6,
//     textColor: 0x5d4a18
// }
export type LETTER_FORMS = 'initial' | 'medial' | 'final' | 'isolated';
export class LetterReferenceScreen extends Container {
  public static assetBundles = ['letter-reference'];
  private background = new Sprite({
    texture: Texture.WHITE,
    tint: BACKGROUND_COLOR,
    layout: { position: 'absolute', width: '100%', height: '100%' },
  });
  private HUD = new HUD({
    onBack: () => {
      void engine().navigation.showScreen(HomeScreen);
    },
  });

  //   private letterGrid : AlphabetGrid;
  private outlineDisplay: OutlineDisplay;
  constructor() {
    super();
    this.outlineDisplay = new OutlineDisplay(EDUCATION_LETTERS[0]);
    // this.letterGrid = new AlphabetGrid(()=>{}, GRID_COLOR_OPTIONS)

    this.addChild(this.background, this.outlineDisplay, this.HUD);
  }
  resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.layout = { width, height };
    this.outlineDisplay.resize(width, height);
  }
}
