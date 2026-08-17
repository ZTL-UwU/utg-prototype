import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Graphics, Texture, Text, type DestroyOptions } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { hasCompletedLevel, isLevelUnlocked } from '../../../lib/progression';
import { useLevelProgress } from '../../../zustandStores/levelProgressStore';
import { drawDashedRing, FILL_ANIM_DELAY, FILL_ANIM_DURATION } from '../../ui/dashed-ring';
import { LevelSplashScreen } from '../level-splash';
import type { TLevel, TMapUnit } from './units';

const SIZE = 221;
const BUTTON_RADIUS = SIZE / 2;
const RING_IDLE_RADIUS = BUTTON_RADIUS + 5;
const RING_HOVER_RADIUS = BUTTON_RADIUS - 3;

export class LevelButton extends FancyButton {
  private ring: Graphics;
  private ringAnimation?: AnimationPlaybackControls;
  private fillAnimation?: AnimationPlaybackControls;
  private currentRadius = RING_IDLE_RADIUS;
  private currentFill = 0;

  constructor(level: TLevel, mapUnit: TMapUnit, idx: number) {
    const unlocked = isLevelUnlocked(level);
    super({
      defaultView: Texture.from(
        unlocked ? 'ui/map-button-unlocked.png' : 'ui/map-button-locked.svg',
      ),
      anchor: 0.5,
      animations: {
        hover: unlocked
          ? {
              props: { scale: { x: 1.1, y: 1.1 } },
              duration: 200,
            }
          : undefined,
      },
      text: unlocked
        ? new Text({
            text: String(idx),
            style: {
              fontFamily: 'Concert One',
              fontSize: 110,
              fontWeight: 'bold',
              fill: 0x8b4513,
            },
          })
        : undefined,
    });

    this.layout = {
      width: SIZE,
      height: SIZE,
      isLeaf: true,
    };

    this.ring = new Graphics();
    if (unlocked) {
      const progress = useLevelProgress.getState();
      this.currentFill = hasCompletedLevel(level.id) ? 1 : 0;
      drawDashedRing(this.ring, this.currentRadius, this.currentFill);
      this.addChild(this.ring);

      if (progress.consumePendingAnimation(mapUnit.type, level.id)) {
        this.currentFill = 0;
        drawDashedRing(this.ring, this.currentRadius, 0);
        this.fillAnimation = animate(0, 1, {
          duration: FILL_ANIM_DURATION,
          delay: FILL_ANIM_DELAY,
          ease: 'easeOut',
          onUpdate: (p) => {
            if (this.destroyed || this.ring.destroyed) return;
            this.currentFill = p;
            drawDashedRing(this.ring, this.currentRadius, p);
          },
        });
      }

      const defaultShadow = new DropShadowFilter({
        quality: 10,
        color: 0x000000,
        alpha: 0.15,
        blur: 10,
      });
      const hoverShadow = new DropShadowFilter({
        quality: 10,
        color: 0xffde59,
        alpha: 0.85,
        blur: 14,
      });
      this.filters = [defaultShadow];

      this.onHover.connect(() => {
        this.filters = [hoverShadow];
        this.ringAnimation?.stop();
        this.ringAnimation = animate(this.currentRadius, RING_HOVER_RADIUS, {
          duration: 0.2,
          ease: 'easeOut',
          onUpdate: (r) => {
            this.currentRadius = r;
            drawDashedRing(this.ring, r, this.currentFill);
          },
        });
      });

      this.onOut.connect(() => {
        this.filters = [defaultShadow];
        this.ringAnimation?.stop();
        this.ringAnimation = animate(this.currentRadius, RING_IDLE_RADIUS, {
          duration: 0.2,
          ease: 'easeIn',
          onUpdate: (r) => {
            this.currentRadius = r;
            drawDashedRing(this.ring, r, this.currentFill);
          },
        });
      });

      this.onPress.connect(() => {
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.showScreen(LevelSplashScreen, { level, mapUnit });
      });
    } else {
      this.enabled = false;
    }
  }

  public override destroy(options?: DestroyOptions) {
    this.fillAnimation?.stop();
    this.ringAnimation?.stop();
    super.destroy(options);
  }
}
