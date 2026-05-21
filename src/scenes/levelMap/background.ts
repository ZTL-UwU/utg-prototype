import { Sprite, Texture } from 'pixi.js';

export class Background extends Sprite {
  constructor() {
    super(Texture.from('level-map-background'));
    this.anchor.set(0.5);
  }

  resize(screenWidth: number, screenHeight: number) {
    const scale = Math.max(screenWidth / this.texture.width, screenHeight / this.texture.height);

    this.scale.set(scale);
    this.position.set(screenWidth / 2, screenHeight / 2);
  }
}
