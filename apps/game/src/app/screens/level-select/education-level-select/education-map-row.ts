import { animate } from 'motion';
import { Container, Graphics } from 'pixi.js';

import { EducationLevelSelect } from '.';
import { engine } from '../../../../engine/getEngine';
import { EducationTutorialScreen } from '../../education-level/level-tutorial';
import { getLayerMaps } from '../../level-map/units';
import { MapUnitButton } from './map-unit-button';
import { TutorialEntryButton } from './tutorial-entry-button';

const ITEMS_PER_PAGE = 3;

export class EducationMapRow extends Container {
  private pages: Container[] = [];
  private currentPage = 0;

  constructor() {
    super({
      layout: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      },
    });

    const educationMaps = getLayerMaps('education');

    const openTutorial: () => void = () => {
      const firstMap = getLayerMaps('education')[0];
      if (!firstMap) return;
      void engine().navigation.showScreen(EducationTutorialScreen, {
        mapUnit: firstMap,
        onBack: () => void engine().navigation.showScreen(EducationLevelSelect),
      });
    };
    const tutorialButton = new TutorialEntryButton(openTutorial);

    const items: (MapUnitButton | TutorialEntryButton)[] = [
      tutorialButton,
      ...educationMaps.map((mapUnit, i) => new MapUnitButton(mapUnit, i)),
    ];

    for (let start = 0; start < items.length; start += ITEMS_PER_PAGE) {
      const chunk = items.slice(start, start + ITEMS_PER_PAGE);
      const page = new Container({
        layout: {
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
        },
      });

      chunk.forEach((item, i) => {
        if (i > 0) {
          const fillerLine = new Graphics({ layout: { width: 80, height: 15 } })
            .roundRect(0, 0, 100, 15, 10)
            .fill(0xa66129);
          page.addChild(fillerLine);
        }
        page.addChild(item);
      });

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

  public async nextPage(screenHeight: number) {
    if (!this.hasNext) return;
    await this.goToPage(this.currentPage + 1, screenHeight);
  }

  public async prevPage(screenHeight: number) {
    if (!this.hasPrev) return;
    await this.goToPage(this.currentPage - 1, screenHeight);
  }

  private async goToPage(target: number, screenHeight: number) {
    await this.playExitAnimation(screenHeight);
    this.removeChild(this.pages[this.currentPage]);
    this.currentPage = target;
    this.addChild(this.pages[this.currentPage]);
    await this.playEnterAnimation(screenHeight);
  }

  private offScreenOffset(child: Container, screenHeight: number) {
    return screenHeight + 40 - child.getGlobalPosition().y;
  }

  public async playEnterAnimation(screenHeight: number) {
    const children = this.pages[this.currentPage]?.children ?? [];

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
    const children = this.pages[this.currentPage]?.children ?? [];

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
