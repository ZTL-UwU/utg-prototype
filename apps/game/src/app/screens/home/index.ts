import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Sprite, Text, Texture, type TextDropShadow, type Ticker } from 'pixi.js';
import { Container } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { ensureValidSession } from '../../../lib/authSession';
import { continueIntoGame } from '../../../utils/continueIntoGame';
import { useAuthStore } from '../../../zustandStores/auth';
import { useOverlayStore } from '../../../zustandStores/overlayStore';
import { scriptState, type ORTHO_ENUM } from '../../../zustandStores/scriptState';
import { AuthScreen } from './auth';
import { Butterfly } from './butterfly';
import { ScriptButton } from './script-button';

const TITLE_ENTER_OFFSET = 60;
/** The screen that holds the app */
export class HomeScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ['home'];

  private background: Sprite;
  private butterfly: Butterfly;
  private titleContainer: Container;
  private scriptButtonContainer: Container;
  private title: Text;
  private subtitle: Text;
  private isStarting = false;
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
    this.scriptButtonContainer = new Container({
      layout: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
      },
    });

    const scripts: ORTHO_ENUM[] = ['Arabic', 'Latin', 'Cyrillic'];
    for (const s of scripts) {
      const disabled = s === 'Cyrillic';
      const btn = new ScriptButton(
        s,
        () => {
          void this.start(s);
        },
        disabled,
      );
      btn.layout = { width: ScriptButton.BTN_WIDTH, height: ScriptButton.BTN_HEIGHT, isLeaf: true };

      if (!disabled) {
        this.scriptButtonContainer.addChild(btn);
        continue;
      }

      const disabledButtonWrap = new Container({
        layout: {
          width: ScriptButton.BTN_WIDTH,
          height: ScriptButton.BTN_HEIGHT,
          position: 'relative',
        },
      });
      const comingSoon = new Text({
        text: 'Coming soon!',
        style: {
          fill: 0x284937,
          fontFamily: 'Concert One',
          fontSize: 32,
          fontWeight: 'bold',
          align: 'center',
        },
      });
      comingSoon.eventMode = 'none';
      comingSoon.layout = {
        position: 'absolute',
        left: 0,
        width: '100%',
        top: -36,
        isLeaf: true,
      };
      disabledButtonWrap.addChild(comingSoon, btn);
      this.scriptButtonContainer.addChild(disabledButtonWrap);
    }

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
        fontFamily: 'Concert One',
        fontSize: 200,
        fontWeight: '700',
        // dropShadow: textDropShadow,
      },
      layout: true,
    });

    this.subtitle = new Text({
      text: 'A TYPING ADVENTURE!',
      style: {
        fill: 0xffffff,
        fontFamily: 'Concert One',
        fontSize: 95,
        dropShadow: textDropShadow,
      },
      layout: true,
    });

    this.titleContainer.addChild(this.title, this.subtitle);

    const bottomGroup = new Container({
      layout: { flexDirection: 'column', alignItems: 'center', gap: 30 }, // tight gap here
    });
    bottomGroup.addChild(this.scriptButtonContainer);

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
    this.menuButton.layout = { position: 'absolute', top: 90, right: 90 };
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

  private async start(script: ORTHO_ENUM) {
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');

    if (this.isStarting) return;

    this.isStarting = true;
    this.scriptButtonContainer.interactiveChildren = false;

    scriptState.getState().setCurrentScript(script);
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
      this.isStarting = false;
      this.scriptButtonContainer.interactiveChildren = true;
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
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    await engine().audio.bgm.play('preload-audio/bgm-main.mp3', { volume: 0.2, start: 20 });
    this.butterfly.alpha = 0;
    this.titleContainer.alpha = 0;
    this.titleContainer.y = TITLE_ENTER_OFFSET;
    this.scriptButtonContainer.alpha = 0;
    this.scriptButtonContainer.y = 100;

    await Promise.all([
      animate(this.butterfly, { alpha: 1 }, { duration: 0.5, ease: 'easeOut' }),
      animate(this.titleContainer, { alpha: 1, y: 0 }, { duration: 0.45, ease: 'backOut' }),
      animate(this.scriptButtonContainer, { alpha: 1 }, { duration: 0.45, ease: 'easeOut' }),
      animate(this.scriptButtonContainer, { y: 0 }, { duration: 0.45, ease: 'backOut' }),
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
      animate(this.scriptButtonContainer, { alpha: 0 }, { duration: 0.2, ease: 'backIn' }),
      animate(this.scriptButtonContainer, { y: 100 }, { duration: 0.2, ease: 'backIn' }),
    ]);
  }

  /** Auto pause the app when window go out of focus */
  public blur() {}
}
