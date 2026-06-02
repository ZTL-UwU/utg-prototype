import { Dialog, FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { BlurFilter, Container, Graphics, Texture, Sprite, Text } from 'pixi.js';

import { engine } from '../../../engine/getEngine';

const CRYING_MASCOT_TEXTURES = {
  education: 'quit/crying-sheep.png',
  typing: 'quit/crying-camel.png',
} as const;

export type QuitPopupProps = {
  type: keyof typeof CRYING_MASCOT_TEXTURES;
  onQuit: () => void;
};

export class QuitPopup extends Container {
  public static assetBundles = ['quit'];

  private popupMask: Sprite;
  private dialog: Dialog;

  constructor({ type, onQuit }: QuitPopupProps) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      },
    });

    this.popupMask = new Sprite({
      texture: Texture.WHITE,
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
      },
      tint: 0x0,
      interactive: true,
    });

    const dialogHeight = 600;
    const dialogWidth = 700;
    const contentWidth = dialogWidth - 60;

    const cryingMascot = new Sprite({
      texture: Texture.from(CRYING_MASCOT_TEXTURES[type]),
      layout: true,
    });
    const cryingMascotContainer = new Container({
      layout: {
        width: contentWidth,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    });
    cryingMascotContainer.addChild(cryingMascot);

    const getBottomButton = (asset: string, onPress: () => void) => {
      const button = new FancyButton({
        defaultView: Texture.from(asset),
        animations: {
          hover: {
            props: {
              scale: {
                x: 1.03,
                y: 1.03,
              },
              y: -1,
              x: -2,
            },
            duration: 100,
          },
          pressed: {
            props: {
              scale: {
                x: 0.95,
                y: 0.95,
              },
              x: 2,
              y: 2,
            },
            duration: 100,
          },
        },
      });
      button.onPress.connect(onPress);
      return button;
    };

    const quitButton = getBottomButton('quit/quit-button.svg', () => {
      void engine().navigation.hidePopup().then(onQuit);
    });

    const cancelButton = getBottomButton('quit/cancel-button.svg', () => {
      void engine().navigation.hidePopup();
    });

    this.dialog = new Dialog({
      width: dialogWidth,
      height: dialogHeight,
      background: new Graphics()
        .roundRect(0, 0, dialogWidth, dialogHeight, 30)
        .fill(0xf2c583)
        .stroke({
          color: 0xe9ddc8,
          width: 6,
        }),
      title: new Text({
        text: 'ARE YOU SURE YOU WANT TO QUIT?',
        style: {
          fontFamily: 'Concert One',
          fontSize: 48,
          fontWeight: 'bold',
          wordWrap: true,
          wordWrapWidth: dialogWidth - 40,
          align: 'center',
          fill: 0x6b411e,
        },
      }),
      content: [cryingMascotContainer],
      buttons: [quitButton, cancelButton],
      buttonList: {
        elementsMargin: 40,
      },
      animations: {
        open: {
          props: {},
          duration: 300,
        },
        close: {
          props: {},
          duration: 200,
        },
      },
    });
    this.dialog.layout = true;
    this.dialog.filters = [
      new DropShadowFilter({
        color: 0xffe2bc,
        blur: 5,
        offset: { x: 0, y: 0 },
        alpha: 0.7,
        quality: 6,
      }),
    ];

    this.addChild(this.popupMask, this.dialog);
  }

  /** Present the popup, animated */
  public async show() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 5 })];
    }

    this.popupMask.alpha = 0;
    await animate(this.popupMask, { alpha: 0.5 }, { duration: 0.2, ease: 'linear' });
    this.dialog.open();
  }

  /** Dismiss the popup, animated */
  public async hide() {
    const currentEngine = engine();
    await Promise.all([
      animate(this.popupMask, { alpha: 0 }, { duration: 0.2, ease: 'linear' }),
      new Promise<void>((resolve) => {
        const connection = this.dialog.onClose.connect(() => {
          connection.disconnect();
          resolve();
        });
        this.dialog.close();
      }),
    ]);

    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [];
    }
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
