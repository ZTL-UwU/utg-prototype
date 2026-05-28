import { FancyButton } from '@pixi/ui';

import { engine } from '../../engine/getEngine';
import { EndScreenPopup } from '../popups/end-screen';
export class EndButton extends FancyButton {
  constructor(
    onPress: () => void = () => {
      //   const { correct, mistakes } = useSessionStore.getState();
      //   const total = correct + mistakes;
      //   const accuracy = total === 0 ? 0 : correct / total;
      //   const starNum = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.5 ? 1 : 0;
      void engine().navigation.showPopup(EndScreenPopup);
    },
  ) {
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

    this.onPress.connect(onPress);
  }
}
