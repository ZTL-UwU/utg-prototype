import { Dialog, FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Texture, Sprite, Text } from 'pixi.js';

import { engine } from '../../../engine/getEngine';

export class HelpPopup extends Container {
  private popupMask: Sprite;
  private dialog: Dialog;

  constructor() {
    super({
      layout: {
        width: '100%',
        height: '100%',
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

    this.dialog = new Dialog({
      background: new Graphics().roundRect(0, 0, 400, 200, 20).fill(0xf2c583),
      title: new Text({
        text: 'Help',
        style: {
          fontFamily: 'Concert One',
          fontSize: 48,
          fontWeight: 'bold',
          fill: 0x000000,
        },
      }),
      content: 'Are you sure?',
      buttons: [
        new FancyButton({
          defaultView: new Graphics().roundRect(0, 0, 100, 40, 10).fill(0xffffff),
          text: 'OK',
        }),
      ],
      animations: {
        open: {
          props: {},
          duration: 300,
        },
        close: {
          props: {},
          duration: 300,
        },
      },
    });
    this.dialog.layout = true;

    this.addChild(this.popupMask, this.dialog);

    this.dialog.onSelect.connect(() => {
      void engine().navigation.hidePopup();
    });
  }

  /** Present the popup, animated */
  public async show() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 5 })];
    }

    this.popupMask.alpha = 0;
    animate(this.popupMask, { alpha: 0.5 }, { duration: 0.2, ease: 'linear' });
    this.dialog.open();
  }

  /** Dismiss the popup, animated */
  public async hide() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [];
    }
    animate(this.popupMask, { alpha: 0 }, { duration: 0.2, ease: 'linear' });
    this.dialog.close();
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
