import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Container, Graphics, SplitText, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { curveSplitText } from '../../../utils/curve-split-text';
import useSessionStore from '../../../zustandStores/sessionStore';
import { HUD } from '../../ui/hud';
import { LevelMapScreen } from '../level-map';
import type { TLevel } from '../level-map/level-button';

export class LevelSplashScreen extends Container {
  public static assetBundles = ['typing-level', 'education-level', 'mascots', 'ui'];

  private background: Sprite;
  private levelNumber: SplitText;
  private levelTitle: Text;
  private hud: HUD;
  private startButton: FancyButton;
  private mascot: Sprite;

  constructor({ type, level }: { type: 'typing' | 'education'; level: TLevel }) {
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
        fill: type == 'typing' ? 0xc98144 : 0xffffff,
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
        fill: 0x6b3f1f,
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
      texture: Texture.from(
        type == 'typing' ? 'mascots/camel/default.png' : 'mascots/sheep/default.svg',
      ),
      scale: 0.8,
      layout: {
        position: 'absolute',
        top: 660,
        left: 480,
      },
    });

    this.hud = new HUD({
      onBack: () => {
        void engine().navigation.showScreen(LevelMapScreen, type);
      },
    });

    const buttonWidth = 300;
    const buttonHeight = 150;
    this.startButton = new FancyButton({
      defaultView: new Graphics()
        .roundRect(0, 10, 300, 150, 40)
        .fill(0xffe2bc)
        .roundRect(0, 0, 300, 150, 40)
        .fill(type == 'typing' ? 0xc45a14 : 0x2d6b6a),
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
      useSessionStore.getState().reset();
      useSessionStore.getState().startSession(type);

      // Placeholder for the session start
      void engine().navigation.showScreen(level.screen!);
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
}
