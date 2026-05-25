import { FancyButton } from '@pixi/ui';

import { engine } from '../../engine/getEngine';
import { HelpPopup } from '../popups/help';

export class HelpButton extends FancyButton {
  constructor() {
    super({
      defaultView: 'ui/help-button.svg',
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
      top: 30,
      right: 30,
    };

    this.onPress.connect(() => {
      void engine().navigation.showPopup(HelpPopup);
    });
  }
}
