import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Container, Graphics, SplitText, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { curveSplitText } from '../../../utils/curve-split-text';
import useSessionStore from '../../../zustandStores/sessionStore';
import { TutorialPopup } from '../../popups/tutorial';
import { HUD } from '../../ui/hud';
import { LevelMapScreen } from '../level-map';
import type { TLevel } from '../level-map/level-button';
import type { TMapUnit } from '../level-map/units';

export class LevelSplashScreen extends Container {
  public static assetBundles = ['level-splash', 'typing-level', 'education-level', 'mascots', 'ui'];

  private background: Sprite;
  private levelNumber: SplitText;
  private levelTitle: Text;
  private hud: HUD;
  private startButton: FancyButton;
  private mascot: Sprite;

  constructor({ level, mapUnit }: { level: TLevel; mapUnit: TMapUnit }) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from(level.background),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.levelNumber = new SplitText({
      text: `LEVEL ${level.id}`,
      style: {
        fontFamily: 'Concert One',
        fontSize: 250,
        fontWeight: '800',
        fill: this.getColorThemeFromMascot(level.mascot),
      },
      charAnchor: 0.5,
      filters: [
        new DropShadowFilter({
          color: 0x000000,
          alpha: 0.3,
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
        fill: this.getColorThemeFromMascot(level.mascot),
      },
      filters: [
        new DropShadowFilter({
          color: 0x000000,
          alpha: 0.2,
          blur: 10,
        }),
      ],
      layout: {
        position: 'absolute',
        top: 450,
      },
    });

    this.mascot = new Sprite({
      texture: Texture.from(this.getTexturePathForMascot(level.mascot)),
      scale: 0.8,
      layout: {
        position: 'absolute',
        top: 660,
        left: 480,
      },
    });

    this.hud = new HUD({
      onBack: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
      onHelp: () =>
        void engine().navigation.showPopup(TutorialPopup, {
          asset: level.helpAsset,
          backdropColor: level.backdropColor,
          exitable: true,
        }),
    });

    const buttonWidth = 300;
    const buttonHeight = 150;
    this.startButton = new FancyButton({
      defaultView: new Graphics()
        .roundRect(0, 10, 300, 150, 40)
        .fill(0xffe2bc)
        .roundRect(0, 0, 300, 150, 40)
        .fill(this.getColorThemeFromMascot(level.mascot)),
      text: new Text({
        text: 'START',
        style: {
          fill: 0xffe2bc,
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
      top: 660,
    };

    this.startButton.onPress.connect(() => {
      void engine().audio.sfx.play('level-splash/game-start.mp3');
      useSessionStore.getState().reset();
      useSessionStore.getState().startSession(mapUnit.type);

      this.removeChildren();
      this.addChild(this.background);
      void engine().navigation.showPopup(TutorialPopup, {
        asset: level.helpAsset,
        backdropColor: level.backdropColor,
        onNext: () => void engine().navigation.showScreen(level.screen!, mapUnit),
      });
    });

    this.addChild(
      this.background,
      this.levelNumber,
      this.levelTitle,
      this.mascot,
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
    this.mascot.alpha = 0;
    this.startButton.y = engine().navigation.height - 660;

    await Promise.all([
      animate(this.mascot, { alpha: 1 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.levelNumber, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.levelTitle, { y: 0 }, { duration: 0.4, ease: 'backOut', delay: 0.1 }),
      animate(this.startButton, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
    ]);
  }

  public async hide() {
    await Promise.all([
      animate(this.mascot, { alpha: 0 }, { duration: 0.2, ease: 'backIn' }),
      animate(this.levelNumber, { y: -(300 + 120) }, { duration: 0.2, ease: 'backIn' }),
      animate(this.levelTitle, { y: -(200 + 450) }, { duration: 0.2, ease: 'backIn', delay: 0.1 }),
      animate(
        this.startButton,
        { y: engine().navigation.height - 660 },
        { duration: 0.2, ease: 'backIn' },
      ),
    ]);
  }
  private getTexturePathForMascot(mascot: 'sheep' | 'camel' | 'goat') {
    return `mascots/${mascot}/default.png`;
  }
  private getColorThemeFromMascot(mascot: 'sheep' | 'camel' | 'goat') {
    return mascot === 'camel' ? 0xc45a14 : mascot === 'sheep' ? 0x2d6b6a : 0x6e8539;
  }
}
