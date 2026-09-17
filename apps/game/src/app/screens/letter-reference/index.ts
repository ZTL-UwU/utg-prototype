import { Container, Sprite, Texture } from 'pixi.js';
const BACKGROUND_COLOR = 0xf3e3c6;

export class LetterReferenceScreen extends Container {
  private background = new Sprite({
    texture: Texture.WHITE,
    tint: BACKGROUND_COLOR,
    layout: { position: 'absolute', width: '100%', height: '100%' },
  });
  constructor() {
    super();
    this.addChild(this.background);
  }
  resize(width: number, height: number) {
    this.background.layout = { width, height };
  }
}
