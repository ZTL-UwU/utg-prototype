import { FancyButton } from '@pixi/ui';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { TypingLevelMapScreen } from '../../screens/level-map';

export class LayerSelectPopup extends Container {
  // TODO: Defining asset bundle in popups should be supported by the engine

  private innerContainer: Container;
  private background: Sprite;
  private layerButtons: FancyButton[];
  private closeButton: FancyButton;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('layer-select/background.png'),
      layout: {
        objectFit: 'cover',
      },
    });

    this.closeButton = new FancyButton({
      defaultView: Texture.from('layer-select/close-button.png'),
      scale: 1.5,
    });
    this.closeButton.layout = {
      position: 'absolute',
      top: 60,
      left: 60,
    };
    this.closeButton.onPress.connect(() => {
      void engine().navigation.hidePopup();
    });

    const buttonData = [
      {
        icon: Texture.from('layer-select/education-icon.png'),
        layout: { left: 252, top: 604 },
        onPress: () => {},
      },
      {
        icon: Texture.from('layer-select/typing-icon.png'),
        layout: { left: 640, top: 345 },
        onPress: () => {
          void engine().navigation.showScreen(TypingLevelMapScreen);
        },
      },
      {
        // TODO: Add the icon for the third button
        icon: Texture.from('layer-select/typing-icon.png'),
        layout: { left: 1028, top: 604 },
        onPress: () => {},
      },
    ];

    this.layerButtons = buttonData.map((data) => {
      const button = new FancyButton({
        defaultView: data.icon,
        anchor: 0.5,
      });
      button.layout = {
        position: 'absolute',
        ...data.layout,
      };
      button.onPress.connect(data.onPress);
      return button;
    });

    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(this.background, this.closeButton, ...this.layerButtons);

    this.addChild(this.innerContainer);
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
