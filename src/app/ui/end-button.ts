import { FancyButton } from '@pixi/ui';

import { engine } from '../../engine/getEngine';
import { EndScreenPopup } from '../popups/end-screen';
export class EndButton extends FancyButton {
  constructor(type: 'education' | 'typing') {
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
    });

    this.layout = {
      position: 'absolute',
      bottom: '10%',
      left: 30,
    };

    this.onPress.connect(() => {
      void engine().navigation.showPopup(EndScreenPopup, type);
    });
  }
}
