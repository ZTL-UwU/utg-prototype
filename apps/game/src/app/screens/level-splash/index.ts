import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Assets, Container, Graphics, SplitText, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive } from '../../../engine/utils/viewport';
import { isLevelUnlocked } from '../../../lib/progression';
import { curveSplitText } from '../../../utils/curve-split-text';
import useSessionStore from '../../../zustandStores/sessionStore';
import { LockedLevelPopup } from '../../popups/locked-level';
import { TutorialPopup } from '../../popups/tutorial';
import { HUD } from '../../ui/hud';
import { LevelMapScreen } from '../level-map';
import type { SplashColorScheme, TLayer, TLevel, TMapUnit } from '../level-map/units';
import { REMOTE_MASCOTS_BUNDLE } from '../level-map/units';

const LAYER_SPLASH_COLORS: Record<TLayer, number> = {
  education: 0x0d8583,
  typing: 0xc45a14,
  game: 0x7e5433,
};

/** Space between the level number, title and START button on phones. */
const PHONE_GAP = 130;
/** Box the mascot is fitted into on phones. */
const PHONE_MASCOT_SIZE = 240;

function getDefaultColorScheme(layer: TLayer): SplashColorScheme {
  const fill = LAYER_SPLASH_COLORS[layer];
  return {
    BUTTON_FILL: fill,
    BUTTON_TEXT_FILL: 0xffffff,
    LEVEL_FONT_FILL: fill,
    LEVEL_TITLE_FILL: fill,
  };
}

export class LevelSplashScreen extends Container {
  public readonly screenName = 'LevelSplashScreen';
  public static assetBundles = ['level-splash', REMOTE_MASCOTS_BUNDLE, 'ui'];

  public static async prepareAssets(props?: unknown) {
    const level = (props as { level: TLevel } | undefined)?.level;
    const asset = level?.screen?.splashBackgroundAsset;
    if (asset) {
      await Assets.load(asset);
    }
  }

  private background: Sprite;
  private levelNumber: SplitText;
  private levelTitle: Text;
  private hud: HUD;
  private startButton: FancyButton;
  private mascot: Sprite | null;
  private colorScheme: SplashColorScheme;
  constructor({ level, mapUnit }: { level: TLevel; mapUnit: TMapUnit }) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    const splashBackgroundAsset = level.screen?.splashBackgroundAsset;
    if (!splashBackgroundAsset) {
      throw new Error(`Level ${level.id} has no splashBackgroundAsset on its screen class`);
    }

    this.background = new Sprite({
      texture: Texture.from(splashBackgroundAsset),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });
    this.colorScheme = level.splashColorScheme ?? getDefaultColorScheme(mapUnit.type);
    const levelIndex = mapUnit.levels.findIndex((entry) => entry.id === level.id) + 1;
    const levelTextEntry =
      mapUnit.type === 'education' ? `GAME ${levelIndex}` : `LEVEL ${levelIndex}`;

    this.levelNumber = new SplitText({
      text: levelTextEntry,
      style: {
        fontFamily: 'Concert One',
        fontSize: 175,
        fontWeight: '800',
        fill: this.colorScheme.LEVEL_FONT_FILL,
      },
      charAnchor: 0.5,
      filters: [
        new DropShadowFilter({
          color: 0x000000,
          alpha: 0.7,
          quality: 5,
          blur: 10,
        }),
      ],
      layout: {
        isLeaf: true,
        // Phones center the number, title and START button together; wider screens pin them.
        ...responsive({
          sm: { marginBottom: PHONE_GAP },
          lg: { position: 'absolute' as const, top: 120 },
        }),
      },
    });
    curveSplitText(this.levelNumber, 1600);

    this.levelTitle = new Text({
      text: level.title,
      style: {
        fontFamily: 'Concert One',
        fontSize: responsive({ sm: 64, lg: 90 }),
        fontWeight: '800',
        fill: this.colorScheme.LEVEL_TITLE_FILL,
      },
      filters: [
        new DropShadowFilter({
          color: 0x000000,
          alpha: 0.5,
          quality: 5,
          blur: 10,
        }),
      ],
      layout: responsive({
        sm: { marginBottom: PHONE_GAP },
        lg: { position: 'absolute', top: 450 },
      }),
    });

    this.mascot = null;
    if (level.mascotOnSplash && level.mascot) {
      this.mascot = new Sprite({
        texture: Texture.from(level.mascot.idleAlias),
        scale: responsive({ sm: 1, lg: 0.8 }),
        // Phones stand the mascot under the START button, inside the centered column.
        layout: responsive({
          sm: {
            width: PHONE_MASCOT_SIZE,
            height: PHONE_MASCOT_SIZE,
            objectFit: 'contain',
            marginTop: 100,
          },
          lg: { position: 'absolute', top: 660, left: 480 },
        }),
      });
    }

    const helpAssets = level.screen?.helpAssets ?? [];

    this.hud = new HUD({
      onBack: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
      help: helpAssets.length
        ? { kind: 'image', asset: helpAssets, backdropColor: level.backdropColor }
        : undefined,
    });

    const buttonWidth = 300;
    const buttonHeight = 150;
    this.startButton = new FancyButton({
      defaultView: new Graphics()
        .roundRect(0, 14, 300, 150, 40)
        .fill({ color: 0xffe2bc, alpha: 0.8 })
        .roundRect(0, 0, 300, 150, 40)
        .fill(this.colorScheme.BUTTON_FILL),
      text: new Text({
        text: 'START',
        style: {
          fill: this.colorScheme.BUTTON_TEXT_FILL,
          fontFamily: 'Concert One',
          fontSize: 80,
        },
      }),
      animations: {
        hover: {
          props: {
            scale: { x: 1.1, y: 1.1 },
          },
          duration: 100,
        },
      },
      anchor: 0.5,
    });
    this.startButton.layout = {
      isLeaf: true,
      width: buttonWidth,
      height: buttonHeight,
      ...responsive({
        sm: {},
        lg: { position: 'absolute' as const, top: level.title ? 660 : '45%' },
      }),
    };

    this.startButton.onPress.connect(() => {
      void engine().audio.sfx.play('level-splash/game-start.mp3');
      useSessionStore.getState().reset();
      useSessionStore.getState().startSession(mapUnit.type);

      const locked = !isLevelUnlocked(level);
      const startLevel = () =>
        void engine()
          .navigation.showScreen(level.screen!, level)
          .then(() => {
            if (!locked) return;
            void engine().navigation.showPopup(LockedLevelPopup, {
              layer: mapUnit.type,
              onClose: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
            });
          });
      if (!helpAssets.length) {
        startLevel();
        return;
      }

      this.removeChildren();
      this.addChild(this.background);
      void engine().navigation.showPopup(TutorialPopup, {
        assets: helpAssets,
        backdropColor: level.backdropColor,
        onNext: startLevel,
      });
    });

    const mascot = this.mascot ? [this.mascot] : [];
    this.addChild(
      this.background,
      this.levelNumber,
      // An empty title would still take up a line in the phones' centered column.
      ...(level.title ? [this.levelTitle] : []),
      // Phones need the mascot after START to lay it out below; wider screens draw START over it.
      ...responsive({
        sm: [this.startButton, ...mascot],
        lg: [...mascot, this.startButton],
      }),
      this.hud,
    );
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }

  /** Off-screen offsets measured from where layout put each element. */
  private offScreenOffsets() {
    const top = (element: Container) => element.layout?.computedLayout?.top ?? 0;
    return {
      levelNumber: -(300 + top(this.levelNumber)),
      levelTitle: -(200 + top(this.levelTitle)),
      startButton: engine().navigation.height - top(this.startButton),
    };
  }

  public async show() {
    // Lay out now, not at the next render, so in-flow elements know where they start from.
    engine().renderer.layout.update(this);
    const offScreen = this.offScreenOffsets();
    this.levelNumber.y = offScreen.levelNumber;
    this.levelTitle.y = offScreen.levelTitle;
    if (this.mascot) this.mascot.alpha = 0;
    this.startButton.y = offScreen.startButton;

    await Promise.all([
      ...(this.mascot
        ? [animate(this.mascot, { alpha: 1 }, { duration: 0.4, ease: 'backOut' })]
        : []),
      animate(this.levelNumber, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.levelTitle, { y: 0 }, { duration: 0.4, ease: 'backOut', delay: 0.1 }),
      animate(this.startButton, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
    ]);
  }

  public async hide() {
    const offScreen = this.offScreenOffsets();
    await Promise.all([
      ...(this.mascot
        ? [animate(this.mascot, { alpha: 0 }, { duration: 0.2, ease: 'backIn' })]
        : []),
      animate(this.levelNumber, { y: offScreen.levelNumber }, { duration: 0.2, ease: 'backIn' }),
      animate(
        this.levelTitle,
        { y: offScreen.levelTitle },
        { duration: 0.2, ease: 'backIn', delay: 0.1 },
      ),
      animate(this.startButton, { y: offScreen.startButton }, { duration: 0.2, ease: 'backIn' }),
    ]);
  }
}
