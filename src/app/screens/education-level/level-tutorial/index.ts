import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { EDUCATION_LETTERS } from '../../../../utils/example-words';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import { LetterGrid } from './letter-grid';

const letters = [
  EDUCATION_LETTERS.slice(0, 8),
  EDUCATION_LETTERS.slice(8, 16),
  EDUCATION_LETTERS.slice(16, 24),
  EDUCATION_LETTERS.slice(24, 32),
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
      toTutorial: false,
      helpAsset: 'tutorial-popups/education-tutorial.png',
      backdropColor: 0x4a90e2,
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
    this.letterGrid.scale.set(0.4);
    await Promise.all([
      animate(this.letterGrid, { alpha: 1 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.letterGrid.scale, { x: 1, y: 1 }, { duration: 0.4, ease: 'backOut' }),
    ]);
  }

  public async hide() {
    await Promise.all([
      animate(this.letterGrid, { alpha: 0 }, { duration: 0.2, ease: 'easeIn' }),
      animate(this.letterGrid.scale, { x: 0.4, y: 0.4 }, { duration: 0.2, ease: 'easeIn' }),
    ]);
  }
}
