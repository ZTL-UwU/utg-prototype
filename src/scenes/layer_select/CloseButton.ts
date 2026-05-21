import { Sprite, Texture } from 'pixi.js';

import { AbstractButton } from '../types';

export class CloseButton extends AbstractButton {
  constructor(onClose: () => void) {
    super(50, 50);
    // this.draw(0xd0823c);
    const sprite = new Sprite(Texture.from('x-mark'));
    sprite.width = this.WIDTH;
    sprite.height = this.HEIGHT;
    this.addChild(this.background, sprite);
    this.on('pointertap', onClose);
  }
}
