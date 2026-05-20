import gsap from 'gsap';
import { AnimatedSprite, Container, Texture } from 'pixi.js';

const FRAME_COUNT = 25;
const WALK_PADDING = 100;
const WALK_SPEED = 50;

export class Camel extends Container {
  private readonly sprite: AnimatedSprite;
  private tween?: gsap.core.Tween;

  constructor() {
    super();

    this.sprite = new AnimatedSprite(
      Array.from({ length: FRAME_COUNT }, (_, i) => Texture.from(`camel_frame_${i}`)),
    );
    this.sprite.anchor.set(0.5);
    this.sprite.animationSpeed = 0.18;
    this.sprite.loop = true;
    this.sprite.scale.set(0.4);
    this.sprite.play();

    this.addChild(this.sprite);
  }

  resize(screenWidth: number, screenHeight: number) {
    this.y = screenHeight / 2 + 150;
    this.startWalk(screenWidth);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.tween?.kill();
    super.destroy(options);
  }

  private startWalk(screenWidth: number) {
    const endX = screenWidth + WALK_PADDING;
    const distance = endX + WALK_PADDING;

    this.tween?.kill();
    this.x = -WALK_PADDING;
    this.tween = gsap.to(this, {
      x: endX,
      duration: distance / WALK_SPEED,
      ease: 'none',
      repeat: -1,
    });
  }
}
