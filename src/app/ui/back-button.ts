import { FancyButton } from '@pixi/ui';

export class BackButton extends FancyButton {
  constructor(onPress: () => void) {
    super({
      defaultView: 'ui/back-button.svg',
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
    });

    this.layout = {
      position: 'absolute',
      top: 30,
      left: 30,
    };

    this.onPress.connect(onPress);
  }
}
