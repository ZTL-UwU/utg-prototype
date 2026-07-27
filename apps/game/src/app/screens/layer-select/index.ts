import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { getAvatarPath } from '../../../utils/avatars';
import { useAuthStore } from '../../../zustandStores/auth';
import { ensureCourseReady } from '../../../zustandStores/courseStore';
import { UserStatsPopup } from '../../popups/user-stats';
import { HomeScreen } from '../home';
import { LevelMapScreen } from '../level-map';
import { getLayerMaps, type TLayer } from '../level-map/units';
import { EducationLevelSelect } from '../level-select/education-level-select';

export class LayerSelectScreen extends Container {
  public static assetBundles = ['layer-select', 'home', 'avatar-select'];

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
      screenType?: TLayer;
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
        icon: Texture.from('layer-select/game-icon.png'),
        layout: { left: 1028, top: 604 },
        screenType: 'game',
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
        const layer = data.screenType;
        button.onPress.connect(() => {
          void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
          void (async () => {
            if (!(await ensureCourseReady())) return;
            if (layer === 'education') {
              await engine().navigation.showScreen(EducationLevelSelect);
              return;
            }
            const firstMap = getLayerMaps(layer)[0];
            if (!firstMap) return;
            await engine().navigation.showScreen(LevelMapScreen, firstMap);
          })();
        });
      }
      return button;
    });

    const avatarId = useAuthStore.getState().user?.avatar;
    this.userStatsButton = new FancyButton({
      defaultView: Texture.from(getAvatarPath(avatarId)),
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

    this.userStatsButton.width = 149;
    this.userStatsButton.height = 149;
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
