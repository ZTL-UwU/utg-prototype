import { animate, type AnimationPlaybackControls } from 'motion';
import { Assets, Container, Graphics, Sprite, Text, Texture, type DestroyOptions } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { hasCompletedLevel, isLevelUnlocked } from '../../../lib/progression';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { toRoman } from '../../../utils/roman';
import { useLevelProgress } from '../../../zustandStores/levelProgressStore';
import { LevelLoadingScreen } from '../level-loading';
import type { TLevel, TMapUnit } from './units';

/** Swap when the final art lands; a missing texture falls back to a drawn tumbleweed. */
const TUMBLEWEED_ALIAS = 'typing-levels/typing-level-map/tumbleweed.png';
const PADLOCK_ALIAS = 'locked-popup/padlock.png';
const STAR_ALIAS = 'end-screen/full-star.png';

/** Width every tumbleweed is drawn at before its cactus group scales it. */
export const TUMBLEWEED_SIZE = 190;
const NUMERAL_COLOR = 0x2f4a3a;
const LOCKED_TINT = 0x9a9a9a;
const HOVER_SCALE = 1.08;

/** A drawn stand-in tumbleweed: a loose ball of brown scribbles. */
function createPlaceholderTumbleweed(): Graphics {
  const radius = TUMBLEWEED_SIZE / 2;
  const g = new Graphics().circle(0, 0, radius).fill({ color: 0xd8b07a, alpha: 0.35 });
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const offset = radius * 0.18;
    g.circle(
      Math.cos(angle) * offset,
      Math.sin(angle) * offset,
      radius * (0.6 + (i % 3) * 0.12),
    ).stroke({ color: 0x9c7446, width: 3, alpha: 0.7 });
  }
  return g;
}

function createTumbleweedView(): Container {
  if (!Assets.cache.has(TUMBLEWEED_ALIAS)) return createPlaceholderTumbleweed();
  const sprite = new Sprite({ texture: Texture.from(TUMBLEWEED_ALIAS), anchor: 0.5 });
  sprite.scale.set(TUMBLEWEED_SIZE / sprite.texture.width);
  return sprite;
}

/** One typing level on the journey map: a tumbleweed with the level's Roman numeral. */
export class TumbleweedButton extends Container {
  private hoverAnimation?: AnimationPlaybackControls;

  constructor(
    level: TLevel,
    mapUnit: TMapUnit,
    position: number,
    /** True while the map is being dragged, so the press scrolls instead of opening. */
    isDragging: () => boolean,
  ) {
    super();

    const unlocked = isLevelUnlocked(level);
    const playable = !!level.screen;

    const view = createTumbleweedView();
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

    // Levels that can never earn a star fall back to the local "played it once" flag.
    const finished =
      unlocked &&
      (hasCompletedLevel(level.id) ||
        useLevelProgress.getState().isAttempted(mapUnit.type, level.id));
    if (finished && Assets.cache.has(STAR_ALIAS)) {
      const star = new Sprite({ texture: Texture.from(STAR_ALIAS), anchor: 0.5 });
      star.scale.set((TUMBLEWEED_SIZE * 0.32) / star.texture.width);
      star.position.set(TUMBLEWEED_SIZE * 0.34, -TUMBLEWEED_SIZE * 0.34);
      this.addChild(star);
    }

    // Levels without a screen have nothing to play, so they stay disabled.
    if (!playable) {
      this.alpha = 0.5;
      return;
    }

    this.eventMode = 'static';
    this.cursor = 'pointer';
    let opening = false;
    this.on('pointertap', () => {
      if (opening || isDragging()) return;
      opening = true;
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showScreen(LevelLoadingScreen, { level, mapUnit });
    });
    this.on('pointerover', () => this.animateHover(HOVER_SCALE));
    this.on('pointerout', () => this.animateHover(1));
  }

  private animateHover(scale: number) {
    this.hoverAnimation?.stop();
    this.hoverAnimation = animate(this.scale, { x: scale, y: scale }, { duration: 0.15 });
  }

  public override destroy(options?: DestroyOptions) {
    this.hoverAnimation?.stop();
    super.destroy(options);
  }
}
