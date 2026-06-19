import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Graphics, Texture, Text } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import type { AppScreenConstructor } from '../../../engine/navigation/navigation';
import { LevelSplashScreen } from '../level-splash';
import type { TMapUnit } from './units';

export type TLevel = {
  id: number;
  title?: string;
  unlocked: boolean;
  miniMapImage: string;
  screen?: AppScreenConstructor<any[]>;
  background: string;
  helpAsset: string;
  backdropColor: number;
};

const SIZE = 221;
const BUTTON_RADIUS = SIZE / 2;
const RING_IDLE_RADIUS = BUTTON_RADIUS + 5;
const RING_HOVER_RADIUS = BUTTON_RADIUS - 3;

function drawDashedRing(g: Graphics, r: number, color = 0xa66129, width = 15) {
  g.clear();
  const dashCount = 8;
  const gapRatio = 0.1;
  const segmentAngle = (Math.PI * 2) / dashCount;
  const gapAngle = segmentAngle * gapRatio;
  const dashAngle = segmentAngle - gapAngle;

  g.setStrokeStyle({ width, color });
  for (let i = 0; i < dashCount; i++) {
    const start = -Math.PI / 2 + i * segmentAngle;
    g.arc(0, 0, r, start, start + dashAngle);
    g.stroke();
  }
}

export class LevelButton extends FancyButton {
  private ring: Graphics;
  private ringAnimation?: AnimationPlaybackControls;
  private currentRadius = RING_IDLE_RADIUS;

  constructor(level: TLevel, mapUnit: TMapUnit) {
    super({
      defaultView: Texture.from(
        level.unlocked
          ? 'typing-levels/typing-level-map/button-unlocked.png'
          : 'typing-levels/typing-level-map/button-locked.svg',
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
      drawDashedRing(this.ring, this.currentRadius);
      this.addChild(this.ring);
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
            drawDashedRing(this.ring, r);
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
            drawDashedRing(this.ring, r);
          },
        });
      });

      this.onPress.connect(() => {
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.showScreen(LevelSplashScreen, { level, mapUnit });
      });
    }
  }
}
