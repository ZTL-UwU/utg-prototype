import { Container } from 'pixi.js';

import { CircleButton } from './CircleButton';

export class HomeButton extends Container {
  constructor(onHome: () => void) {
    super({
      layout: {
        position: 'absolute',
        left: 60,
        top: 60,
      },
    });

    const button = new CircleButton({
      label: '←',
      fontSize: 30,
      onPress: onHome,
    });
    this.addChild(button);
  }
}
