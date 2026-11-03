import { Container } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import {
  isPathVertical,
  joinWithLines,
  pathFlex,
  pathPosition,
  playPathEnter,
  playPathExit,
  resizePath,
} from '../../../ui/button-path';
import { EducationTutorialScreen } from '../../education-level/level-tutorial';
import { getLayerMaps } from '../../level-map/units';
import { MapUnitButton } from './map-unit-button';
import { TutorialEntryButton } from './tutorial-entry-button';

const ITEMS_PER_PAGE = 3;

export class EducationMapRow extends Container {
  private readonly vertical = isPathVertical();
  private pages: Container[] = [];
  private currentPage = 0;
  /** Buttons on the fullest page, so every page draws at the same size. */
  private readonly pageSize: number;

  constructor() {
    super({
      layout: { ...pathPosition(), width: '100%', justifyContent: 'center', alignItems: 'center' },
    });

    const educationMaps = getLayerMaps('education');

    const tutorialButton = new TutorialEntryButton(
      () => void engine().navigation.showScreen(EducationTutorialScreen, {}),
    );

    const items: (MapUnitButton | TutorialEntryButton)[] = [
      tutorialButton,
      ...educationMaps.map((mapUnit, i) => new MapUnitButton(mapUnit, i)),
    ];
    this.pageSize = Math.min(items.length, ITEMS_PER_PAGE);

    for (let start = 0; start < items.length; start += ITEMS_PER_PAGE) {
      const page = new Container({ layout: pathFlex(this.vertical) });
      page.addChild(...joinWithLines(items.slice(start, start + ITEMS_PER_PAGE), this.vertical));
      this.pages.push(page);
    }

    if (this.pages[0]) this.addChild(this.pages[0]);
  }

  public get hasPrev() {
    return this.currentPage > 0;
  }

  public get hasNext() {
    return this.currentPage < this.pages.length - 1;
  }

  public resize(width: number, height: number) {
    resizePath(this, this.pageSize, width, height);
  }

  public async nextPage() {
    if (!this.hasNext) return;
    await this.goToPage(this.currentPage + 1);
  }

  public async prevPage() {
    if (!this.hasPrev) return;
    await this.goToPage(this.currentPage - 1);
  }

  private async goToPage(target: number) {
    await this.playExitAnimation();
    this.removeChild(this.pages[this.currentPage]);
    this.currentPage = target;
    this.addChild(this.pages[this.currentPage]);
    await this.playEnterAnimation();
  }

  private get pageChildren() {
    return (this.pages[this.currentPage]?.children ?? []) as Container[];
  }

  public async playEnterAnimation() {
    await playPathEnter(this, this.pageChildren, this.vertical);
  }

  public async playExitAnimation() {
    await playPathExit(this, this.pageChildren, this.vertical);
  }
}
