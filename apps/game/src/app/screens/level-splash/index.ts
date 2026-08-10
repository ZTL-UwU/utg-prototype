import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Assets, Container, Graphics, SplitText, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { curveSplitText } from '../../../utils/curve-split-text';
import useSessionStore from '../../../zustandStores/sessionStore';
import { TutorialPopup } from '../../popups/tutorial';
import { HUD } from '../../ui/hud';
import { LevelMapScreen } from '../level-map';
import type { SplashColorScheme, TLevel, TMapUnit } from '../level-map/units';

type TMascot = 'sheep' | 'camel' | 'goat' | 'chef';

function getDefaultColorScheme(mascot: TMascot): SplashColorScheme {
  return {
    BUTTON_FILL: getColorThemeFromMascot(mascot),
    BUTTON_TEXT_FILL: 0xffffff,
    LEVEL_FONT_FILL: getColorThemeFromMascot(mascot),
    LEVEL_TITLE_FILL: getColorThemeFromMascot(mascot),
  };
}

function getColorThemeFromMascot(mascot: TMascot) {
  return mascot === 'camel'
    ? 0xc45a14
    : mascot === 'sheep'
      ? 0x0d8583
      : mascot === 'chef'
        ? 0x7e5433
        : 0x6e8539;
}

export class LevelSplashScreen extends Container {
  public static assetBundles = ['level-splash', 'mascots', 'ui'];

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
    this.colorScheme = level.splashColorScheme ?? getDefaultColorScheme(level.mascot);
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
        position: 'absolute',
        top: 120,
      },
    });
    curveSplitText(this.levelNumber, 1600);

    this.levelTitle = new Text({
      text: level.title,
      style: {
        fontFamily: 'Concert One',
        fontSize: 90,
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
      layout: {
        position: 'absolute',
        top: 450,
      },
    });

    this.mascot = null;
    if (level.mascotOnSplash) {
      this.mascot = new Sprite({
        texture: Texture.from(this.getTexturePathForMascot(level.mascot)),
        scale: 0.8,
        layout: {
          position: 'absolute',
          top: 660,
          left: 480,
        },
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
      position: 'absolute',
      isLeaf: true,
      width: buttonWidth,
      height: buttonHeight,
      top: level.title ? 660 : '45%',
    };

    this.startButton.onPress.connect(() => {
      void engine().audio.sfx.play('level-splash/game-start.mp3');
      useSessionStore.getState().reset();
      useSessionStore.getState().startSession(mapUnit.type);

      const startLevel = () => void engine().navigation.showScreen(level.screen!, level);
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

    this.addChild(
      this.background,
      this.levelNumber,
      this.levelTitle,
      ...(this.mascot ? [this.mascot] : []),
      this.startButton,
      this.hud,
    );
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }

  public async show() {
    this.levelNumber.y = -(300 + 120);
    this.levelTitle.y = -(200 + 450);
    if (this.mascot) this.mascot.alpha = 0;
    this.startButton.y = engine().navigation.height - 660;

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
    await Promise.all([
      ...(this.mascot
        ? [animate(this.mascot, { alpha: 0 }, { duration: 0.2, ease: 'backIn' })]
        : []),
      animate(this.levelNumber, { y: -(300 + 120) }, { duration: 0.2, ease: 'backIn' }),
      animate(this.levelTitle, { y: -(200 + 450) }, { duration: 0.2, ease: 'backIn', delay: 0.1 }),
      animate(
        this.startButton,
        { y: engine().navigation.height - 660 },
        { duration: 0.2, ease: 'backIn' },
      ),
    ]);
  }
  private getTexturePathForMascot(mascot: TMascot) {
    return `mascots/${mascot}/default.png`;
  }
}
