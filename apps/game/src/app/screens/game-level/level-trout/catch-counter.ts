import { Container, Sprite, Text, Texture } from 'pixi.js';

const ICON_ASSET = 'game-levels/game-level-trout/trout-icon.png';
const ICON_HEIGHT = 64;
const GAP = 14;

export class CatchCounter extends Container {
  private readonly icon: Sprite;
  private readonly countText: Text;

  constructor() {
    super();

    this.icon = new Sprite(Texture.from(ICON_ASSET));
    this.icon.anchor.set(0, 0.5);
    const scale = ICON_HEIGHT / this.icon.texture.height;
    this.icon.scale.set(scale);

    this.countText = new Text({
      text: '0',
      resolution: 2,
      anchor: { x: 0, y: 0.5 },
      style: { fill: 0xffffff, fontFamily: 'Concert One', fontSize: 64, fontWeight: '700' },
    });
    this.countText.position.set(this.icon.width + GAP, 0);

    this.addChild(this.icon, this.countText);
  }

  public setCount(count: number) {
    this.countText.text = String(count);
  }
}
