import { FancyButton } from '@pixi/ui';

import { engine } from '../../engine/getEngine';
import useSessionStore from '../../zustandStores/sessionStore';
import { EndScreen } from '../screens/end-screen';

export class EndButton extends FancyButton {
  constructor(
    onPress: () => void = () => {
      const { correct, mistakes, levelType } = useSessionStore.getState();
      console.log('pressed');
      engine().navigation.showScreen(EndScreen, { correct, mistakes, type: levelType });
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
      bottom: '20%',
      left: 30,
    };

    this.onPress.connect(onPress);
  }
}
