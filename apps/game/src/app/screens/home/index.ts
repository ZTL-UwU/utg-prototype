import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Graphics, Sprite, Text, Texture, type TextDropShadow, type Ticker } from 'pixi.js';
import { Container } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { ensureValidSession } from '../../../lib/authSession';
import { continueIntoGame } from '../../../utils/continueIntoGame';
import { useAuthStore } from '../../../zustandStores/auth';
import { AuthScreen } from './auth';
import { Butterfly } from './butterfly';

const TITLE_ENTER_OFFSET = 60;
const BUTTON_ENTER_OFFSET = 40;

/** The screen that holds the app */
export class HomeScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ['home'];

  private background: Sprite;
  private butterfly: Butterfly;
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

    this.butterfly = new Butterfly();

    this.titleContainer = new Container({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      },
    });

    const textDropShadow: Partial<TextDropShadow> = {
      color: 0x000000,
      blur: 5,
      distance: 0,
      alpha: 0.75,
    };

    this.title = new Text({
      text: 'SOZLER SAYLISI',
      style: {
        fill: 0x284937,
        fontFamily: 'Concert One',
        fontSize: 200,
        fontWeight: '700',
        // dropShadow: textDropShadow,
      },
      layout: true,
    });

    this.subtitle = new Text({
      text: 'A TYPICAL ADVENTURE!',
      style: {
        fill: 0xffffff,
        fontFamily: 'Concert One',
        fontSize: 95,
        dropShadow: textDropShadow,
      },
      layout: true,
    });

    this.titleContainer.addChild(this.title, this.subtitle);

    const buttonHeight = 180;
    const buttonWidth = 400;
    this.startButton = new FancyButton({
      defaultView: new Graphics()
        .roundRect(0, 15, buttonWidth, buttonHeight, 40)
        .fill({ color: 0x000000, alpha: 0.7 })
        .roundRect(0, 0, buttonWidth, buttonHeight, 40)
        .fill(0x2a523c),
      padding: 20,
      text: new Text({
        text: 'START',
        style: {
          fill: 0xfdf7e7,
          fontSize: 80,
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
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      if (!this.startButton.enabled) return;
      this.startButton.enabled = false;
      void (async () => {
        try {
          const ok = await ensureValidSession();
          if (ok) {
            const { user } = useAuthStore.getState();
            if (user) {
              continueIntoGame(user);
              return;
            }
          }
          void engine().navigation.showScreen(AuthScreen);
        } finally {
          this.startButton.enabled = true;
        }
      })();
    });

    this.addChild(this.background, this.butterfly, this.titleContainer, this.startButton);
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
    this.butterfly.resize(width, height);
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    await engine().audio.bgm.play('preload-audio/bgm-main.mp3', { volume: 0.2, start: 20 });
    this.butterfly.alpha = 0;
    this.titleContainer.alpha = 0;
    this.titleContainer.y = TITLE_ENTER_OFFSET;
    this.startButton.alpha = 0;
    this.startButton.y = BUTTON_ENTER_OFFSET;
    this.startButton.scale.set(0.92);

    await Promise.all([
      animate(this.butterfly, { alpha: 1 }, { duration: 0.5, ease: 'easeOut' }),
      animate(this.titleContainer, { alpha: 1, y: 0 }, { duration: 0.45, ease: 'backOut' }),
      animate(
        this.startButton,
        { alpha: 1, y: 0 },
        { duration: 0.4, ease: 'backOut', delay: 0.15 },
      ),
      animate(
        this.startButton.scale,
        { x: 1, y: 1 },
        { duration: 0.4, ease: 'backOut', delay: 0.15 },
      ),
    ]);
  }

  /** Hide screen with animations */
  public async hide(): Promise<void> {
    await Promise.all([
      animate(
        this.titleContainer,
        { alpha: 0, y: -TITLE_ENTER_OFFSET },
        { duration: 0.2, ease: 'backIn' },
      ),
      animate(
        this.startButton,
        { alpha: 0, y: BUTTON_ENTER_OFFSET },
        { duration: 0.2, ease: 'backIn' },
      ),
      animate(this.startButton.scale, { x: 0.92, y: 0.92 }, { duration: 0.2, ease: 'backIn' }),
    ]);
  }

  /** Auto pause the app when window go out of focus */
  public blur() {}
}
