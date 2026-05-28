import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

const SCREEN_PADDING = 100;
const DRIFT_SPEED = 28;

type CloudDrift = {
  sprite: Sprite;
  direction: 'ltr' | 'rtl';
  yRatio: number;
  scale: number;
  delay: number;
  animation?: AnimationPlaybackControls;
};

export class Clouds extends Container {
  private readonly drifts: CloudDrift[] = [
    {
      sprite: new Sprite(Texture.from('typing-level/cloud.png')),
      direction: 'ltr',
      yRatio: 0.12,
      scale: 1.05,
      delay: 0,
    },
    {
      sprite: new Sprite(Texture.from('typing-level/cloud.png')),
      direction: 'rtl',
      yRatio: 0.3,
      scale: 1.02,
      delay: 18,
    },
    {
      sprite: new Sprite(Texture.from('typing-level/cloud.png')),
      direction: 'rtl',
      yRatio: 0.35,
      scale: 1,
      delay: 0,
    },
  ];

  constructor() {
    super();

    for (const drift of this.drifts) {
      drift.sprite.anchor.set(0.5);
      this.addChild(drift.sprite);
    }
  }

  private startDrift(drift: CloudDrift, screenWidth: number, screenHeight: number) {
    const { sprite, direction, yRatio, scale, delay } = drift;
    const halfWidth = (sprite.texture.width * Math.abs(scale)) / 2;
    const offLeft = -SCREEN_PADDING - halfWidth;
    const offRight = screenWidth + SCREEN_PADDING + halfWidth;

    sprite.scale.set(direction === 'rtl' ? scale : -scale, scale);
    sprite.y = screenHeight * yRatio;

    drift.animation?.stop();

    if (direction === 'ltr') {
      sprite.x = offLeft;
      drift.animation = animate(
        sprite,
        { x: offRight },
        this.driftOptions(offRight - offLeft, delay),
      );
    } else {
      sprite.x = offRight;
      drift.animation = animate(
        sprite,
        { x: offLeft },
        this.driftOptions(offRight - offLeft, delay),
      );
    }
  }

  private driftOptions(distance: number, delay: number) {
    return {
      duration: distance / DRIFT_SPEED,
      ease: 'linear' as const,
      delay,
      repeat: Infinity,
      repeatType: 'loop' as const,
    };
  }

  public async pause() {
    for (const drift of this.drifts) {
      drift.animation?.pause();
    }
  }

  public async resume() {
    for (const drift of this.drifts) {
      drift.animation?.play();
    }
  }

  resize(screenWidth: number, screenHeight: number) {
    for (const drift of this.drifts) {
      this.startDrift(drift, screenWidth, screenHeight);
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    for (const drift of this.drifts) {
      drift.animation?.stop();
    }
    super.destroy(options);
  }
}
