import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import { LetterGrid } from './letter-grid';

export class EducationLevelScreen extends Container {
  public static assetBundles = ['education-level', 'ui'];
  private background: Sprite;
  private hud: HUD;
  private letterGrid: LetterGrid;

  constructor() {
    super({
      layout: {
        position: 'relative',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      },
    });
    this.background = new Sprite({
      texture: Texture.from('education-level/background.svg'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () => {
        void engine().navigation.showPopup(QuitPopup, {
          type: 'education',
          onQuit: () => {
            void engine().navigation.showScreen(LevelMapScreen, 'education');
          },
        });
      },
    });
    this.letterGrid = new LetterGrid();
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

  // reset override from template to fix eventListener leakage
  public reset() {
    this.removeChild(this.letterGrid);
    this.letterGrid.destroy({ children: true });
  }
}
