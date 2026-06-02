import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { BlurFilter, Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { LevelMapScreen } from '../../screens/level-map';

export class LayerSelectPopup extends Container {
  public static assetBundles = ['layer-select'];

  private innerContainer: Container;
  private background: Sprite;
  private layerButtons: FancyButton[];
  private closeButton: FancyButton;
  private userStatsButton: FancyButton;

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
      animations: {
        hover: {
          props: {
            scale: { x: 1.1, y: 1.1 },
          },
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

    const buttonData: {
      icon: Texture;
      layout: { left: number; top: number };
      screenType?: 'typing' | 'education';
    }[] = [
      {
        icon: Texture.from('layer-select/education-icon.png'),
        layout: { left: 252, top: 604 },
        screenType: 'education',
      },
      {
        icon: Texture.from('layer-select/typing-icon.png'),
        layout: { left: 640, top: 345 },
        screenType: 'typing',
      },
      {
        // Placeholder for the third layer
        icon: Texture.from('layer-select/locked-icon.png'),
        layout: { left: 1028, top: 604 },
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
      if (data.screenType) {
        button.onPress.connect(() => {
          void engine().navigation.hidePopup();
          void engine().navigation.showScreen(LevelMapScreen, data.screenType!);
        });
      }
      return button;
    });

    this.userStatsButton = new FancyButton({
      defaultView: Texture.from('layer-select/user-icon.svg'),
      animations: {
        hover: {
          props: {
            scale: { x: 1.1, y: 1.1 },
          },
          duration: 100,
        },
      },
      anchor: 0.5,
    });
    this.userStatsButton.layout = {
      position: 'absolute',
      top: 120,
      right: 120,
    };
    this.userStatsButton.onPress.connect(() => {
      void engine().navigation.hidePopup();
      // void engine().navigation.showScreen(UserStatsScreen);
    });

    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(this.background, this.closeButton, ...this.layerButtons);

    this.addChild(this.innerContainer, this.userStatsButton);
  }

  public async show() {
    const currentEngine = engine();
    if (!currentEngine.navigation.currentScreen) return;

    currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 0 })];
    currentEngine.navigation.currentScreen.tint = 0x666666;

    this.innerContainer.alpha = 0;
    this.innerContainer.scale.set(0.7);
    this.userStatsButton.alpha = 0;
    this.userStatsButton.position.x = 200;

    const duration = 0.4;
    await Promise.all([
      animate(this.innerContainer, { alpha: 1 }, { duration, ease: 'backOut' }),
      animate(this.innerContainer.scale, { x: 1, y: 1 }, { duration, ease: 'backOut' }),
      animate(this.userStatsButton, { alpha: 1 }, { duration, ease: 'backOut' }),
      animate(this.userStatsButton.position, { x: 0 }, { duration, ease: 'backOut' }),
      animate(
        currentEngine.navigation.currentScreen.filters[0] as BlurFilter,
        { strength: 9 },
        { duration, ease: 'easeOut' },
      ),
    ]);
  }

  public async hide() {
    const currentEngine = engine();
    if (!currentEngine.navigation.currentScreen) return;

    currentEngine.navigation.currentScreen.tint = 0xffffff;

    const duration = 0.2;
    await Promise.all([
      animate(this.innerContainer, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(this.innerContainer.scale, { x: 0.94, y: 0.94 }, { duration, ease: 'easeOut' }),
      animate(this.userStatsButton, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(this.userStatsButton.position, { x: 200 }, { duration, ease: 'easeOut' }),
      animate(
        currentEngine.navigation.currentScreen.filters[0] as BlurFilter,
        { strength: 0 },
        { duration, ease: 'easeOut' },
      ),
    ]);
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
