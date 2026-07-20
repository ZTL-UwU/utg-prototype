import { FancyButton } from '@pixi/ui';
import { Container, Graphics, Sprite, Text, Texture, type TextDropShadow } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import useCourseStore from '../../../zustandStores/courseStore';
import { HomeScreen } from '../home';

const textDropShadow: Partial<TextDropShadow> = {
  color: 0x000000,
  blur: 5,
  distance: 0,
  alpha: 0.75,
};

/** Shown when the course catalog fails to load from the backend. */
export class CourseLoadErrorScreen extends Container {
  public static assetBundles = ['home'];

  private background: Sprite;
  private title: Text;
  private message: Text;
  private retryButton: FancyButton;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
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

    this.title = new Text({
      text: "Couldn't load course",
      style: {
        fontFamily: 'Concert One',
        fontSize: 72,
        fontWeight: '700',
        fill: 0xffffff,
        dropShadow: textDropShadow,
      },
      layout: true,
    });

    const errorDetail = useCourseStore.getState().error;
    this.message = new Text({
      text: errorDetail ?? 'Check your connection and try again.',
      style: {
        fontFamily: 'Concert One',
        fontSize: 36,
        fill: 0xffffff,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 900,
        dropShadow: textDropShadow,
      },
      layout: true,
    });

    const buttonHeight = 140;
    const buttonWidth = 360;
    this.retryButton = new FancyButton({
      defaultView: new Graphics()
        .roundRect(0, 12, buttonWidth, buttonHeight, 36)
        .fill({ color: 0x000000, alpha: 0.7 })
        .roundRect(0, 0, buttonWidth, buttonHeight, 36)
        .fill(0x2a523c),
      text: new Text({
        text: 'RETRY',
        style: {
          fontFamily: 'Concert One',
          fontSize: 56,
          fontWeight: '700',
          fill: 0xfdf7e7,
        },
      }),
      animations: {
        hover: {
          props: { scale: { x: 1.05, y: 1.05 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.95, y: 0.95 } },
          duration: 100,
        },
      },
      anchor: 0.5,
    });
    this.retryButton.layout = {
      width: buttonWidth,
      height: buttonHeight,
      isLeaf: true,
    };
    this.retryButton.onPress.connect(() => {
      void this.handleRetry();
    });

    this.addChild(this.background, this.title, this.message, this.retryButton);
  }

  private async handleRetry() {
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
    this.retryButton.enabled = false;
    this.message.text = 'Loading…';

    await useCourseStore.getState().fetchCourseStructure();

    if (useCourseStore.getState().status === 'ready') {
      await engine().navigation.showScreen(HomeScreen);
      return;
    }

    this.message.text = useCourseStore.getState().error ?? 'Check your connection and try again.';
    this.retryButton.enabled = true;
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
  }
}
