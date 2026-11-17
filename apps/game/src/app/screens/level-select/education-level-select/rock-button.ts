import { animate, type AnimationPlaybackControls } from 'motion';
import { Assets, Container, Sprite, Text, Texture, type DestroyOptions } from 'pixi.js';

import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';

const ROCK_ALIAS = 'education-levels/education-level-map/rock.png';
const PADLOCK_ALIAS = 'locked-popup/padlock.png';

/** Width every rock is drawn at before the map scales it. */
export const ROCK_BASE_SIZE = 260;
/** Height above a rock's centre where a standing sheep's feet rest, as a share of its width. */
export const STAND_OFFSET_RATIO = 0.3;
const LOCKED_TINT = 0x9a9a9a;
const HOVER_SCALE = 1.08;

function createRockView(): Sprite {
  const sprite = new Sprite({ texture: Texture.from(ROCK_ALIAS), anchor: 0.5 });
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
  private enterAnimation?: AnimationPlaybackControls;
  public readonly locked: boolean;

  constructor(index: number, locked: boolean, onTap: () => void) {
    super();
    this.locked = locked;

    const rock = createRockView();
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
    return ROCK_BASE_SIZE * STAND_OFFSET_RATIO * this.baseScale;
  }

  public setBaseScale(scale: number) {
    this.baseScale = scale;
    this.hoverAnimation?.stop();
    // A running enter pop scales from baseScale each frame, so it follows on its own.
    if (!this.enterAnimation) this.scale.set(scale);
  }

  /**
   * Pops the rock in. It animates a factor of `baseScale` rather than the scale itself, so a
   * resize part way through never has to stop it, which would leave this promise unresolved.
   */
  public async playEnter(delay: number) {
    this.hoverAnimation?.stop();
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

  private animateHover(factor: number) {
    if (this.enterAnimation) return;
    this.hoverAnimation?.stop();
    const target = this.baseScale * factor;
    this.hoverAnimation = animate(this.scale, { x: target, y: target }, { duration: 0.15 });
  }

  public override destroy(options?: DestroyOptions) {
    this.hoverAnimation?.stop();
    this.enterAnimation?.stop();
    super.destroy(options);
  }
}
