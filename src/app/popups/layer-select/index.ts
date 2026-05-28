import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { BlurFilter, Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { EducationLevelMapScreen } from '../../screens/education-level-map';
import { TypingLevelMapScreen } from '../../screens/typing-level-map';

export class LayerSelectPopup extends Container {
  public static assetBundles = ['layer-select'];

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

    const backgroundTexture = Texture.from('layer-select/background.png');
    this.background = new Sprite({
      texture: backgroundTexture,
      layout: {
        width: backgroundTexture.width,
        height: backgroundTexture.height,
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
        screen: EducationLevelMapScreen,
      },
      {
        icon: Texture.from('layer-select/typing-icon.png'),
        layout: { left: 640, top: 345 },
        screen: TypingLevelMapScreen,
      },
      {
        // Placeholder for the third layer
        icon: Texture.from('layer-select/typing-icon.png'),
        layout: { left: 1028, top: 604 },
        screen: TypingLevelMapScreen,
      },
    ];

    this.layerButtons = buttonData.map((data) => {
      const button = new FancyButton({
        defaultView: data.icon,
        anchor: 0.5,
        animations: {
          hover: {
            props: {
              scale: { x: 1.05, y: 1.05 },
            },
            duration: 100,
          },
        },
      });
      button.layout = {
        position: 'absolute',
        ...data.layout,
      };
      button.onPress.connect(() => {
        void engine().navigation.hidePopup();
        void engine().navigation.showScreen(data.screen);
      });
      return button;
    });

    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(this.background, this.closeButton, ...this.layerButtons);

    this.addChild(this.innerContainer);
  }

  public async show() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 9 })];
    }
    this.innerContainer.alpha = 0;
    this.innerContainer.scale.set(0.94);

    await Promise.all([
      animate(this.innerContainer, { alpha: 1 }, { duration: 0.2, ease: 'easeOut' }),
      animate(this.innerContainer.scale, { x: 1, y: 1 }, { duration: 0.2, ease: 'easeOut' }),
    ]);
  }

  public async hide() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [];
    }
    await Promise.all([
      animate(this.innerContainer, { alpha: 0 }, { duration: 0.2, ease: 'linear' }),
      animate(this.innerContainer.scale, { x: 0.94, y: 0.94 }, { duration: 0.2, ease: 'linear' }),
    ]);
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
