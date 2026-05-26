import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { EducationLevelMapScreen } from '../../screens/education-level-map';
import { TypingLevelMapScreen } from '../../screens/typing-level-map';

export class LayerSelectPopup extends Container {
  public static assetBundles = ['layer-select'];

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
      layout: true,
    });

    this.closeButton = new FancyButton({
      defaultView: Texture.from('layer-select/close-button.png'),
      scale: 1.5,
      animations: {
        hover: {
          props: { scale: { x: 1.2, y: 1.2 } },
          duration: 100,
        },
      },
      anchor: 0.5,
    });
    this.closeButton.layout = {
      position: 'absolute',
      top: 100,
      left: 100,
    };
    this.closeButton.onPress.connect(() => {
      void engine().navigation.hidePopup();
    });

    const buttonData = [
      {
        icon: Texture.from('layer-select/education-icon.png'),
        layout: { left: 252, top: 604 },
        onPress: () => {
          void engine().navigation.showScreen(EducationLevelMapScreen);
        },
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
        data.onPress();
      });
      return button;
    });

    this.background.addChild(this.closeButton, ...this.layerButtons);

    this.addChild(this.background);
  }

  public async show() {
    this.background.alpha = 0;
    this.background.scale.set(0.94);

    await Promise.all([
      animate(this.background, { alpha: 1 }, { duration: 0.2, ease: 'easeOut' }),
      animate(this.background.scale, { x: 1, y: 1 }, { duration: 0.2, ease: 'easeOut' }),
    ]);
  }

  public async hide() {
    await Promise.all([
      animate(this.background, { alpha: 0 }, { duration: 0.2, ease: 'linear' }),
      animate(this.background.scale, { x: 0.94, y: 0.94 }, { duration: 0.2, ease: 'linear' }),
    ]);
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
