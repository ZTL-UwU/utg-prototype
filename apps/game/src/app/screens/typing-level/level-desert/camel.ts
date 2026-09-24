import { animate, type AnimationPlaybackControls } from 'motion';
import { AnimatedSprite, Container, Texture } from 'pixi.js';

export class Camel extends Container {
  private readonly sprite: AnimatedSprite;
  private walkAnimation?: AnimationPlaybackControls;

  constructor() {
    super();

    this.sprite = new AnimatedSprite(
      Array.from({ length: 25 }, (_, i) =>
        Texture.from(
          `typing-levels/typing-level-desert/camel-frames/frame_${String(i).padStart(3, '0')}.png`,
        ),
      ),
    );
    // Frames are cropped from a 1024x1024 canvas to its 616x560 opaque bounds at
    // (218, 218); anchor on the original canvas center so placement is unchanged.
    this.sprite.anchor.set((512 - 218) / 616, (512 - 218) / 560);
    this.sprite.animationSpeed = 0.18;
    this.sprite.loop = true;
    this.sprite.scale.set(0.4);
    this.sprite.play();

    this.addChild(this.sprite);
  }

  private startWalk(screenWidth: number) {
    const WALK_PADDING = 100;

    const endX = screenWidth + WALK_PADDING;
    const distance = endX + 2 * WALK_PADDING;

    this.walkAnimation?.stop();
    this.position.x = -WALK_PADDING;
    this.walkAnimation = animate(
      this.position,
      { x: endX },
      {
        duration: distance / 50,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'loop',
      },
    );
  }

  public async pause() {
    this.walkAnimation?.pause();
    this.sprite.stop();
  }

  public async resume() {
    this.walkAnimation?.play();
    this.sprite.play();
  }

  resize(screenWidth: number, screenHeight: number) {
    this.y = screenHeight / 2 + 100;
    this.startWalk(screenWidth);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.walkAnimation?.stop();
    super.destroy(options);
  }
}
