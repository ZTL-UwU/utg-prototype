import { Container, Graphics } from 'pixi.js';

import { LevelButton } from './levelButton';

export type Level = {
  id: number;
  unlocked: boolean;
  miniMapImage: string;
};

export class LevelRow extends Container {
  private levels: Level[] = [
    {
      id: 1,
      unlocked: true,
      miniMapImage: 'level-map-mini-map',
    },
    {
      id: 2,
      unlocked: false,
      miniMapImage: 'level-map-mini-map',
    },
    {
      id: 3,
      unlocked: false,
      miniMapImage: 'level-map-mini-map',
    },
    {
      id: 4,
      unlocked: false,
      miniMapImage: 'level-map-mini-map',
    },
  ];
  private levelButtons?: (LevelButton | Graphics)[];

  constructor(onLevel: () => void) {
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
      const button = new LevelButton(level, onLevel);

      return i === 0 ? [button] : [fillerLine, button];
    });

    this.addChild(...this.levelButtons);
  }
}
