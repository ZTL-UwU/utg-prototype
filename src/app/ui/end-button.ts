import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import useSessionStore from '../../zustandStores/sessionStore';
import { EndScreen } from '../screens/end-screen';

const BUTTON_DIM = 100;

export class EndButton extends Container {
  private button: Sprite;

  constructor(
    onPress: () => void = () => {
      const { correct, mistakes } = useSessionStore.getState();
      engine().navigation.showScreen(EndScreen, { correct, mistakes });
    },
  ) {
    super({
      layout: {
        position: 'absolute',
        bottom: '10%',
        left: 40,
      },
    });

    this.button = new Sprite({
      texture: Texture.from('ui/end-game-button.svg'),
      width: BUTTON_DIM,
      height: BUTTON_DIM,
      eventMode: 'static',
      cursor: 'pointer',
    });

    this.button.on('pointerdown', onPress);
    this.addChild(this.button);
  }
}
