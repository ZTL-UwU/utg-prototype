import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { HUD } from '../../../ui/hud';
import { LayerSelectScreen } from '../../layer-select';
import { EducationMapRow } from './education-map-row';

export class EducationLevelSelect extends Container {
  public static assetBundles = ['education-level', 'ui'];

  private background: Sprite;
  private mapRow: EducationMapRow;
  private hud: HUD;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level/background.png'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.mapRow = new EducationMapRow();

    this.hud = new HUD({
      onBack: () => void engine().navigation.showScreen(LayerSelectScreen),
    });

    this.addChild(this.background, this.mapRow, this.hud);
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
  }
}
