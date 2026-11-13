import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Graphics, Sprite, Text, Texture, type TextDropShadow, type Ticker } from 'pixi.js';
import { Container } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive, topClearance } from '../../../engine/utils/viewport';
import { ensureValidSession } from '../../../lib/authSession';
import { m } from '../../../paraglide/messages.js';
import { continueIntoGame } from '../../../utils/continueIntoGame';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { useAuthStore } from '../../../zustandStores/auth';
import { useOverlayStore } from '../../../zustandStores/overlayStore';
import { AuthScreen } from './auth';
import { Butterfly } from './butterfly';

const TITLE_ENTER_OFFSET = 60;
const BUTTON_ENTER_OFFSET = 100;
// Safari fakes Concert One's bold wider than Chrome, so the title shrinks to fit narrow screens
const TITLE_SIDE_MARGIN = 32;
/** The screen that holds the app */
export class HomeScreen extends Container {
  public readonly screenName = 'HomeScreen';
  /** Assets bundles required by this screen */
  public static assetBundles = ['home'];

  private background: Sprite;
  private butterfly: Butterfly;
  private titleContainer: Container;
  private startButton: FancyButton;
  private title: Text;
  private titleWidth: number; // unscaled
  private subtitle: Text;
  private menuButton: FancyButton;
  private logo: Sprite;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 60,
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
      text: 'SOZLER SEYLISI',
      style: {
        fill: 0x284937,
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: responsive({ sm: 116, lg: 200 }),
        fontWeight: '700',
        // dropShadow: textDropShadow,
      },
      layout: true,
    });
    this.titleWidth = this.title.getLocalBounds().width;

    this.subtitle = new Text({
      text: m.home_tagline(),
      style: {
        fill: 0xffffff,
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: responsive({ sm: 76, lg: 95 }),
        dropShadow: textDropShadow,
      },
      layout: true,
    });

    this.titleContainer.addChild(this.title, this.subtitle);

    const bottomGroup = new Container({
      layout: { flexDirection: 'column', alignItems: 'center', gap: 30 }, // tight gap here
    });
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
        text: m.start(),
        style: {
          fill: 0xfdf7e7,
          fontSize: 80,
          fontFamily: DISPLAY_FONT_FAMILY,
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
      void this.start();
    });
    bottomGroup.addChild(this.startButton);

    this.menuButton = new FancyButton({
      defaultView: 'home/menu-button.png',
      animations: {
        hover: {
          props: {
            scale: { x: 1.1, y: 1.1 },
          },
          duration: 100,
        },
        pressed: {
          props: {
            scale: { x: 0.97, y: 0.97 },
          },
          duration: 100,
        },
      },
      anchor: 0.5,
    });
    this.menuButton.layout = {
      position: 'absolute',
      top: 90 + topClearance(engine().navigation.height),
      right: 90,
    };
    this.menuButton.onPress.connect(() => {
      useOverlayStore.getState().show('menu');
    });

    this.logo = new Sprite({
      texture: Texture.from('home/logo.svg'),
      layout: {
        position: 'absolute',
        bottom: 0,
        right: 36,
        width: 140,
        height: 67,
        isLeaf: true,
      },
    });

    this.addChild(
      this.background,
      this.butterfly,
      this.titleContainer,
      bottomGroup,
      this.menuButton,
      this.logo,
    );
  }

  private async start() {
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');

    if (!this.startButton.enabled) return;
    this.startButton.enabled = false;

    try {
      const ok = await ensureValidSession();
      if (ok) {
        const { user } = useAuthStore.getState();
        if (user) {
          continueIntoGame(user);
          return;
        }
      }
      await engine().navigation.showScreen(AuthScreen);
    } finally {
      this.startButton.enabled = true;
    }
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
    this.title.scale.set(Math.min(1, (width - 2 * TITLE_SIDE_MARGIN) / this.titleWidth));
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    this.butterfly.alpha = 0;
    this.titleContainer.alpha = 0;
    this.titleContainer.y = TITLE_ENTER_OFFSET;
    this.startButton.alpha = 0;
    this.startButton.y = BUTTON_ENTER_OFFSET;

    await Promise.all([
      animate(this.butterfly, { alpha: 1 }, { duration: 0.5, ease: 'easeOut' }),
      animate(this.titleContainer, { alpha: 1, y: 0 }, { duration: 0.45, ease: 'backOut' }),
      animate(this.startButton, { alpha: 1 }, { duration: 0.45, ease: 'easeOut' }),
      animate(this.startButton, { y: 0 }, { duration: 0.45, ease: 'backOut' }),
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
      animate(this.startButton, { alpha: 0 }, { duration: 0.2, ease: 'backIn' }),
      animate(this.startButton, { y: BUTTON_ENTER_OFFSET }, { duration: 0.2, ease: 'backIn' }),
    ]);
  }

  /** Auto pause the app when window go out of focus */
  public blur() {}
}
