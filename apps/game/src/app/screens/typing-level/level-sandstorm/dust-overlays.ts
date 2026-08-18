import { Container, Texture, TilingSprite } from 'pixi.js';

const SCROLL_SPEED = 36;

export class DustOverlays extends Container {
  private readonly dustTop: TilingSprite;
  private readonly dustBottom: TilingSprite;
  private paused = false;

  constructor() {
    super({
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
      },
    });

    this.dustTop = new TilingSprite({
      texture: Texture.from('typing-levels/typing-level-sandstorm/dust-top.png'),
    });

    this.dustBottom = new TilingSprite({
      texture: Texture.from('typing-levels/typing-level-sandstorm/dust-bottom.png'),
    });

    this.dustTop.anchor.y = 0.05;
    this.dustBottom.anchor.y = 0.96;

    this.addChild(this.dustTop, this.dustBottom);
  }

  resize(width: number, height: number) {
    this.dustTop.width = width;
    this.dustTop.height = height;
    this.dustTop.position.set(0, 0);

    this.dustBottom.width = width;
    this.dustBottom.height = height;
    this.dustBottom.position.set(0, height);
  }

  update(deltaMs: number) {
    if (this.paused) return;

    const delta = SCROLL_SPEED * (deltaMs / 1000);
    this.dustTop.tilePosition.x += delta * 2;
    this.dustBottom.tilePosition.x += delta;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }
}
