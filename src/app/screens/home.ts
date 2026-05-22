import { FancyButton } from '@pixi/ui';
import { Graphics, Sprite, Text, Texture, type Ticker } from 'pixi.js';
import { Container } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { PausePopup } from '../popups/PausePopup';

/** The screen that holds the app */
export class HomeScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ['home'];

  private background: Sprite;
  private startButton: Container;
  private title: Text;
  private subtitle: Text;

  constructor() {
    super();

    this.background = new Sprite({ texture: Texture.from('home/background.png'), zIndex: 0 });
    this.addChild(this.background);

    this.title = new Text({
      text: 'SOZLAR SAYAHATI',
      style: {
        fill: 0x3c6928,
        fontFamily: 'Concert One',
        fontSize: 200,
        fontWeight: '700',
        dropShadow: {
          color: 0x000000,
          blur: 4,
          distance: 6,
          alpha: 0.75,
        },
      },
      layout: true,
    });
    this.addChild(this.title);

    this.subtitle = new Text({
      text: "LET'S LEARN UYGHUR",
      style: {
        fill: 0xffffff,
        fontFamily: 'Concert One',
        fontSize: 95,
        dropShadow: {
          color: 0x000000,
          blur: 4,
          distance: 6,
          alpha: 0.75,
        },
      },
      layout: true,
    });
    this.addChild(this.subtitle);

    const buttonHeight = 80;
    const buttonWidth = 200;
    this.startButton = new Container({
      layout: {
        width: buttonWidth,
        height: buttonHeight,
        isLeaf: true, // Fixes the position issue of the button
      },
    });
    this.startButton.addChild(
      new FancyButton({
        defaultView: new Graphics().roundRect(0, 0, buttonWidth, buttonHeight).fill(0xd0823c),
        hoverView: new Graphics().roundRect(0, 0, buttonWidth, buttonHeight).fill(0xe09a5c),
        pressedView: new Graphics().roundRect(0, 0, buttonWidth, buttonHeight).fill(0xb86824),
        padding: 20,
        text: 'Start your journey',
        animations: {
          hover: {
            props: {
              scale: { x: 1.1, y: 1.1 },
            },
            duration: 100,
          },
          pressed: {
            props: {
              scale: { x: 0.9, y: 0.9 },
            },
            duration: 100,
          },
        },
        anchor: 0.5,
      }),
    );
    // this.addButton.onPress.connect(() => this.bouncer.add());
    this.addChild(this.startButton);
  }

  /** Prepare the screen just before showing */
  public prepare() {}

  /** Update the screen */
  public update(_time: Ticker) {}

  /** Pause gameplay - automatically fired when a popup is presented */
  public async pause() {}

  /** Resume gameplay */
  public async resume() {}

  /** Fully reset */
  public reset() {}

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    };
  }

  /** Show screen with animations */
  public async show(): Promise<void> {}

  /** Hide screen with animations */
  public async hide() {}

  /** Auto pause the app when window go out of focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      void engine().navigation.showPopup(PausePopup);
    }
  }
}
