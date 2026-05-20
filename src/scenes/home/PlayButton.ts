import gsap from 'gsap';
import { Container, Graphics, Rectangle, Text } from 'pixi.js';

const WIDTH = 220;
const HEIGHT = 70;

export class PlayButton extends Container {
  private readonly background = new Graphics();

  constructor(onPlay: () => void) {
    super({
      layout: {
        width: WIDTH,
        height: HEIGHT,
      },
    });

    this.pivot.set(WIDTH / 2, HEIGHT / 2);
    this.hitArea = new Rectangle(0, 0, WIDTH, HEIGHT);
    this.eventMode = 'static';
    this.cursor = 'pointer';

    const label = new Text({
      text: 'Typing',
      style: {
        fontFamily: 'Noto Sans',
        fontSize: 24,
        fontWeight: '800',
        fill: 0xffffff,
      },
    });
    label.anchor.set(0.5);
    label.position.set(WIDTH / 2, HEIGHT / 2);

    this.draw(0xd0823c);
    this.addChild(this.background, label);

    this.on('pointerover', () => this.setState(0xe09a5c, 1.05));
    this.on('pointerout', () => this.setState(0xd0823c, 1));
    this.on('pointerdown', () => this.setState(0xb86824, 0.95));
    this.on('pointerup', () => this.setState(0xe09a5c, 1.05));
    this.on('pointerupoutside', () => this.setState(0xd0823c, 1));
    this.on('pointertap', onPlay);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    gsap.killTweensOf(this.scale);
    super.destroy(options);
  }

  private setState(color: number, scale: number) {
    this.draw(color);
    gsap.to(this.scale, { x: scale, y: scale, duration: 0.1, ease: 'power2.out' });
  }

  private draw(color: number) {
    this.background.clear().roundRect(0, 0, WIDTH, HEIGHT, 20).fill(color);
  }
}
