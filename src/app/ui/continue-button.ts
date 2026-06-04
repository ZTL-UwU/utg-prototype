import { FancyButton } from '@pixi/ui';

import { engine } from '../../engine/getEngine';

export class ContinueButton extends FancyButton {
  constructor(onPress: () => void) {
    super({
      defaultView: 'ui/end-game-button.svg',
      animations: {
        hover: {
          props: {
            scale: { x: 1.03, y: 1.03 },
          },
          duration: 100,
        },
        pressed: {
          props: {
            scale: { x: 0.97, y: 0.97 },
          },
          duration: 100,
        },
      },
      anchorX: 1,
      anchorY: 1,
    });

    this.layout = {
      position: 'absolute',
      right: 28,
      bottom: 28,
    };

    this.onPress.connect(() => {
      engine().audio.sfx.play('audio/sfx/button-click.mp3');
      onPress();
    });
  }
}
