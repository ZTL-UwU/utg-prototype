import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive, topClearance } from '../../../engine/utils/viewport';
import { ensureValidSession } from '../../../lib/authSession';
import { m } from '../../../paraglide/messages.js';
import { continueIntoGame } from '../../../utils/continueIntoGame';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { useAuthStore } from '../../../zustandStores/auth';
import { useOverlayStore } from '../../../zustandStores/overlayStore';
import { BACKDROP_TEXT_SHADOW, createPrimaryButton } from '../../ui/primary-button';
import { AuthScreen } from './auth';
import { Butterfly } from './butterfly';

const TITLE_ENTER_OFFSET = 60;
const BUTTON_ENTER_OFFSET = 100;
// Safari fakes Concert One's bold wider than Chrome, so the title shrinks to fit narrow screens
const TITLE_SIDE_MARGIN = 32;
/** The menu button's distance from the top and right edges, below the notch on phones. */
const MENU_BUTTON_INSET = 90;
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

    this.title = new Text({
      text: 'SOZLER SEYLISI',
      style: {
        fill: 0x284937,
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: responsive({ sm: 116, lg: 200 }),
        fontWeight: '700',
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
        dropShadow: BACKDROP_TEXT_SHADOW,
      },
      layout: true,
    });

    this.titleContainer.addChild(this.title, this.subtitle);

    const bottomGroup = new Container({
      layout: { flexDirection: 'column', alignItems: 'center', gap: 30 }, // tight gap here
    });
    this.startButton = createPrimaryButton({
      text: m.start(),
      width: 400,
      height: 180,
      fontSize: 80,
      radius: 40,
      shadowOffset: 15,
      padding: 20,
    });
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
    this.menuButton.layout = { position: 'absolute', right: MENU_BUTTON_INSET };
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
    if (!this.startButton.enabled) return;
    this.startButton.enabled = false;
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');

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
      // Gone once another screen took over.
      if (!this.destroyed) this.startButton.enabled = true;
    }
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
    this.menuButton.layout = { top: MENU_BUTTON_INSET + topClearance(height) };
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
}
