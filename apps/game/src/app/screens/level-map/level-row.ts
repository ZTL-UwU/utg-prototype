import { Container } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import {
  isPathVertical,
  joinWithLines,
  pathFlex,
  pathPosition,
  playPathEnter,
  playPathExit,
  resizePath,
} from '../../ui/button-path';
import { TutorialEntryButton } from '../level-select/education-level-select/tutorial-entry-button';
import { TypingTutorialScreen } from '../typing-level/level-tutorial';
import { LevelButton } from './level-button';
import { getPrevMap, type TMapUnit } from './units';

export class LevelRow extends Container {
  private readonly vertical = isPathVertical();
  private readonly buttonCount: number;
  private levelButtons: Container[];

  constructor(mapUnit: TMapUnit) {
    super({ layout: { ...pathPosition(), ...pathFlex(isPathVertical()) } });

    const buttons: (LevelButton | TutorialEntryButton)[] = mapUnit.levels.map(
      (level, i) => new LevelButton(level, mapUnit, i + 1),
    );
    if (mapUnit.type === 'typing' && getPrevMap(mapUnit) === undefined) {
      buttons.unshift(
        new TutorialEntryButton(() => {
          void engine().navigation.showScreen(TypingTutorialScreen, mapUnit);
        }),
      );
    }

    this.buttonCount = buttons.length;
    this.levelButtons = joinWithLines(buttons, this.vertical);
    this.addChild(...this.levelButtons);
  }

  public resize(width: number, height: number) {
    resizePath(this, this.buttonCount, width, height);
  }

  public async playEnterAnimation() {
    await playPathEnter(this, this.levelButtons, this.vertical);
  }

  public async playExitAnimation() {
    await playPathExit(this, this.levelButtons, this.vertical);
  }
}
