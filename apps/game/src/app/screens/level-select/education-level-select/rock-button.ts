import { animate, type AnimationPlaybackControls } from 'motion';
import { Assets, Container, Graphics, Sprite, Text, Texture, type DestroyOptions } from 'pixi.js';

import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';

/** Swap these when the final art lands; missing textures fall back to a drawn rock. */
export const ROCK_ALIAS = 'education-levels/education-level-map/rock.png';
export const ROCK_LOCKED_ALIAS = 'education-levels/education-level-map/rock-locked.png';
const PADLOCK_ALIAS = 'locked-popup/padlock.png';

/** Width every rock is drawn at before the map scales it. */
export const ROCK_BASE_SIZE = 260;
const LOCKED_TINT = 0x9a9a9a;
const HOVER_SCALE = 1.08;

/** A drawn stand-in rock, used until the rock artwork is in the asset bundle. */
function createPlaceholderRock(): Graphics {
  const w = ROCK_BASE_SIZE;
  const h = ROCK_BASE_SIZE * 0.85;
  return new Graphics()
    .poly([
      -w * 0.42,
      h * 0.45,
      -w * 0.5,
      h * 0.05,
      -w * 0.36,
      -h * 0.32,
      -w * 0.08,
      -h * 0.48,
      w * 0.22,
      -h * 0.44,
      w * 0.44,
      -h * 0.2,
      w * 0.5,
      h * 0.18,
      w * 0.38,
      h * 0.48,
    ])
    .fill(0x6f6f6f)
    .poly([
      -w * 0.36,
      -h * 0.32,
      -w * 0.08,
      -h * 0.48,
      w * 0.22,
      -h * 0.44,
      w * 0.44,
      -h * 0.2,
      w * 0.1,
      -h * 0.12,
      -w * 0.3,
      -h * 0.1,
    ])
    .fill(0x8c8c8c);
}

function createRockView(locked: boolean): Container {
  const alias = locked && Assets.cache.has(ROCK_LOCKED_ALIAS) ? ROCK_LOCKED_ALIAS : ROCK_ALIAS;
  if (!Assets.cache.has(alias)) return createPlaceholderRock();

  const sprite = new Sprite({ texture: Texture.from(alias), anchor: 0.5 });
  sprite.scale.set(ROCK_BASE_SIZE / sprite.texture.width);
  return sprite;
}

/**
 * One education unit on the sheep map: a rock with the unit number printed on it, and a
 * padlock over it while the unit is locked.
 */
export class RockButton extends Container {
  /** Scale the map gives this rock; hover grows from it. */
  private baseScale = 1;
  private hoverAnimation?: AnimationPlaybackControls;
  public readonly locked: boolean;

  constructor(index: number, locked: boolean, onTap: () => void) {
    super();
    this.locked = locked;

    const rock = createRockView(locked);
    if (locked) rock.tint = LOCKED_TINT;

    const number = new Text({
      text: String(index + 1),
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: locked ? 70 : 130,
        fontWeight: 'bold',
        fill: 0x111111,
        stroke: { color: 0xffffff, width: locked ? 6 : 10 },
      },
      anchor: 0.5,
    });

    this.addChild(rock);
    if (locked && Assets.cache.has(PADLOCK_ALIAS)) {
      const padlock = new Sprite({ texture: Texture.from(PADLOCK_ALIAS), anchor: 0.5 });
      padlock.scale.set((ROCK_BASE_SIZE * 0.45) / padlock.texture.width);
      this.addChild(padlock);
      number.y = ROCK_BASE_SIZE * 0.06;
    }
    this.addChild(number);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', onTap);
    if (locked) return;

    this.on('pointerover', () => this.animateHover(HOVER_SCALE));
    this.on('pointerout', () => this.animateHover(1));
  }

  /** Height above the rock's centre where the sheep's feet rest, in the rock's parent space. */
  public get standOffset() {
    return ROCK_BASE_SIZE * 0.3 * this.baseScale;
  }

  public setBaseScale(scale: number) {
    this.baseScale = scale;
    this.hoverAnimation?.stop();
    this.scale.set(scale);
  }

  public async playEnter(delay: number) {
    this.scale.set(0);
    await animate(
      this.scale,
      { x: this.baseScale, y: this.baseScale },
      { duration: 0.35, delay, ease: 'backOut' },
    );
  }

  private animateHover(factor: number) {
    this.hoverAnimation?.stop();
    const target = this.baseScale * factor;
    this.hoverAnimation = animate(this.scale, { x: target, y: target }, { duration: 0.15 });
  }

  public override destroy(options?: DestroyOptions) {
    this.hoverAnimation?.stop();
    super.destroy(options);
  }
}
