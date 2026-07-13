import { animate } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { HUD } from '../../../ui/hud';
import { LayerSelectScreen } from '../../layer-select';
import { EducationMapRow } from './education-map-row';

export class EducationLevelSelect extends Container {
  public static assetBundles = ['education-level', 'education-level-map', 'ui'];

  private background: Sprite;
  private mapRow: EducationMapRow;
  private hud: HUD;
  private title: Text;
  private subtitle: Text;

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

    this.title = new Text({
      text: 'THE ALPHABET',
      style: {
        fontFamily: 'Concert One',
        fontSize: 180,
        fontWeight: '800',
        fill: 0x7d4a1e,
      },
    });
    this.title.layout = {
      position: 'absolute',
      top: 100,
    };

    this.subtitle = new Text({
      text: 'ھەرپلەر',
      style: {
        fontFamily: 'Noto Naskh Arabic Bold',
        fontSize: 100,
        fontWeight: '700',
        fill: 0x7d4a1e,
      },
    });
    this.subtitle.layout = {
      position: 'absolute',
      top: 300,
    };

    this.addChild(this.background, this.mapRow, this.hud, this.title, this.subtitle);
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
  }

  public async show() {
    this.title.y = -(300 + 120);
    this.subtitle.y = -(300 + 120);

    await Promise.all([
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.subtitle, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      this.mapRow.playEnterAnimation(engine().navigation.height),
    ]);
  }

  public async hide() {
    await Promise.all([
      animate(this.title, { y: -(300 + 120) }, { duration: 0.2, ease: 'backIn' }),
      animate(this.subtitle, { y: -(300 + 120) }, { duration: 0.2, ease: 'backIn' }),
      this.mapRow.playExitAnimation(engine().navigation.height),
    ]);
  }
}
