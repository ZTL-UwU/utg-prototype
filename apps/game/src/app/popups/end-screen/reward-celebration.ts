import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, type PointData } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { getRewardImageAlias, type RewardSimple } from '../../../zustandStores/rewardStore';

const BADGE_SIZE = 140;
const BADGE_GAP_RATIO = 1.2;

const POP_STAGGER = 0.12;
const POP_DURATION = 0.5;
const HOLD = 0.5;

const FLY_DURATION = 0.55;
const FLY_STAGGER = 0.08;
const FLY_END_SCALE = 0.15;

/** Newly earned badges: they pop in over the panel, then fly into the passport button. */
export class RewardCelebration extends Container {
  /** One wrapper per badge. Animation targets these, never the sprites inside. */
  private readonly badges: Container[];
  private readonly animations: AnimationPlaybackControls[] = [];

  constructor(rewards: RewardSimple[]) {
    super({
      // Absolute, so this is not flowed as a flex item and shares the popup's space.
      layout: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      },
    });

    this.badges = rewards.map((reward) => {
      const texture = Texture.from(getRewardImageAlias(reward.image_url));

      // Fit here so the wrapper can animate 0 -> 1 whatever the art's size.
      const sprite = new Sprite({ texture, anchor: 0.5 });
      const fitScale = BADGE_SIZE / Math.max(texture.width, texture.height);
      sprite.scale.set(fitScale);

      const badge = new Container();
      badge.alpha = 0;
      badge.scale.set(0);
      badge.addChild(sprite);
      this.addChild(badge);

      return badge;
    });
  }

  /** Pop in centred on `origin`, then fly into `target`; `onArrive` fires per landing. */
  public async play(origin: PointData, target: PointData, onArrive: () => void): Promise<void> {
    if (this.badges.length === 0) return;

    const spacing = BADGE_SIZE * BADGE_GAP_RATIO;
    const rowWidth = (this.badges.length - 1) * spacing;
    this.badges.forEach((badge, index) => {
      badge.position.set(origin.x - rowWidth / 2 + index * spacing, origin.y);
    });

    void engine().audio.sfx.play('preload-audio/sfx/popup.mp3');

    await Promise.all(
      this.badges.map((badge, index) => {
        const delay = index * POP_STAGGER;

        return Promise.all([
          this.track(
            animate(badge, { alpha: 1 }, { duration: POP_DURATION, ease: 'backOut', delay }),
          ),
          // Overshoot past full size, then settle.
          this.track(
            animate(
              badge.scale,
              { x: [0, 1.15, 0.95, 1.03, 1], y: [0, 1.15, 0.95, 1.03, 1] },
              {
                duration: POP_DURATION,
                delay,
                times: [0, 0.45, 0.65, 0.85, 1],
                ease: ['backOut', 'easeInOut', 'easeInOut', 'easeOut'],
              },
            ),
          ),
        ]);
      }),
    );

    await Promise.all(
      this.badges.map((badge, index) => {
        const delay = HOLD + index * FLY_STAGGER;

        // easeIn accelerates into the button, reading as "sucked in" not "drifting".
        const options = { duration: FLY_DURATION, ease: 'easeIn', delay } as const;

        return Promise.all([
          this.track(animate(badge.position, { x: target.x, y: target.y }, options)),
          this.track(animate(badge.scale, { x: FLY_END_SCALE, y: FLY_END_SCALE }, options)),
          this.track(animate(badge, { alpha: 0 }, options)),
        ]).then(onArrive);
      }),
    );
  }

  public stop() {
    for (const animation of this.animations) {
      animation.stop();
    }
    this.animations.length = 0;
  }

  private track(animation: AnimationPlaybackControls): AnimationPlaybackControls {
    this.animations.push(animation);
    return animation;
  }
}
