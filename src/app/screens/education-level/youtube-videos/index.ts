import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { useOverlayStore } from '../../../../zustandStores/overlayStore';
import { HUD } from '../../../ui/hud';
import type { TMapUnit } from '../../level-map/units';
import { EducationTutorialScreen } from '../level-tutorial';

export class EducationYoutubeScreen extends Container {
  public static assetBundles = ['education-level', 'ui'];

  private background: Sprite;
  private hud: HUD;
  private mapUnit: TMapUnit;

  constructor(mapUnit: TMapUnit) {
    super();
    this.mapUnit = mapUnit;

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
      onBack: () => void engine().navigation.showScreen(EducationTutorialScreen, this.mapUnit),
      noHelpButton: true,
    });

    this.addChild(this.background, this.hud);
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
  }

  public async show() {
    useOverlayStore.getState().show('youtube-embeds');
  }

  public async hide() {
    useOverlayStore.getState().hide();
  }
}
