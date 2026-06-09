import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import { LetterGrid } from './letter-grid';

const letters = [
  ['ئا', 'ئە', 'ب', 'پ', 'ت', 'ج', 'چ', 'خ'],
  ['د', 'ر', 'ز', 'ژ', 'س', 'ش', 'غ', 'ف'],
  ['ق', 'ك', 'گ', 'ڭ', 'ل', 'م', 'ن', 'ھ'],
  ['ئو', 'ئۇ', 'ئۆ', 'ئۈ', 'ۋ', 'ئې', 'ئى', 'ي'],
];

export class EducationTutorialScreen extends Container {
  public static assetBundles = ['education-level', 'ui', 'education-audio'];

  private background: Sprite;
  private hud: HUD;
  private letterGrid: LetterGrid;

  constructor() {
    super();

    this.background = new Sprite({
      texture: Texture.from('education-level/background.png'),
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      },
    });

    this.hud = new HUD({
      onBack: () => {
        void engine().navigation.showScreen(LevelMapScreen, 'education');
      },
      type: 'education',
    });

    this.letterGrid = new LetterGrid(letters);
    this.addChild(this.background, this.letterGrid, this.hud);
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.letterGrid.resize(width, height);
  }

  public async show() {
    this.letterGrid.alpha = 0;
    this.letterGrid.scale.set(0.5);
    await Promise.all([
      animate(this.letterGrid, { alpha: 1 }, { duration: 0.5, ease: 'backOut' }),
      animate(this.letterGrid.scale, { x: 1, y: 1 }, { duration: 0.5, ease: 'backOut' }),
    ]);
  }
}
