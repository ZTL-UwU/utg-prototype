import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import { LetterGrid } from './letter-grid';
import { MessageContainer } from './message-container';

export class EducationLevelScreen extends Container {
  public static assetBundles = ['education-level', 'ui', 'education-audio'];
  private background: Sprite;
  private hud: HUD;
  private letterGrid: LetterGrid;
  private messageContainer: MessageContainer;
  constructor() {
    super({
      layout: {
        position: 'relative',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      },
    });
    engine().audio.bgm.setVolume(0);
    this.background = new Sprite({
      texture: Texture.from('education-level/background.png'),
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
      toTutorial: false,
      helpAsset: 'tutorial-popups/education-level-1.png',
      backdropColor: 0x4a90e2,
    });
    this.letterGrid = new LetterGrid();
    this.messageContainer = new MessageContainer();
    this.addChild(this.background, this.letterGrid, this.hud, this.messageContainer);
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.letterGrid.resize(width, height);
    this.messageContainer.resize(width, height);
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
