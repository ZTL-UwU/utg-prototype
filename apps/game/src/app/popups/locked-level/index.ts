import { Dialog, FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { BlurFilter, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import type { TLayer } from '../../screens/level-map/units';

// TODO: replace placeholder copy
const LOCKED_MESSAGES: Record<TLayer, string> = {
  education: 'Please complete all previous games to unlock this game!',
  typing: 'Please complete the previous typing journey to unlock this level!',
  game: 'Please complete all of education and typing journey to unlock the games!',
};

export type LockedLevelPopupProps = {
  layer: TLayer;
  onClose: () => void;
};

export class LockedLevelPopup extends Container {
  public readonly screenName = 'LockedLevelPopup';
  public static assetBundles = ['locked-popup'];

  private popupMask: Sprite;
  private dialog: Dialog;

  constructor({ layer, onClose }: LockedLevelPopupProps) {
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

    const padlock = new Sprite({
      texture: Texture.from('locked-popup/padlock.png'),
      layout: { width: 180, height: 180 },
    });
    const message = new Text({
      text: LOCKED_MESSAGES[layer],
      style: {
        fontFamily: 'Concert One',
        fontSize: 36,
        wordWrap: true,
        wordWrapWidth: contentWidth,
        align: 'center',
        fill: 0x6b411e,
      },
      // Layout rewraps text to its node width. Left intrinsic, each rewrap narrows the node
      // and `scale-down` shrinks the result; a fixed width keeps it wrapping at full size.
      layout: { width: contentWidth, objectFit: 'none', objectPosition: 'center' },
    });
    const content = new Container({
      layout: {
        width: contentWidth,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
      },
    });
    content.addChild(padlock, message);

    const okButton = new FancyButton({
      defaultView: new Graphics()
        .roundRect(0, 10, 240, 110, 30)
        .fill({ color: 0x7a5520 })
        .roundRect(0, 0, 240, 110, 30)
        .fill(0xa66129),
      text: new Text({
        text: 'OK',
        style: { fontFamily: 'Concert One', fontSize: 64, fill: 0xfff4e0 },
      }),
      animations: {
        hover: { props: { scale: { x: 1.05, y: 1.05 } }, duration: 100 },
        pressed: { props: { scale: { x: 0.95, y: 0.95 } }, duration: 100 },
      },
    });
    okButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.hidePopup().then(onClose);
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
        text: 'LEVEL LOCKED',
        style: {
          fontFamily: 'Concert One',
          fontSize: 48,
          fontWeight: 'bold',
          align: 'center',
          fill: 0x6b411e,
        },
      }),
      content: [content],
      buttons: [okButton],
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

  public async show() {
    const currentEngine = engine();
    void currentEngine.audio.sfx.play('preload-audio/sfx/popup.mp3');
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 5 })];
    }

    this.popupMask.alpha = 0;
    await animate(this.popupMask, { alpha: 0.5 }, { duration: 0.2, ease: 'linear' });
    this.dialog.open();
  }

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
