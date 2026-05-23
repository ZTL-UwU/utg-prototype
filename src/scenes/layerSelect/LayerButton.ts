import { Sprite, Texture } from 'pixi.js';

import { AbstractButton } from '../types';

export class LayerButton extends AbstractButton {
  constructor(onClick: () => void, imageAlias: string) {
    super(250, 250);
    // this.draw(0xd0823c);
    const sprite = new Sprite(Texture.from(imageAlias));
    sprite.width = this.WIDTH;
    sprite.height = this.HEIGHT;
    this.addChild(this.background, sprite);
    this.on('pointertap', onClick);
  }
}
