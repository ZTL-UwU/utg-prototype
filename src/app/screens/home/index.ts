import { FancyButton } from '@pixi/ui';
import { Graphics, Sprite, Text, Texture, type TextDropShadow, type Ticker } from 'pixi.js';
import { Container } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { LayerSelectPopup } from '../../popups/layer-select';

/** The screen that holds the app */
export class HomeScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ['home', 'layer-select'];

  private background: Sprite;
  private startButton: FancyButton;
  private titleContainer: Container;
  private title: Text;
  private subtitle: Text;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 150,
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

    this.titleContainer = new Container({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      },
    });

    const textDropShadow: Partial<TextDropShadow> = {
      color: 0x000000,
      blur: 20,
      distance: 0,
      alpha: 0.5,
    };

    this.title = new Text({
      text: 'SOZLAR SAYAHATI',
      style: {
        fill: 0x284937,
        fontFamily: 'Concert One',
        fontSize: 200,
        fontWeight: '700',
        dropShadow: textDropShadow,
      },
      layout: true,
    });

    this.subtitle = new Text({
      text: "LET'S LEARN UYGHUR",
      style: {
        fill: 0xffffff,
        fontFamily: 'Concert One',
        fontSize: 95,
        dropShadow: textDropShadow,
      },
      layout: true,
    });

    this.titleContainer.addChild(this.title, this.subtitle);

    const buttonHeight = 140;
    const buttonWidth = 350;
    this.startButton = new FancyButton({
      defaultView: new Graphics().roundRect(0, 0, buttonWidth, buttonHeight).fill(0x2a523c),
      hoverView: new Graphics().roundRect(0, 0, buttonWidth, buttonHeight).fill(0xe09a5c),
      pressedView: new Graphics().roundRect(0, 0, buttonWidth, buttonHeight).fill(0xb86824),
      padding: 20,
      text: new Text({
        text: 'START',
        style: {
          fill: 0xfdf7e7,
          fontSize: 56,
          fontFamily: 'Concert One',
          fontWeight: '700',
        },
      }),
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
    });

    this.startButton.layout = {
      width: buttonWidth,
      height: buttonHeight,
      isLeaf: true, // Fixes the position issue of the button
    };

    this.startButton.onPress.connect(() => {
      void engine().navigation.showPopup(LayerSelectPopup);
    });

    this.addChild(this.background, this.titleContainer, this.startButton);
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
    };
  }

  /** Show screen with animations */
  public async show(): Promise<void> {}

  /** Hide screen with animations */
  public async hide() {}

  /** Auto pause the app when window go out of focus */
  public blur() {}
}
