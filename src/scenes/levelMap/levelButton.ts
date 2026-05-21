import { GlowFilter } from 'pixi-filters';
import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

import type { Level } from './levelRow';

const SIZE = 221;

export class LevelButton extends Container {
  constructor(level: Level, onLevel: () => void) {
    super({
      layout: {
        width: SIZE,
        height: SIZE,
      },
    });

    const textureAlias = level.unlocked ? level.miniMapImage : 'level-button-locked';
    const sprite = new Sprite(Texture.from(textureAlias));
    this.addChild(sprite);

    if (level.unlocked) {
      this.filters = [
        new GlowFilter({
          color: 0xffde59,
          alpha: 0.15,
          distance: 150,
        }),
      ];
      this.hitArea = new Rectangle(0, 0, SIZE, SIZE);
      this.eventMode = 'static';
      this.cursor = 'pointer';
      this.on('pointertap', onLevel);
    }
  }
}
