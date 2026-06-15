import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { EDUCATION_LETTERS } from '../../../../utils/example-words';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import { mapUnitStore } from '../../level-map/units';
import { LetterTile } from './letter-tile';

export class EducationSheepJumpScreen extends Container {
  public static assetBundles = ['education-level-6', 'ui'];

  private readonly background: Sprite;
  private readonly hud: HUD;

  constructor() {
    super({
      layout: {
        position: 'relative',
        width: '100%',
        height: '100%',
      },
    });
    engine().audio.bgm.setVolume(0);

    this.background = new Sprite({
      texture: Texture.from('education-level-6/background-grass.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: 'education',
          onQuit: () =>
            void engine().navigation.showScreen(LevelMapScreen, mapUnitStore['education-map-1']),
        }),
      toTutorial: false,
      backdropColor: 0x4a90e2,
    });

    const tile = new LetterTile(EDUCATION_LETTERS[0]);
    tile.position.set(engine().navigation.width / 2, engine().navigation.height / 2);
    this.addChild(this.background, this.hud, tile);
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
  }
}
