import { Container } from 'pixi.js';

import { CircleButton } from './CircleButton';

export class HelpButton extends Container {
  constructor() {
    super({
      layout: {
        position: 'absolute',
        right: 60,
        top: 60,
      },
    });

    const button = new CircleButton({
      label: '?',
      fontSize: 30,
      onPress: () => {},
    });
    this.addChild(button);
  }
}
