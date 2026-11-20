import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Text, Texture, type DestroyOptions } from 'pixi.js';

import { isPhone, topClearance } from '../../../engine/utils/viewport';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { convertToCurrentScript, getScriptFontFamily } from '../../../utils/script';
import { ScrollingMap } from '../../ui/scrolling-map';
import { TUMBLEWEED_SIZE, TumbleweedButton } from './tumbleweed-button';
import { getLayerMaps, type TMapUnit } from './units';

const BACKGROUND_ALIAS = 'typing-levels/typing-level-map/background.png';
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
/** Wide screens: share of its column a group may span, keeping a gap between neighbours. */
const WIDE_FIT_SHARE = 0.95;

/** Phones: groups stacked down a tall map the player scrolls through. */
const PHONE_SCALE = 0.85;
/** Phones: share of the screen half a group may span, so its tumbleweeds stay on screen. */
const PHONE_FIT_WIDTH = 0.48;
/** Phones centre every cactus in the column. */
const PHONE_CENTER_X = 0.5;
const PHONE_ROW_GAP = 640;
// Room kept above the first cactus for the title
const PHONE_TOP_SPACE = 360;
const PHONE_BOTTOM_SPACE = 200;

function createCactusView(): Sprite {
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
  /** How far the lowest tumbleweed reaches below the cactus base, before scaling. */
  public readonly bottom: number;
  private enterAnimation?: AnimationPlaybackControls;
  public readonly levelCount: number;

  constructor(mapUnit: TMapUnit, isDragging: () => boolean) {
    super();
    this.levelCount = mapUnit.levels.length;
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
    let bottom = 0;
    mapUnit.levels.forEach((level, index) => {
      // -1 at the left end, 1 at the right; the middle ones dip lower
      const t = count > 1 ? (index / (count - 1)) * 2 - 1 : 0;
      const tumbleweed = new TumbleweedButton(level, mapUnit, index + 1, isDragging);
      tumbleweed.position.set(
        (index - (count - 1) / 2) * TUMBLEWEED_SPACING,
        -TUMBLEWEED_RISE + (count > 2 ? TUMBLEWEED_DIP * (1 - Math.abs(t)) : 0),
      );
      bottom = Math.max(bottom, tumbleweed.y + TUMBLEWEED_SIZE / 2);
      this.addChild(tumbleweed);
    });
    this.bottom = bottom;

    // Above the tumbleweeds, so the name always reads
    this.addChild(label);
  }

  /** Half the group's width, tumbleweeds included, before scaling. */
  public get halfWidth() {
    return (Math.max(this.levelCount - 1, 0) * TUMBLEWEED_SPACING) / 2 + TUMBLEWEED_SIZE / 2;
  }

  /** The scale the group rests at, which a running enter pop is still growing towards. */
  public get restingScale() {
    return this.baseScale;
  }

  public setBaseScale(scale: number) {
    this.baseScale = scale;
    // A running enter pop scales from baseScale each frame, so it follows on its own.
    if (!this.enterAnimation) this.scale.set(scale);
  }

  /** Pops the group in, as a factor of `baseScale` so a resize part way through still lands. */
  public async playEnter(delay: number) {
    this.alpha = 1;
    this.scale.set(0);
    const animation = animate(0, 1, {
      duration: 0.35,
      delay,
      ease: 'backOut',
      onUpdate: (factor) => this.scale.set(this.baseScale * factor),
    });
    this.enterAnimation = animation;
    await animation;
    if (this.enterAnimation === animation) this.enterAnimation = undefined;
  }

  public override destroy(options?: DestroyOptions) {
    this.enterAnimation?.stop();
    super.destroy(options);
  }
}

/**
 * The typing layer's map: one cactus per typing unit across the desert, each named after its
 * unit, with that unit's levels as tumbleweeds that open straight into the level. Phones get
 * a tall map scrolled freely by dragging.
 */
export class TypingJourney extends ScrollingMap {
  private readonly groups: CactusGroup[];
  /** Index of the unit the player came from, scrolled into view on phones. */
  private readonly focusIndex: number;
  private scrolledIntoView = false;

  constructor(focus: TMapUnit) {
    super(BACKGROUND_ALIAS);
    const maps = getLayerMaps('typing');
    this.groups = maps.map((mapUnit) => new CactusGroup(mapUnit, this.isDragging));
    this.focusIndex = Math.max(
      0,
      maps.findIndex((mapUnit) => mapUnit.id === focus.id),
    );
    this.content.addChild(...this.groups);
  }

  public resize(width: number, height: number) {
    const vertical = isPhone();
    const count = this.groups.length;
    let contentHeight = height;

    if (vertical) {
      const top = PHONE_TOP_SPACE + topClearance(height) + CACTUS_HEIGHT * PHONE_SCALE;
      this.groups.forEach((group, index) => {
        const fit = (width * PHONE_FIT_WIDTH) / group.halfWidth;
        group.setBaseScale(Math.min(PHONE_SCALE, fit));
        group.position.set(PHONE_CENTER_X * width, top + index * PHONE_ROW_GAP);
      });
      contentHeight = Math.max(height, top + (count - 1) * PHONE_ROW_GAP + PHONE_BOTTOM_SPACE);
    } else {
      this.groups.forEach((group, index) => {
        const fit = width / count / 2 / group.halfWidth;
        group.setBaseScale(Math.min(height * WIDE_SCALE, fit * WIDE_FIT_SHARE));
        group.position.set(
          ((index + 0.5) / count) * width,
          WIDE_BASES[index % WIDE_BASES.length] * height,
        );
      });
    }

    this.setContentHeight(width, height, contentHeight, vertical);

    // Start with the unit the player came from in view, once; after that only they scroll
    const focus = this.groups[this.focusIndex];
    if (vertical && !this.scrolledIntoView && focus) {
      this.scrolledIntoView = true;
      // The group's origin is the cactus base; its tumbleweeds hang a little below it. Its
      // resting scale, since it may still be popping in from nothing.
      const scale = focus.restingScale;
      this.scrollIntoView(focus.y - CACTUS_HEIGHT * scale, focus.y + focus.bottom * scale, height);
    }
  }

  public async playEnterAnimation() {
    await Promise.all(this.groups.map((group, index) => group.playEnter(index * 0.08)));
  }

  public async playExitAnimation() {
    await Promise.all(this.groups.map((group) => animate(group, { alpha: 0 }, { duration: 0.2 })));
  }
}
