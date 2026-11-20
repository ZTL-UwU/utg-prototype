import { BlurFilter, type Container } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { removeFilter } from './remove-filter';

/**
 * The blur a popup puts on the screen beneath it. It joins the screen's own filters rather
 * than replacing them, and `remove` takes only it away again.
 */
export class ScreenBlur {
  public readonly filter: BlurFilter;
  private screen?: Container;

  constructor(strength: number) {
    this.filter = new BlurFilter({ strength });
    const screen = engine().navigation.currentScreen;
    if (!screen) return;
    const filters = screen.filters;
    screen.filters = [
      ...(Array.isArray(filters) ? filters : filters ? [filters] : []),
      this.filter,
    ];
    this.screen = screen;
  }

  /** The screen the blur is on, if there was one. */
  public get target(): Container | undefined {
    return this.screen;
  }

  public remove() {
    if (this.screen && !this.screen.destroyed) removeFilter(this.screen, this.filter);
    this.screen = undefined;
  }
}
