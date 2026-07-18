import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Graphics, Text, Texture, type DestroyOptions } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { LevelMapScreen } from '../../level-map';
import type { TMapUnit } from '../../level-map/units';

const SIZE = 221;
const BUTTON_RADIUS = SIZE / 2;
const RING_IDLE_RADIUS = BUTTON_RADIUS + 5;
const RING_HOVER_RADIUS = BUTTON_RADIUS - 3;

const RING_COLOR_UNFILLED = 0xa66129;

function drawDashedRing(g: Graphics, r: number, color = RING_COLOR_UNFILLED, width = 15) {
  g.clear();
  const dashCount = 8;
  const gapRatio = 0.1;
  const segmentAngle = (Math.PI * 2) / dashCount;
  const gapAngle = segmentAngle * gapRatio;
  const dashAngle = segmentAngle - gapAngle;
  const base = -Math.PI / 2;

  g.setStrokeStyle({ width, color });
  for (let i = 0; i < dashCount; i++) {
    const dashStart = base + i * segmentAngle;
    const dashEnd = dashStart + dashAngle;
    g.arc(0, 0, r, dashStart, dashEnd);
    g.stroke();
  }
}

export class MapUnitButton extends FancyButton {
  private ring: Graphics;
  private ringAnimation?: AnimationPlaybackControls;
  private currentRadius = RING_IDLE_RADIUS;

  constructor(mapUnit: TMapUnit, index: number) {
    super({
      defaultView: Texture.from('ui/map-button-unlocked.png'),
      anchor: 0.5,
      animations: {
        hover: {
          props: { scale: { x: 1.1, y: 1.1 } },
          duration: 200,
        },
      },
      text: new Text({
        text: String(index + 1),
        style: {
          fontFamily: 'Concert One',
          fontSize: 110,
          fontWeight: 'bold',
          fill: 0x8b4513,
        },
      }),
    });

    this.layout = {
      width: SIZE,
      height: SIZE,
      isLeaf: true,
    };

    this.ring = new Graphics();
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
      void engine().navigation.showScreen(LevelMapScreen, mapUnit);
    });
  }

  public override destroy(options?: DestroyOptions) {
    this.ringAnimation?.stop();
    super.destroy(options);
  }
}
