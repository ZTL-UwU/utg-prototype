import { animate } from 'motion';
import { Container, Graphics } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive } from '../../../engine/utils/viewport';
import { TutorialEntryButton } from '../level-select/education-level-select/tutorial-entry-button';
import { TypingTutorialScreen } from '../typing-level/level-tutorial';
import { LevelButton } from './level-button';
import { getPrevMap, type TMapUnit } from './units';

export class LevelRow extends Container {
  private levelButtons?: (LevelButton | TutorialEntryButton | Graphics)[];

  constructor(mapUnit: TMapUnit) {
    super({
      layout: {
        position: 'absolute',
        top: responsive({ sm: '30%', lg: '50%' }),
        width: '100%',
        // Too narrow for one line of buttons: they wrap, without the connecting lines.
        flexWrap: responsive({ sm: 'wrap', lg: 'nowrap' }),
        justifyContent: 'center',
        alignItems: 'center',
        gap: responsive({ sm: 24, lg: 8 }),
      },
    });

    const showLines = responsive({ sm: false, lg: true });

    this.levelButtons = mapUnit.levels.flatMap((level, i) => {
      const fillerLine = new Graphics({ layout: { width: 80, height: 15 } })
        .roundRect(0, 0, 100, 15, 10)
        .fill(0xa66129);
      const button = new LevelButton(level, mapUnit, i + 1);

      return i === 0 || !showLines ? [button] : [fillerLine, button];
    });

    if (mapUnit.type === 'typing' && getPrevMap(mapUnit) === undefined) {
      const tutorialButton = new TutorialEntryButton(() => {
        void engine().navigation.showScreen(TypingTutorialScreen, mapUnit);
      });
      const fillerLine = new Graphics({ layout: { width: 80, height: 15 } })
        .roundRect(0, 0, 100, 15, 10)
        .fill(0xa66129);
      this.levelButtons = showLines
        ? [tutorialButton, fillerLine, ...this.levelButtons]
        : [tutorialButton, ...this.levelButtons];
    }

    this.addChild(...this.levelButtons);
  }

  /** Phones draw the buttons smaller, so four fit across and long maps stay on screen. */
  public resize(width: number) {
    const scale = responsive({ sm: 0.77, lg: 1 });
    this.scale.set(scale);
    this.layout = { width: width / scale, left: (width - width / scale) / 2 };
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
