import { animate } from 'motion';
import { Container, Graphics } from 'pixi.js';

import { EducationLevelSelect } from '.';
import { engine } from '../../../../engine/getEngine';
import { EducationTutorialScreen } from '../../education-level/level-tutorial';
import { educationMaps } from '../../level-map/units';
import { MapUnitButton } from './map-unit-button';
import { TutorialEntryButton } from './tutorial-entry-button';

export class EducationMapRow extends Container {
  private unitButtons?: (MapUnitButton | TutorialEntryButton | Graphics)[];

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

    const openTutorial: () => void = () => {
      void engine().navigation.showScreen(EducationTutorialScreen, {
        mapUnit: educationMaps[0],
        onBack: () => void engine().navigation.showScreen(EducationLevelSelect),
      });
    };
    const tutorialButton = new TutorialEntryButton(openTutorial);

    this.unitButtons = [
      tutorialButton,
      ...educationMaps.flatMap((mapUnit, i) => {
        const fillerLine = new Graphics({ layout: { width: 100, height: 15 } })
          .roundRect(0, 0, 100, 15, 10)
          .fill(0xa66129);
        const button = new MapUnitButton(mapUnit, i);

        return [fillerLine, button];
      }),
    ];

    this.addChild(...this.unitButtons);
  }

  private offScreenOffset(child: Container, screenHeight: number) {
    return screenHeight + 40 - child.getGlobalPosition().y;
  }

  public async playEnterAnimation(screenHeight: number) {
    const children = this.unitButtons ?? [];

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
    const children = this.unitButtons ?? [];

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
