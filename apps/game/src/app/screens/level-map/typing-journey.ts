import { animate } from 'motion';
import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { isPhone, topClearance } from '../../../engine/utils/viewport';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { convertToCurrentScript, getScriptFontFamily } from '../../../utils/script';
import { FreeScroll } from '../../ui/free-scroll';
import { TUMBLEWEED_SIZE, TumbleweedButton } from './tumbleweed-button';
import { getLayerMaps, type TMapUnit } from './units';

const BACKGROUND_ALIAS = 'typing-levels/typing-level-map/background.png';
/** Swap when the final art lands; a missing texture falls back to a drawn cactus. */
const CACTUS_ALIAS = 'typing-levels/typing-level-map/cactus.png';

/** Cactus height every group is drawn at before it is scaled; the group origin is its base. */
const CACTUS_HEIGHT = 520;
/** Gap between tumbleweed centres, and how much lower the middle ones sit. */
const TUMBLEWEED_SPACING = 165;
const TUMBLEWEED_DIP = 70;
/** Tumbleweed centres sit this far above the cactus base, before the dip. */
const TUMBLEWEED_RISE = 60;

/** Wide screens: group scale per unit of screen height, and base heights repeating left to right. */
const WIDE_SCALE = 0.00068;
const WIDE_BASES = [0.8, 0.68, 0.8];

/** Phones: groups stacked down a tall map the player scrolls through. */
const PHONE_SCALE = 0.85;
/** Phones centre every cactus in the column. */
const PHONE_CENTER_X = 0.5;
const PHONE_ROW_GAP = 640;
// Room kept above the first cactus for the title
const PHONE_TOP_SPACE = 360;
const PHONE_BOTTOM_SPACE = 200;

/** A drawn stand-in saguaro, until the cactus artwork is in the asset bundle. */
function createPlaceholderCactus(): Graphics {
  const h = CACTUS_HEIGHT;
  const trunk = h * 0.2;
  const arm = trunk * 0.7;
  return new Graphics()
    .roundRect(-trunk / 2, -h, trunk, h, trunk / 2)
    .fill(0x6fbf4a)
    .roundRect(-trunk / 2 - arm * 1.6, -h * 0.62, arm, h * 0.3, arm / 2)
    .fill(0x5aa63b)
    .roundRect(-trunk / 2 - arm * 1.6, -h * 0.38, arm * 2, arm, arm / 2)
    .fill(0x5aa63b)
    .roundRect(trunk / 2 + arm * 0.6, -h * 0.72, arm, h * 0.28, arm / 2)
    .fill(0x5aa63b)
    .roundRect(trunk / 2 - arm * 0.4, -h * 0.5, arm * 2, arm, arm / 2)
    .fill(0x5aa63b);
}

function createCactusView(): Container {
  if (!Assets.cache.has(CACTUS_ALIAS)) return createPlaceholderCactus();
  const sprite = new Sprite({ texture: Texture.from(CACTUS_ALIAS), anchor: { x: 0.5, y: 1 } });
  sprite.scale.set(CACTUS_HEIGHT / sprite.texture.height);
  return sprite;
}

/** The unit's name as the unit map shows it: its subtitle in the current script, else its title. */
function unitName(mapUnit: TMapUnit): { text: string; fontFamily: string | string[] } {
  if (mapUnit.subtitle) {
    return {
      text: convertToCurrentScript(mapUnit.subtitle.text).toLocaleUpperCase(),
      fontFamily: getScriptFontFamily(),
    };
  }
  return { text: mapUnit.title.text.toLocaleUpperCase(), fontFamily: DISPLAY_FONT_FAMILY };
}

/** One typing unit: a cactus with the unit's name, and a tumbleweed per level at its base. */
class CactusGroup extends Container {
  private baseScale = 1;

  constructor(mapUnit: TMapUnit, isDragging: () => boolean) {
    super();
    this.addChild(createCactusView());

    const name = unitName(mapUnit);
    const label = new Text({
      text: name.text,
      style: {
        fontFamily: name.fontFamily,
        fontSize: 72,
        fontWeight: '800',
        fill: 0xfdf3e1,
        stroke: { color: 0x5b3b1c, width: 8 },
        padding: 8,
      },
      anchor: 0.5,
    });
    label.y = -CACTUS_HEIGHT * 0.42;

    const count = mapUnit.levels.length;
    mapUnit.levels.forEach((level, index) => {
      // -1 at the left end, 1 at the right; the middle ones dip lower
      const t = count > 1 ? (index / (count - 1)) * 2 - 1 : 0;
      const tumbleweed = new TumbleweedButton(level, mapUnit, index + 1, isDragging);
      tumbleweed.position.set(
        (index - (count - 1) / 2) * TUMBLEWEED_SPACING,
        -TUMBLEWEED_RISE + (count > 2 ? TUMBLEWEED_DIP * (1 - Math.abs(t)) : 0),
      );
      this.addChild(tumbleweed);
    });

    // Above the tumbleweeds, so the name always reads
    this.addChild(label);
  }

  /** Half the group's width, tumbleweeds included, before scaling. */
  public static halfWidth(levelCount: number) {
    return (Math.max(levelCount - 1, 0) * TUMBLEWEED_SPACING) / 2 + TUMBLEWEED_SIZE / 2;
  }

  public setBaseScale(scale: number) {
    this.baseScale = scale;
    this.scale.set(scale);
  }

  public async playEnter(delay: number) {
    this.alpha = 1;
    this.scale.set(0);
    await animate(
      this.scale,
      { x: this.baseScale, y: this.baseScale },
      { duration: 0.35, delay, ease: 'backOut' },
    );
  }
}

/**
 * The typing layer's map: one cactus per typing unit across the desert, each named after its
 * unit, with that unit's levels as tumbleweeds that open straight into the level. Phones get
 * a tall map scrolled freely by dragging.
 */
export class TypingJourney extends Container {
  private readonly maps = getLayerMaps('typing');
  private readonly content = new Container();
  private readonly background: Sprite;
  private readonly groups: CactusGroup[];
  private readonly scroll: FreeScroll;
  /** Index of the unit the player came from, scrolled into view on phones. */
  private readonly focusIndex: number;
  private scrolledIntoView = false;

  /** Fired whenever the phone map scrolls, so the screen can move its title along. */
  public onScroll?: (scrollY: number) => void;

  constructor(focus: TMapUnit) {
    super();

    this.background = new Sprite({ texture: Texture.from(BACKGROUND_ALIAS), anchor: 0.5 });
    this.groups = this.maps.map((mapUnit) => new CactusGroup(mapUnit, () => this.scroll.dragged));
    this.focusIndex = Math.max(
      0,
      this.maps.findIndex((mapUnit) => mapUnit.id === focus.id),
    );
    this.content.addChild(this.background, ...this.groups);
    this.addChild(this.content);

    this.scroll = new FreeScroll(this, this.content, (scrollY) => this.onScroll?.(scrollY));
  }

  public resize(width: number, height: number) {
    const vertical = isPhone();
    const count = this.groups.length;
    let contentHeight = height;

    if (vertical) {
      const top = PHONE_TOP_SPACE + topClearance(height) + CACTUS_HEIGHT * PHONE_SCALE;
      this.groups.forEach((group, index) => {
        // Narrow phones shrink a wide group so its tumbleweeds stay on screen
        const fit = (width * 0.48) / CactusGroup.halfWidth(this.maps[index].levels.length);
        group.setBaseScale(Math.min(PHONE_SCALE, fit));
        group.position.set(PHONE_CENTER_X * width, top + index * PHONE_ROW_GAP);
      });
      contentHeight = Math.max(height, top + (count - 1) * PHONE_ROW_GAP + PHONE_BOTTOM_SPACE);
    } else {
      this.groups.forEach((group, index) => {
        const fit = width / count / 2 / CactusGroup.halfWidth(this.maps[index].levels.length);
        group.setBaseScale(Math.min(height * WIDE_SCALE, fit * 0.95));
        group.position.set(
          ((index + 0.5) / count) * width,
          WIDE_BASES[index % WIDE_BASES.length] * height,
        );
      });
    }

    this.scroll.setBounds(width, height, contentHeight, vertical);

    // Cover the whole map, cropping whichever sides overflow
    const texture = this.background.texture;
    this.background.scale.set(Math.max(width / texture.width, contentHeight / texture.height));
    this.background.position.set(width / 2, contentHeight / 2);

    // Start with the unit the player came from in view, once; after that only they scroll
    const focus = this.groups[this.focusIndex];
    if (vertical && !this.scrolledIntoView && focus) {
      this.scrolledIntoView = true;
      this.scroll.setScroll(height / 2 - (focus.y - (CACTUS_HEIGHT * focus.scale.y) / 2));
    }
  }

  public async playEnterAnimation() {
    await Promise.all(this.groups.map((group, index) => group.playEnter(index * 0.08)));
  }

  public async playExitAnimation() {
    await Promise.all(this.groups.map((group) => animate(group, { alpha: 0 }, { duration: 0.2 })));
  }
}
