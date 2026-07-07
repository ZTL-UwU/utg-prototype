import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Graphics, Texture, Text, type DestroyOptions, Sprite } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { useLevelProgress } from '../../../zustandStores/levelProgressStore';
import useSessionStore from '../../../zustandStores/sessionStore';
import { TutorialPopup } from '../../popups/tutorial';
import { LevelSplashScreen } from '../level-splash';
import type { TLevel, TMapUnit } from './units';

const SIZE = 221;
const BUTTON_RADIUS = SIZE / 2;
const RING_IDLE_RADIUS = BUTTON_RADIUS + 5;
const RING_HOVER_RADIUS = BUTTON_RADIUS - 3;

const RING_COLOR_UNFILLED = 0xa66129;
const RING_COLOR_FILLED = 0xffdf59;
const FILL_ANIM_DURATION = 0.6;
const FILL_ANIM_DELAY = 0.25;

function drawDashedRing(
  g: Graphics,
  r: number,
  fillProgress = 0,
  filledColor = RING_COLOR_FILLED,
  unfilledColor = RING_COLOR_UNFILLED,
  width = 15,
) {
  g.clear();
  const dashCount = 8;
  const gapRatio = 0.1;
  const segmentAngle = (Math.PI * 2) / dashCount;
  const gapAngle = segmentAngle * gapRatio;
  const dashAngle = segmentAngle - gapAngle;
  const base = -Math.PI / 2;
  const fillBoundary = base + fillProgress * Math.PI * 2;

  const strokeArc = (start: number, end: number, color: number) => {
    if (end <= start) return;
    g.setStrokeStyle({ width, color });
    g.arc(0, 0, r, start, end);
    g.stroke();
  };

  for (let i = 0; i < dashCount; i++) {
    const dashStart = base + i * segmentAngle;
    const dashEnd = dashStart + dashAngle;
    strokeArc(dashStart, Math.min(dashEnd, fillBoundary), filledColor);
    strokeArc(Math.max(dashStart, fillBoundary), dashEnd, unfilledColor);
  }
}

export class LevelButton extends FancyButton {
  private ring: Graphics;
  private ringAnimation?: AnimationPlaybackControls;
  private fillAnimation?: AnimationPlaybackControls;
  private currentRadius = RING_IDLE_RADIUS;
  private currentFill = 0;

  constructor(level: TLevel, mapUnit: TMapUnit) {
    super({
      defaultView: Texture.from(
        level.unlocked ? 'ui/map-button-unlocked.png' : 'ui/map-button-locked.svg',
      ),
      anchor: 0.5,
      animations: {
        hover: level.unlocked
          ? {
              props: { scale: { x: 1.1, y: 1.1 } },
              duration: 200,
            }
          : undefined,
      },
      text: level.unlocked
        ? new Text({
            text: String(level.id),
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
    if (level.unlocked) {
      const progress = useLevelProgress.getState();
      this.currentFill = progress.isAttempted(mapUnit.type, level.id) ? 1 : 0;
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
        if (mapUnit.type === 'education') {
          void engine().audio.sfx.play('level-splash/game-start.mp3');
          useSessionStore.getState().reset();
          useSessionStore.getState().startSession(mapUnit.type);
          const currentScreen = engine().navigation.currentScreen ?? undefined;
          if (currentScreen) {
            currentScreen.removeChildren();
            const background: Sprite = new Sprite({
              texture: Texture.from(mapUnit.background),
              layout: { position: 'absolute', width: '100%', height: '100%' },
            });
            currentScreen.addChild(background);
          }

          void engine().navigation.showPopup(TutorialPopup, {
            assets: level.helpAsset,
            backdropColor: level.backdropColor,
            onNext: () => void engine().navigation.showScreen(level.screen!, level),
          });
        } else {
          void engine().navigation.showScreen(LevelSplashScreen, { level, mapUnit });
        }
      });
    }
  }

  public override destroy(options?: DestroyOptions) {
    this.fillAnimation?.stop();
    this.ringAnimation?.stop();
    super.destroy(options);
  }
}
