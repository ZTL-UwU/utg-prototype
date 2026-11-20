import { Assets, Container, Sprite, Text, Texture, type DestroyOptions } from 'pixi.js';

import { isLevelFinished, isLevelUnlocked } from '../../../lib/progression';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { toRoman } from '../../../utils/roman';
import { makeLevelStop } from './level-stop';
import type { TLevel, TMapUnit } from './units';

const TUMBLEWEED_ALIAS = 'typing-levels/typing-level-map/tumbleweed.png';
const PADLOCK_ALIAS = 'locked-popup/padlock.png';
const STAR_ALIAS = 'end-screen/full-star.png';

/** Width every tumbleweed is drawn at before its cactus group scales it. */
export const TUMBLEWEED_SIZE = 190;
const NUMERAL_COLOR = 0x2f4a3a;
const LOCKED_TINT = 0x9a9a9a;
const HOVER_SCALE = 1.08;

/** One typing level on the journey map: a tumbleweed with the level's Roman numeral. */
export class TumbleweedButton extends Container {
  private readonly stopHover: () => void;

  constructor(
    level: TLevel,
    mapUnit: TMapUnit,
    position: number,
    /** True while the map is being dragged, so the press scrolls instead of opening. */
    isDragging: () => boolean,
  ) {
    super();

    const unlocked = isLevelUnlocked(level);

    const view = new Sprite({ texture: Texture.from(TUMBLEWEED_ALIAS), anchor: 0.5 });
    view.scale.set(TUMBLEWEED_SIZE / view.texture.width);
    if (!unlocked) view.tint = LOCKED_TINT;
    this.addChild(view);

    if (!unlocked && Assets.cache.has(PADLOCK_ALIAS)) {
      const padlock = new Sprite({ texture: Texture.from(PADLOCK_ALIAS), anchor: 0.5 });
      padlock.scale.set((TUMBLEWEED_SIZE * 0.5) / padlock.texture.width);
      this.addChild(padlock);
    }

    const numeral = new Text({
      text: toRoman(position),
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: unlocked ? 90 : 50,
        fontWeight: 'bold',
        fill: NUMERAL_COLOR,
        stroke: { color: 0xffffff, width: unlocked ? 4 : 3 },
      },
      anchor: 0.5,
    });
    if (!unlocked) numeral.y = TUMBLEWEED_SIZE * 0.08;
    this.addChild(numeral);

    if (unlocked && isLevelFinished(mapUnit.type, level.id) && Assets.cache.has(STAR_ALIAS)) {
      const star = new Sprite({ texture: Texture.from(STAR_ALIAS), anchor: 0.5 });
      star.scale.set((TUMBLEWEED_SIZE * 0.32) / star.texture.width);
      star.position.set(TUMBLEWEED_SIZE * 0.34, -TUMBLEWEED_SIZE * 0.34);
      this.addChild(star);
    }

    this.stopHover = makeLevelStop(this, {
      level,
      mapUnit,
      isDragging,
      hoverScale: HOVER_SCALE,
    });
  }

  public override destroy(options?: DestroyOptions) {
    this.stopHover();
    super.destroy(options);
  }
}
