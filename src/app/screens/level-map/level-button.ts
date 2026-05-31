import { FancyButton } from '@pixi/ui';
import { DropShadowFilter } from 'pixi-filters';
import { Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import type { AppScreenConstructor } from '../../../engine/navigation/navigation';
import useSessionStore from '../../../zustandStores/sessionStore';

export type TLevel = {
  id: number;
  unlocked: boolean;
  miniMapImage: string;
  screen?: AppScreenConstructor;
};

const SIZE = 221;

export class LevelButton extends FancyButton {
  constructor(level: TLevel, type: 'education' | 'typing') {
    super({
      defaultView: Texture.from(
        level.unlocked ? level.miniMapImage : 'typing-level-map/button-locked.svg',
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
      if (level.screen) {
        this.onPress.connect(() => {
          useSessionStore.getState().reset();
          useSessionStore.getState().startSession(type);
          void engine().navigation.showScreen(level.screen!);
        });
      }
    }
  }
}
