import type { AnimationPlaybackControls } from 'motion';
import { Container, type DestroyOptions, type Sprite } from 'pixi.js';

import {
  isPathVertical,
  joinWithLines,
  pathFlex,
  pathPosition,
  playPathEnter,
  playPathExit,
  resizePath,
  PATH_BUTTON_SIZE,
} from '../../ui/button-path';
import { createMapSheep, hopSheep } from '../../ui/map-sheep';
import { LevelButton } from './level-button';
import type { TMapUnit } from './units';

/** Sheep width in button units. */
const SHEEP_WIDTH = PATH_BUTTON_SIZE * 0.72;

/**
 * Where the sheep's feet go, in a button's own space (its centre is the origin): on top of the
 * button in a row, beside it on phones, where the button above leaves no room.
 */
function sheepSpot(vertical: boolean) {
  const radius = PATH_BUTTON_SIZE / 2;
  return vertical
    ? { x: -radius - SHEEP_WIDTH * 0.45, y: radius * 0.55 }
    : { x: 0, y: -radius + 12 };
}

/** First unfinished button at or after `from`, wrapping around; undefined when all are done. */
function firstUnfinished(buttons: LevelButton[], from = 0): number | undefined {
  for (let offset = 0; offset < buttons.length; offset++) {
    const index = (from + offset) % buttons.length;
    if (buttons[index].unlocked && !buttons[index].completed) return index;
  }
}

export class LevelRow extends Container {
  /** Column on phones, row otherwise; follows the window across the breakpoint. */
  private vertical = isPathVertical();
  private readonly buttons: LevelButton[];
  /** The buttons with the lines joining them, in path order, for each direction. */
  private readonly paths: Record<'column' | 'row', Container[]>;
  private levelButtons: Container[];
  /** Education maps: the sheep standing on the current game, and the game it hops to next. */
  private gameButtons: LevelButton[] = [];
  private sheep?: Sprite;
  private sheepScale = 1;
  private sheepIndex = 0;
  private pendingHop?: number;
  private hopAnimation?: AnimationPlaybackControls;

  constructor(mapUnit: TMapUnit) {
    super({ layout: { ...pathPosition(), ...pathFlex(isPathVertical()) } });

    const buttons = mapUnit.levels.map((level, i) => new LevelButton(level, mapUnit, i + 1));

    this.buttons = buttons;
    // Lines for both directions, so a resize across the breakpoint swaps between them
    this.paths = { column: joinWithLines(buttons, true), row: joinWithLines(buttons, false) };
    this.levelButtons = this.vertical ? this.paths.column : this.paths.row;
    this.addChild(...this.levelButtons);

    if (mapUnit.type === 'education') {
      this.addSheep(buttons);
    }
  }

  /** Stands the sheep on the first unfinished game, or the one just finished before it hops on. */
  private addSheep(buttons: LevelButton[]) {
    if (buttons.length === 0) return;
    this.gameButtons = buttons;

    const justCompleted = buttons.findLastIndex((button) => button.justCompleted);
    if (justCompleted >= 0) {
      this.sheepIndex = justCompleted;
      this.pendingHop = firstUnfinished(buttons, justCompleted + 1);
    } else {
      this.sheepIndex = firstUnfinished(buttons) ?? buttons.length - 1;
    }

    this.sheep = createMapSheep();
    this.sheepScale = SHEEP_WIDTH / this.sheep.texture.width;
    this.sheep.scale.set(this.sheepScale);
    this.sheep.position.copyFrom(sheepSpot(this.vertical));
    buttons[this.sheepIndex].addChild(this.sheep);

    buttons.forEach((button, index) => {
      if (button.unlocked) button.beforePlay = () => this.hopTo(index);
    });
  }

  /** Hops the sheep to another game, through the row so it can cross between buttons. */
  private async hopTo(index: number) {
    const sheep = this.sheep;
    if (!sheep || index === this.sheepIndex || this.destroyed) return;
    this.interactiveChildren = false;

    const target = this.gameButtons[index];
    const from = this.toLocal(sheep.getGlobalPosition());
    const to = this.toLocal(target.toGlobal(sheepSpot(this.vertical)));
    // Kept out of the flex layout, so it moves freely while crossing
    this.addChild(sheep);
    sheep.position.copyFrom(from);

    this.hopAnimation = hopSheep(sheep, from, to, this.sheepScale);
    await this.hopAnimation;
    this.hopAnimation = undefined;
    this.sheepIndex = index;
    this.interactiveChildren = true;
    if (sheep.destroyed || target.destroyed) return;
    sheep.scale.set(this.sheepScale);
    sheep.position.copyFrom(sheepSpot(this.vertical));
    target.addChild(sheep);
  }

  /** After a finished game: once its ring fills, the sheep hops to the next unfinished one. */
  public async afterEnter() {
    if (this.pendingHop === undefined) return;
    const target = this.pendingHop;
    this.pendingHop = undefined;
    await this.gameButtons[this.sheepIndex].ringFilled();
    await this.hopTo(target);
  }

  public override destroy(options?: DestroyOptions) {
    this.hopAnimation?.stop();
    // The lines of the direction not shown are no children of the row
    const hidden = this.vertical ? this.paths.row : this.paths.column;
    for (const line of hidden) if (!line.parent) line.destroy();
    super.destroy(options);
  }

  public resize(width: number, height: number) {
    const vertical = isPathVertical();
    if (vertical !== this.vertical) this.setVertical(vertical);
    resizePath(this, this.buttons.length, width, height);
  }

  /** Turns the path between a column and a row, with lines to match. */
  private setVertical(vertical: boolean) {
    this.vertical = vertical;
    for (const child of this.levelButtons) this.removeChild(child);
    this.levelButtons = vertical ? this.paths.column : this.paths.row;
    this.addChild(...this.levelButtons);
    this.layout = pathFlex(vertical);
    if (!this.sheep) return;
    if (this.sheep.parent === this) {
      // Mid-hop it is the row's own child: keep it above the buttons; it lands on the new spot
      this.addChild(this.sheep);
    } else {
      this.sheep.position.copyFrom(sheepSpot(vertical));
    }
  }

  public async playEnterAnimation() {
    await playPathEnter(this, this.levelButtons, this.vertical);
  }

  public async playExitAnimation() {
    await playPathExit(this, this.levelButtons, this.vertical);
  }
}
