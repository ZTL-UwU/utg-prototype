import { Container, Graphics } from 'pixi.js';

import { LevelButton, type TLevel } from './level-button';

export class LevelRow extends Container {
  private levels: TLevel[] = [
    {
      id: 1,
      unlocked: true,
      miniMapImage: 'level-map/button-preview.svg',
    },
    {
      id: 2,
      unlocked: false,
      miniMapImage: 'level-map/button-preview.svg',
    },
    {
      id: 3,
      unlocked: false,
      miniMapImage: 'level-map/button-preview.svg',
    },
    {
      id: 4,
      unlocked: false,
      miniMapImage: 'level-map/button-preview.svg',
    },
  ];
  private levelButtons?: (LevelButton | Graphics)[];

  constructor() {
    super({
      layout: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
      },
    });

    this.levelButtons = this.levels.flatMap((level, i) => {
      const fillerLine = new Graphics({ layout: true }).roundRect(0, 0, 100, 15, 10).fill(0xa66129);
      const button = new LevelButton(level);

      return i === 0 ? [button] : [fillerLine, button];
    });

    this.addChild(...this.levelButtons);
  }
}
