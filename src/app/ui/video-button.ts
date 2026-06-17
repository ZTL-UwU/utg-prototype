import { FancyButton } from '@pixi/ui';

import { engine } from '../../engine/getEngine';

export class VideoButton extends FancyButton {
  constructor(onPress: () => void) {
    super({
      defaultView: 'ui/video-button.png',
      animations: {
        hover: {
          props: {
            scale: { x: 1.1, y: 1.1 },
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
      top: 170,
      right: 30,
    };

    this.onPress.connect(() => {
      engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      onPress();
    });
  }
}
