import { animate } from 'motion';
import { Container, Graphics } from 'pixi.js';

import { LevelButton, type TLevel } from './level-button';

export class LevelRow extends Container {
  private levels: TLevel[] = [
    {
      id: 1,
      unlocked: true,
      miniMapImage: 'typing-level-map/button-preview.svg',
    },
    {
      id: 2,
      unlocked: false,
      miniMapImage: 'typing-level-map/button-preview.svg',
    },
    {
      id: 3,
      unlocked: false,
      miniMapImage: 'typing-level-map/button-preview.svg',
    },
    {
      id: 4,
      unlocked: false,
      miniMapImage: 'typing-level-map/button-preview.svg',
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
      const fillerLine = new Graphics({ layout: { width: 100, height: 15 } })
        .roundRect(0, 0, 100, 15, 10)
        .fill(0xa66129);
      const button = new LevelButton(level);

      return i === 0 ? [button] : [fillerLine, button];
    });

    this.addChild(...this.levelButtons);
  }

  private offScreenOffset(child: Container, screenHeight: number) {
    return screenHeight + 40 - child.getGlobalPosition().y;
  }

  public async playEnterAnimation(screenHeight: number) {
    const children = this.levelButtons ?? [];

    for (const child of children) {
      child.y = 0;
      child.y = this.offScreenOffset(child, screenHeight);
    }

    await Promise.all(
      children.map((child, index) =>
        animate(
          child,
          { y: 0 },
          {
            duration: 0.4,
            ease: 'backOut',
            delay: index * 0.07,
          },
        ),
      ),
    );
  }

  public async playExitAnimation(screenHeight: number) {
    const children = this.levelButtons ?? [];

    await Promise.all(
      children.map((child, index) =>
        animate(
          child,
          { y: this.offScreenOffset(child, screenHeight) },
          {
            duration: 0.2,
            ease: 'backIn',
            delay: index * 0.02,
          },
        ),
      ),
    );
  }
}
