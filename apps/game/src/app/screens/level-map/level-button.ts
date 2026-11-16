import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Graphics, Rectangle, Texture, Text, type DestroyOptions } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { hasCompletedLevel, isLevelUnlocked } from '../../../lib/progression';
import { m } from '../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { toRoman } from '../../../utils/roman';
import { useLevelProgress } from '../../../zustandStores/levelProgressStore';
import {
  drawDashedRing,
  FILL_ANIM_DELAY,
  FILL_ANIM_DURATION,
  RING_COLOR_FILLED,
  RING_COLOR_UNFILLED,
} from '../../ui/dashed-ring';
import { LevelLoadingScreen } from '../level-loading';
import type { TLevel, TMapUnit } from './units';

const SIZE = 221;
const BUTTON_RADIUS = SIZE / 2;
const RING_IDLE_RADIUS = BUTTON_RADIUS + 5;
const RING_HOVER_RADIUS = BUTTON_RADIUS - 3;

/** Education maps: a flat cream disc reading "GAME I", ringed by fine dashes on its edge. */
const EDUCATION_DISC_COLOR = 0xfcf5e6;
const EDUCATION_TEXT_COLOR = 0x2f4a3a;
const EDUCATION_RING_RADIUS = BUTTON_RADIUS - 6;
/** Hover grows only the disc (FancyButton scales its inner view), so the ring grows to match. */
const EDUCATION_HOVER_SCALE = 1.1;
const EDUCATION_RING_HOVER_RADIUS = EDUCATION_RING_RADIUS * EDUCATION_HOVER_SCALE;
const EDUCATION_RING_WIDTH = 12;
const EDUCATION_RING_DASHES = 14;
function createEducationDisc(): Graphics {
  return new Graphics()
    .circle(BUTTON_RADIUS, BUTTON_RADIUS, BUTTON_RADIUS)
    .fill(EDUCATION_DISC_COLOR);
}

function createEducationLabel(idx: number): Text {
  return new Text({
    text: `${m.level_map_game()}
${toRoman(idx)}`,
    style: {
      fontFamily: DISPLAY_FONT_FAMILY,
      fontSize: 62,
      fontWeight: 'bold',
      fill: EDUCATION_TEXT_COLOR,
      align: 'center',
      lineHeight: 64,
    },
  });
}

export class LevelButton extends FancyButton {
  private ring: Graphics;
  private ringAnimation?: AnimationPlaybackControls;
  private fillAnimation?: AnimationPlaybackControls;
  private currentRadius: number;
  private currentFill = 0;
  private readonly education: boolean;
  public readonly unlocked: boolean;
  /** Finished, by a star or (for levels that never earn one) by being played. */
  public completed = false;
  /** Finished since this map was last shown; its ring is animating full. */
  public justCompleted = false;
  /** Runs before the level opens, e.g. to hop the map sheep onto this button. */
  public beforePlay?: () => Promise<void>;

  constructor(level: TLevel, mapUnit: TMapUnit, idx: number) {
    const unlocked = isLevelUnlocked(level);
    const education = mapUnit.type === 'education';
    super({
      defaultView:
        unlocked && education
          ? createEducationDisc()
          : Texture.from(unlocked ? 'ui/map-button-unlocked.png' : 'ui/map-button-locked.svg'),
      anchor: 0.5,
      animations: {
        hover: unlocked
          ? {
              props: { scale: { x: 1.1, y: 1.1 } },
              duration: 200,
            }
          : undefined,
      },
      text: !unlocked
        ? undefined
        : education
          ? createEducationLabel(idx)
          : new Text({
              text: String(idx),
              style: {
                fontFamily: DISPLAY_FONT_FAMILY,
                fontSize: 110,
                fontWeight: 'bold',
                fill: 0x8b4513,
              },
            }),
    });
    this.education = education;
    this.unlocked = unlocked;
    // Layout fits a leaf to its bounds, so a sheep standing on it, or the ring growing on
    // hover, would squash the button; pin the bounds to the disc instead.
    if (education) this.boundsArea = new Rectangle(-BUTTON_RADIUS, -BUTTON_RADIUS, SIZE, SIZE);
    this.currentRadius = education ? EDUCATION_RING_RADIUS : RING_IDLE_RADIUS;

    this.layout = {
      width: SIZE,
      height: SIZE,
      isLeaf: true,
    };

    this.ring = new Graphics();
    if (unlocked) {
      const progress = useLevelProgress.getState();
      // Levels that can never earn a star fall back to the local "played it once" flag.
      const filled = hasCompletedLevel(level.id) || progress.isAttempted(mapUnit.type, level.id);
      this.completed = filled;
      this.currentFill = filled ? 1 : 0;
      this.drawRing(this.currentRadius, this.currentFill);
      this.addChild(this.ring);

      if (progress.consumePendingAnimation(mapUnit.type, level.id)) {
        this.justCompleted = true;
        this.currentFill = 0;
        this.drawRing(this.currentRadius, 0);
        this.fillAnimation = animate(0, 1, {
          duration: FILL_ANIM_DURATION,
          delay: FILL_ANIM_DELAY,
          ease: 'easeOut',
          onUpdate: (p) => {
            if (this.destroyed || this.ring.destroyed) return;
            this.currentFill = p;
            this.drawRing(this.currentRadius, p);
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
      // Filters render only inside their target's bounds. Education buttons pin those to
      // the disc, so the shadow goes on the disc alone, leaving the sheep standing on top
      // unclipped.
      const shadowTarget = education ? this.innerView : this;
      shadowTarget.filters = [defaultShadow];

      this.onHover.connect(() => {
        shadowTarget.filters = [hoverShadow];
        this.ringAnimation?.stop();
        this.ringAnimation = animate(
          this.currentRadius,
          education ? EDUCATION_RING_HOVER_RADIUS : RING_HOVER_RADIUS,
          {
            duration: 0.2,
            ease: 'easeOut',
            onUpdate: (r) => {
              this.currentRadius = r;
              this.drawRing(r, this.currentFill);
            },
          },
        );
      });

      this.onOut.connect(() => {
        shadowTarget.filters = [defaultShadow];
        this.ringAnimation?.stop();
        this.ringAnimation = animate(
          this.currentRadius,
          education ? EDUCATION_RING_RADIUS : RING_IDLE_RADIUS,
          {
            duration: 0.2,
            ease: 'easeIn',
            onUpdate: (r) => {
              this.currentRadius = r;
              this.drawRing(r, this.currentFill);
            },
          },
        );
      });
    }

    // Levels without a screen have nothing to play, so they stay disabled.
    if (level.screen) {
      let opening = false;
      this.onPress.connect(() => {
        if (opening) return;
        opening = true;
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void (async () => {
          await this.beforePlay?.();
          await engine().navigation.showScreen(LevelLoadingScreen, { level, mapUnit });
        })();
      });
    } else {
      this.enabled = false;
    }
  }

  /** Settles once the completion ring has finished filling. */
  public async ringFilled() {
    await this.fillAnimation;
  }

  private drawRing(radius: number, fill: number) {
    if (!this.education) {
      drawDashedRing(this.ring, radius, fill);
      return;
    }
    drawDashedRing(
      this.ring,
      radius,
      fill,
      RING_COLOR_FILLED,
      RING_COLOR_UNFILLED,
      EDUCATION_RING_WIDTH,
      EDUCATION_RING_DASHES,
    );
  }

  public override destroy(options?: DestroyOptions) {
    this.fillAnimation?.stop();
    this.ringAnimation?.stop();
    super.destroy(options);
  }
}
