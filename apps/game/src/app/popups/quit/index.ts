import { Dialog, FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Container, Graphics, Texture, Sprite, Text } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { m } from '../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { REMOTE_MASCOTS_BUNDLE, type TMascotAssets } from '../../screens/level-map/units';
import { ScreenBlur } from '../../ui/screen-blur';

/** How hard the screen behind the popup is blurred. */
const SCREEN_BLUR = 5;

const FALLBACK_SAD_TEXTURE = 'mascots/sheep/sad.png';

export type QuitPopupProps = {
  mascot?: TMascotAssets | null;
  onQuit: () => void;
};

export class QuitPopup extends Container {
  public readonly screenName = 'QuitPopup';
  public static assetBundles = ['quit', REMOTE_MASCOTS_BUNDLE, 'mascots'];

  /** The blur this popup puts on the screen beneath it, joining its own filters. */
  private screenBlur?: ScreenBlur;
  private popupMask: Sprite;
  private dialog: Dialog;

  constructor({ mascot, onQuit }: QuitPopupProps) {
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

    const sadMascot = new Sprite({
      texture: Texture.from(mascot?.sadAlias ?? FALLBACK_SAD_TEXTURE),
      layout: true,
    });
    const sadMascotContainer = new Container({
      layout: {
        width: contentWidth,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    });
    sadMascotContainer.addChild(sadMascot);

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
        text: m.quit_confirm(),
        style: {
          fontFamily: DISPLAY_FONT_FAMILY,
          fontSize: 48,
          fontWeight: 'bold',
          wordWrap: true,
          wordWrapWidth: dialogWidth - 40,
          align: 'center',
          fill: 0x6b411e,
        },
      }),
      content: [sadMascotContainer],
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
    void currentEngine.audio.sfx.play('preload-audio/sfx/popup.mp3');
    this.screenBlur = new ScreenBlur(SCREEN_BLUR);

    this.popupMask.alpha = 0;
    await animate(this.popupMask, { alpha: 0.5 }, { duration: 0.2, ease: 'linear' });
    this.dialog.open();
  }

  /** Dismiss the popup, animated */
  public async hide() {
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

    this.screenBlur?.remove();
    this.screenBlur = undefined;
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
