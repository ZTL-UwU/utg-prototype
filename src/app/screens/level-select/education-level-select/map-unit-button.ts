import { FancyButton } from '@pixi/ui';
import { DropShadowFilter } from 'pixi-filters';
import { Text, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { LevelMapScreen } from '../../level-map';
import type { TMapUnit } from '../../level-map/units';

const SIZE = 221;

export class MapUnitButton extends FancyButton {
  constructor(mapUnit: TMapUnit, index: number) {
    super({
      defaultView: Texture.from('ui/map-button-unlocked.png'),
      anchor: 0.5,
      animations: {
        hover: {
          props: { scale: { x: 1.1, y: 1.1 } },
          duration: 200,
        },
      },
      text: new Text({
        text: String(index + 1),
        style: {
          fontFamily: 'Concert One',
          fontSize: 110,
          fontWeight: 'bold',
          fill: 0x8b4513,
        },
      }),
    });

    this.layout = {
      width: SIZE,
      height: SIZE,
      isLeaf: true,
    };

    const defaultShadow = new DropShadowFilter({
      quality: 10,
      color: 0x000000,
      alpha: 0.15,
      blur: 10,
    });
    const hoverShadow = new DropShadowFilter({
      quality: 10,
      color: 0xffde59,
      alpha: 0.85,
      blur: 14,
    });
    this.filters = [defaultShadow];

    this.onHover.connect(() => {
      this.filters = [hoverShadow];
    });

    this.onOut.connect(() => {
      this.filters = [defaultShadow];
    });

    this.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showScreen(LevelMapScreen, mapUnit);
    });
  }
}
