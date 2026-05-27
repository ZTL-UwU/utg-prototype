import { animate, type AnimationPlaybackControls } from 'motion';
import { AnimatedSprite, Container, Texture } from 'pixi.js';

export class Butterfly extends Container {
  private readonly sprite: AnimatedSprite;
  private floatAnimation?: AnimationPlaybackControls;

  constructor() {
    super();

    this.sprite = new AnimatedSprite(
      Array.from({ length: 25 }, (_, i) =>
        Texture.from(`home/butterfly/${String(i + 1).padStart(2, '0')}.png`),
      ),
    );
    this.sprite.anchor.set(0.5);
    this.sprite.animationSpeed = 0.2;
    this.sprite.loop = true;
    this.sprite.scale.set(0.75);
    this.sprite.play();

    this.addChild(this.sprite);
  }

  resize(width: number, height: number) {
    const centerX = width * 0.18;
    const centerY = height * 0.7;
    const radius = 50;
    const points = 16;

    const xKeyframes: number[] = [];
    const yKeyframes: number[] = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      xKeyframes.push(centerX + radius * Math.cos(angle));
      yKeyframes.push(centerY + radius * Math.sin(angle));
    }

    this.floatAnimation?.stop();
    this.x = xKeyframes[0]!;
    this.y = yKeyframes[0]!;
    this.floatAnimation = animate(
      this,
      { x: xKeyframes, y: yKeyframes },
      {
        duration: 10,
        ease: 'linear',
        repeat: Infinity,
      },
    );
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.floatAnimation?.stop();
    super.destroy(options);
  }
}
