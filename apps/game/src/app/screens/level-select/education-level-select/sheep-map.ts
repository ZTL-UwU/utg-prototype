import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, type DestroyOptions } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { isPhone, topClearance } from '../../../../engine/utils/viewport';
import {
  getFirstUnfinishedMapUnitIndex,
  isMapUnitComplete,
  isMapUnitUnlocked,
} from '../../../../lib/progression';
import { useLevelProgress } from '../../../../zustandStores/levelProgressStore';
import { LockedLevelPopup } from '../../../popups/locked-level';
import { FreeScroll } from '../../../ui/free-scroll';
import { createMapSheep, hopSheep } from '../../../ui/map-sheep';
import { getLayerMaps, type TMapUnit } from '../../level-map/units';
import { ROCK_BASE_SIZE, RockButton, STAND_OFFSET_RATIO } from './rock-button';

const BACKGROUND_ALIAS = 'education-levels/education-level/background.png';

/** Wide screens: rock centres as fractions of the screen, following the mountain art. */
const WIDE_ROCK_POSITIONS = [
  { x: 0.13, y: 0.4 },
  { x: 0.29, y: 0.74 },
  { x: 0.49, y: 0.5 },
  { x: 0.71, y: 0.67 },
  { x: 0.86, y: 0.42 },
];
/** Wide screens: rock width as a fraction of screen height. */
const WIDE_ROCK_SIZE = 0.19;

/** Phones: rocks zig-zag down a tall map the player scrolls through. */
const PHONE_ROCK_SIZE = 300;
const PHONE_ROW_GAP = 400;
const PHONE_COLUMNS = [0.3, 0.7];
// Room kept above the first rock for the title, subtitle and the sheep standing on rock 1
const PHONE_TOP_SPACE = 640;
/** Space between the subtitle and the top of the sheep on rock 1. */
const PHONE_TITLE_GAP = 30;
const PHONE_BOTTOM_SPACE = 260;

/** Sheep width relative to a rock. */
const SHEEP_SIZE = 0.8;

function rockPosition(index: number, count: number, width: number, height: number) {
  if (count === WIDE_ROCK_POSITIONS.length) {
    const { x, y } = WIDE_ROCK_POSITIONS[index];
    return { x: x * width, y: y * height };
  }
  // Other unit counts spread evenly, alternating high and low.
  return {
    x: (0.1 + (0.8 * (index + 0.5)) / count) * width,
    y: (index % 2 === 0 ? 0.45 : 0.7) * height,
  };
}

/** Index of the last unit whose completion hop is waiting, consuming every pending flag. */
function consumeCompletedUnit(maps: TMapUnit[]): number {
  const progress = useLevelProgress.getState();
  let completed = -1;
  maps.forEach((mapUnit, index) => {
    if (progress.consumeMapUnitPendingAnimation('education', mapUnit.id)) completed = index;
  });
  return completed;
}

/**
 * The Alphabets map: one rock per education unit and a sheep standing on the current one.
 * Tapping a rock hops the sheep there, then opens that unit. A unit finished since the last
 * visit makes the sheep hop on to the next unfinished unit. Phones get a tall map scrolled
 * freely by dragging.
 */
export class SheepMap extends Container {
  private readonly maps = getLayerMaps('education');
  private readonly content = new Container();
  private readonly background: Sprite;
  private readonly rocks: RockButton[];
  private readonly sheep?: Sprite;
  private sheepIndex = 0;
  private sheepScale = 1;
  /** Where the sheep hops once the map is on screen, after a unit was completed. */
  private pendingHop?: number;
  private hopAnimation?: AnimationPlaybackControls;
  /** True while hopping or opening a unit, so taps are ignored. */
  private busy = false;

  private vertical = false;
  private scrolledIntoView = false;
  private readonly scroll: FreeScroll;

  /** Fired whenever the phone map scrolls, so the screen can move its titles along. */
  public onScroll?: (scrollY: number) => void;
  /** Where the screen's subtitle ends, so the sheep on rock 1 stands clear of it on phones. */
  public titleBottom?: number;

  private readonly onOpen: (mapUnit: TMapUnit) => void;

  constructor(onOpen: (mapUnit: TMapUnit) => void) {
    super();
    this.onOpen = onOpen;

    this.background = new Sprite({ texture: Texture.from(BACKGROUND_ALIAS), anchor: 0.5 });
    this.rocks = this.maps.map(
      (mapUnit, index) =>
        new RockButton(index, !isMapUnitUnlocked(mapUnit), () => void this.onRockTap(index)),
    );
    this.content.addChild(this.background, ...this.rocks);

    if (this.maps.length > 0) {
      this.sheep = createMapSheep();
      this.content.addChild(this.sheep);
      this.placeSheep();
    }
    this.addChild(this.content);

    this.scroll = new FreeScroll(this, this.content, (scrollY) => this.onScroll?.(scrollY));
  }

  /** Puts the sheep on the right rock and queues a hop after a completed unit. */
  private placeSheep() {
    const progress = useLevelProgress.getState();
    const completed = consumeCompletedUnit(this.maps);

    if (completed >= 0) {
      this.sheepIndex = completed;
      let next = getFirstUnfinishedMapUnitIndex('education', completed + 1);
      // Every unit done: the sheep stays on the one just finished
      if (isMapUnitComplete(this.maps[next])) next = completed;
      if (next !== completed) this.pendingHop = next;
      progress.setSheepUnit(this.maps[next].id);
      return;
    }

    const stored = this.maps.findIndex((mapUnit) => mapUnit.id === progress.sheepUnitId);
    this.sheepIndex = stored >= 0 ? stored : getFirstUnfinishedMapUnitIndex('education');
  }

  public resize(width: number, height: number) {
    this.vertical = isPhone();

    const rockSize = this.vertical ? PHONE_ROCK_SIZE : WIDE_ROCK_SIZE * height;
    const rockScale = rockSize / ROCK_BASE_SIZE;
    let top = PHONE_TOP_SPACE + topClearance(height);
    if (this.vertical && this.titleBottom !== undefined && this.sheep) {
      // Rock 1 sits low enough that the sheep standing on it clears the titles
      const { width: sheepWidth, height: sheepHeight } = this.sheep.texture;
      const sheepTall = rockSize * SHEEP_SIZE * (sheepHeight / sheepWidth);
      top = Math.max(
        top,
        this.titleBottom + PHONE_TITLE_GAP + sheepTall + rockSize * STAND_OFFSET_RATIO,
      );
    }

    this.rocks.forEach((rock, index) => {
      rock.setBaseScale(rockScale);
      if (this.vertical) {
        rock.position.set(
          PHONE_COLUMNS[index % PHONE_COLUMNS.length] * width,
          top + index * PHONE_ROW_GAP,
        );
      } else {
        const { x, y } = rockPosition(index, this.rocks.length, width, height);
        rock.position.set(x, y);
      }
    });

    const contentHeight = this.vertical
      ? Math.max(height, top + (this.rocks.length - 1) * PHONE_ROW_GAP + PHONE_BOTTOM_SPACE)
      : height;
    this.scroll.setBounds(width, height, contentHeight, this.vertical);

    // Cover the whole map, cropping whichever sides overflow
    const texture = this.background.texture;
    this.background.scale.set(Math.max(width / texture.width, contentHeight / texture.height));
    this.background.position.set(width / 2, contentHeight / 2);

    if (this.sheep) {
      this.sheepScale = (rockSize * SHEEP_SIZE) / this.sheep.texture.width;
      this.sheep.scale.set(this.sheepScale);
      if (!this.hopAnimation) this.sheep.position.copyFrom(this.sheepSpot(this.sheepIndex));
    }

    // Start with the sheep in view, once; after that only the player moves the map
    if (this.vertical && !this.scrolledIntoView && this.rocks[this.sheepIndex]) {
      this.scrolledIntoView = true;
      this.scroll.setScroll(height / 2 - this.rocks[this.sheepIndex].y);
    }
  }

  private sheepSpot(index: number) {
    const rock = this.rocks[index];
    return { x: rock.x, y: rock.y - rock.standOffset };
  }

  private async onRockTap(index: number) {
    if (this.busy || this.scroll.dragged) return;
    const mapUnit = this.maps[index];
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');

    if (this.rocks[index].locked) {
      void engine().navigation.showPopup(LockedLevelPopup, {
        layer: 'education',
        onClose: () => {},
      });
      return;
    }

    this.busy = true;
    if (index !== this.sheepIndex) await this.hopTo(index);
    useLevelProgress.getState().setSheepUnit(mapUnit.id);
    this.onOpen(mapUnit);
  }

  /** Hops the sheep straight to another rock in one arc. Never moves the scroll. */
  private async hopTo(index: number) {
    const sheep = this.sheep;
    if (!sheep || this.destroyed) return;

    this.hopAnimation?.stop();
    this.hopAnimation = hopSheep(
      sheep,
      { x: sheep.x, y: sheep.y },
      this.sheepSpot(index),
      this.sheepScale,
    );
    await this.hopAnimation;
    this.hopAnimation = undefined;
    this.sheepIndex = index;
    if (!sheep.destroyed) {
      sheep.scale.x = this.sheepScale;
      sheep.position.copyFrom(this.sheepSpot(index));
    }
  }

  /** Plays the hop owed for a unit finished since the last visit. */
  public async playPendingHop() {
    if (this.pendingHop === undefined) return;
    const target = this.pendingHop;
    this.pendingHop = undefined;
    this.busy = true;
    await this.hopTo(target);
    this.busy = false;
  }

  /** Rocks and sheep, which come and go while the background stays put. */
  private get pieces(): Container[] {
    return this.sheep ? [...this.rocks, this.sheep] : this.rocks;
  }

  public async playEnterAnimation() {
    for (const piece of this.pieces) piece.alpha = 1;
    const animations: Promise<void>[] = this.rocks.map((rock, index) =>
      rock.playEnter(index * 0.06),
    );
    const sheep = this.sheep;
    if (sheep) {
      sheep.alpha = 0;
      // motion's controls are only thenable, so await them into a real Promise
      animations.push(
        (async () => {
          await animate(sheep, { alpha: 1 }, { duration: 0.25, delay: this.rocks.length * 0.06 });
        })(),
      );
    }
    await Promise.all(animations);
  }

  public async playExitAnimation() {
    await Promise.all(this.pieces.map((piece) => animate(piece, { alpha: 0 }, { duration: 0.2 })));
  }

  public override destroy(options?: DestroyOptions) {
    this.hopAnimation?.stop();
    super.destroy(options);
  }
}
