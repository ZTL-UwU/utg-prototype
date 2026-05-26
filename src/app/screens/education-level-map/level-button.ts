import { DropShadowFilter } from 'pixi-filters';
import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { EducationLevelScreen } from '../education-level';
// import { TypingLevelScreen } from '../typing-level';

export type TLevel = {
  id: number;
  unlocked: boolean;
  miniMapImage: string;
};

const SIZE = 221;

export class LevelButton extends Container {
  constructor(level: TLevel) {
    super({
      layout: {
        width: SIZE,
        height: SIZE,
      },
    });

    const textureAlias = level.unlocked
      ? level.miniMapImage
      : 'education-level-map/button-locked.svg';
    const sprite = new Sprite(Texture.from(textureAlias));
    this.addChild(sprite);

    if (level.unlocked) {
      this.filters = [
        new DropShadowFilter({
          color: 0x000000,
          alpha: 0.15,
          blur: 10,
        }),
      ];
      this.hitArea = new Rectangle(0, 0, SIZE, SIZE);
      this.eventMode = 'static';
      this.cursor = 'pointer';
      this.on('pointertap', () => {
        void engine().navigation.showScreen(EducationLevelScreen);
      });
    }
  }
}
