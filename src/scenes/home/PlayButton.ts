import { Text } from 'pixi.js';

import { AbstractButton } from '../types';

export class PlayButton extends AbstractButton {
  constructor(onPlay: () => void) {
    super(220, 70);
    const label = new Text({
      text: 'Start your journey',
      style: {
        fontFamily: 'Concert One',
        fontSize: 24,
        fontWeight: '500',
        fill: 0xffffff,
      },
    });
    label.anchor.set(0.5);
    label.position.set(this.WIDTH / 2, this.HEIGHT / 2);

    this.draw(0xd0823c);
    this.addChild(this.background, label);

    this.on('pointerover', () => this.setState(0xe09a5c, 1.05));
    this.on('pointerout', () => this.setState(0xd0823c, 1));
    this.on('pointerdown', () => this.setState(0xb86824, 0.95));
    this.on('pointerup', () => this.setState(0xe09a5c, 1.05));
    this.on('pointerupoutside', () => this.setState(0xd0823c, 1));
    this.on('pointertap', onPlay);
  }
}
