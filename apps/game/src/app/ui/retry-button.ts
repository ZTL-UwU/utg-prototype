import { FancyButton } from '@pixi/ui';

import { engine } from '../../engine/getEngine';

export class RetryButton extends FancyButton {
  constructor(onPress: () => void) {
    super({
      defaultView: 'ui/retry-button.svg',
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
      anchorY: 0,
    });

    this.layout = {
      position: 'absolute',
      right: 28,
      top: 28,
    };

    this.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      onPress();
    });
  }
}
