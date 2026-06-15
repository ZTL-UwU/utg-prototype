import { FancyButton } from '@pixi/ui';
import { DropShadowFilter } from 'pixi-filters';
import { Texture, Text } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import type { AppScreenConstructor } from '../../../engine/navigation/navigation';
import { LevelSplashScreen } from '../level-splash';
import type { TMapUnit } from './units';

export type TLevel = {
  id: number;
  title?: string;
  unlocked: boolean;
  miniMapImage: string;
  screen?: AppScreenConstructor<any[]>;
  background: string;
  helpAsset: string;
  backdropColor: number;
};

const SIZE = 221;

export class LevelButton extends FancyButton {
  constructor(level: TLevel, mapUnit: TMapUnit) {
    super({
      defaultView: Texture.from(
        level.unlocked
          ? 'typing-level-map/button-unlocked.png'
          : 'typing-level-map/button-locked.svg',
      ),
      anchor: 0.5,
      animations: {
        hover: level.unlocked
          ? {
              props: { scale: { x: 1.1, y: 1.1 } },
              duration: 100,
            }
          : undefined,
      },
      text: level.unlocked
        ? new Text({
            text: String(level.id),
            style: {
              fontFamily: 'Concert One',
              fontSize: 110,
              fontWeight: 'bold',
              fill: 0x8b4513,
            },
          })
        : undefined,
    });

    this.layout = {
      width: SIZE,
      height: SIZE,
      isLeaf: true,
    };

    if (level.unlocked) {
      this.filters = [
        new DropShadowFilter({
          color: 0x000000,
          alpha: 0.15,
          blur: 10,
        }),
      ];
      this.onPress.connect(() => {
        engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.showScreen(LevelSplashScreen, { level, mapUnit });
      });
    }
  }
}
