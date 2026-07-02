import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { UserStatsPopup } from '../../popups/user-stats';
import { HomeScreen } from '../home';
import { LevelMapScreen } from '../level-map';
import { educationMaps, typingMaps } from '../level-map/units';

export class LayerSelectScreen extends Container {
  public static assetBundles = ['layer-select', 'home'];

  private innerContainer: Container;
  private mapBackground: Sprite;
  private background: Sprite;
  private layerButtons: FancyButton[];
  private closeButton: FancyButton;
  private userStatsButton: FancyButton;
  private skipShowAnimation: boolean;

  constructor({ skipShowAnimation = false }: { skipShowAnimation?: boolean } = {}) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('home/background.png'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.skipShowAnimation = skipShowAnimation;

    const backgroundTexture = Texture.from('layer-select/background.png');
    this.mapBackground = new Sprite({
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
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showScreen(HomeScreen);
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
          void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
          void engine().navigation.showScreen(
            LevelMapScreen,
            data.screenType === 'education' ? educationMaps[0] : typingMaps[0],
          );
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
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showPopup(UserStatsPopup);
    });

    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(this.mapBackground, this.closeButton, ...this.layerButtons);

    this.addChild(this.background, this.innerContainer, this.userStatsButton);
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }

  public async show() {
    if (this.skipShowAnimation) return;

    const currentEngine = engine();
    void currentEngine.audio.sfx.play('preload-audio/sfx/popup.mp3');

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
      animate(this.background, { alpha: 0.5 }, { duration, ease: 'backOut' }),
    ]);
  }

  public async hide() {
    const duration = 0.2;
    await Promise.all([
      animate(this.innerContainer, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(this.innerContainer.scale, { x: 0.94, y: 0.94 }, { duration, ease: 'easeOut' }),
      animate(this.userStatsButton, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(this.userStatsButton.position, { x: 200 }, { duration, ease: 'easeOut' }),
      animate(this.background, { alpha: 1 }, { duration, ease: 'easeOut' }),
    ]);
  }
}
