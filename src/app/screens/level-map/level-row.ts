import { animate } from 'motion';
import { Container, Graphics } from 'pixi.js';

import { LevelButton } from './level-button';
import type { TMapUnit } from './units';

export class LevelRow extends Container {
  private levelButtons?: (LevelButton | Graphics)[];

  constructor(mapUnit: TMapUnit) {
    super({
      layout: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
      },
    });

    this.levelButtons = mapUnit.levels.flatMap((level, i) => {
      const fillerLine = new Graphics({ layout: { width: 80, height: 15 } })
        .roundRect(0, 0, 100, 15, 10)
        .fill(0xa66129);
      const button = new LevelButton(level, mapUnit, i + 1);

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
