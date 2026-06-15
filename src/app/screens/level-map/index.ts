import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { TutorialPopup } from '../../popups/tutorial';
import { HUD } from '../../ui/hud';
import { EducationTutorialScreen } from '../education-level/level-tutorial';
import { LayerSelectScreen } from '../layer-select';
import { LevelRow } from './level-row';
import type { TMapUnit } from './units';

// const mapData: Record<
//   string,
//   { background: string; title: { text: string; fontSize: number }; levels: TLevel[] }
// > = {
//   typing: {
//     background: 'typing-level-map/background.png',
//     title: { text: 'TYPING JOURNEY', fontSize: 150 },
//     levels: [
//       {
//         id: 1,
//         title: 'TAKLAMAKAN DESERT',
//         unlocked: true,
//         miniMapImage: 'typing-level-map/button-preview.svg',
//         screen: TypingLevelScreen,
//         background: 'typing-level/background.png',
//         helpAsset: 'tutorial-popups/typing-tutorial.png',
//         backdropColor: 0x7d5600,
//       },
//       {
//         id: 2,
//         unlocked: false,
//         miniMapImage: 'typing-level-map/button-preview.svg',
//         background: 'typing-level/background.png',
//         helpAsset: 'tutorial-popups/typing-tutorial.png',
//         backdropColor: 0x7d5600,
//       },
//       {
//         id: 3,
//         unlocked: false,
//         miniMapImage: 'typing-level-map/button-preview.svg',
//         background: 'typing-level/background.png',
//         helpAsset: 'tutorial-popups/typing-tutorial.png',
//         backdropColor: 0x7d5600,
//       },
//       {
//         id: 4,
//         unlocked: false,
//         miniMapImage: 'typing-level-map/button-preview.svg',
//         background: 'typing-level/background.png',
//         helpAsset: 'tutorial-popups/typing-tutorial.png',
//         backdropColor: 0x7d5600,
//       },
//     ],
//   },
//   education: {
//     background: 'education-level-map/background.png',
//     title: { text: 'LEARN THE UYGHUR ALPHABET', fontSize: 100 },
//     levels: [
//       {
//         id: 1,
//         unlocked: true,
//         miniMapImage: 'education-level-map/button-preview.svg',
//         screen: EducationLevelScreen,
//         background: 'education-level/background.png',
//         helpAsset: 'tutorial-popups/education-level-1.png',
//         backdropColor: 0x4a90e2,
//       },
//       {
//         id: 2,
//         unlocked: true,
//         miniMapImage: 'education-level-map/button-preview.svg',
//         screen: EducationBubbleScreen,
//         background: 'education-level/background.png',
//         helpAsset: 'tutorial-popups/education-level-2.png',
//         backdropColor: 0x4a90e2,
//       },
//       {
//         id: 3,
//         unlocked: true,
//         miniMapImage: 'education-level-map/button-preview.svg',
//         screen: EducationSheepScreen,
//         background: 'education-level/background.png',
//         // TODO: missing tutorial asset
//         helpAsset: 'tutorial-popups/education-tutorial.png',
//         backdropColor: 0x4a90e2,
//       },
//       {
//         id: 4,
//         unlocked: true,
//         miniMapImage: 'education-level-map/button-preview.svg',
//         screen: EducationImageScreen,
//         background: 'education-level/background.png',
//         helpAsset: 'tutorial-popups/education-level-4.png',
//         backdropColor: 0x4a90e2,
//       },
//     ],
//   },
// };

export class LevelMapScreen extends Container {
  public static assetBundles = ['typing-level-map', 'education-level-map', 'ui'];

  private background: Sprite;
  private title: Text;
  private levelRow: LevelRow;
  private hud: HUD;
  private nextMapButton?: FancyButton;

  //   constructor(type: 'typing' | 'education') {
  //     super({
  //       layout: {
  //         flexDirection: 'column',
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //       },
  //     });
  //     engine().audio.bgm.setVolume(0.5);
  //     this.background = new Sprite({
  //       texture: Texture.from(mapData[type].background),
  //       layout: {
  //         width: '100%',
  //         height: '100%',
  //         position: 'absolute',
  //         objectFit: 'cover',
  //       },
  //     });

  //     this.hud = new HUD({
  //       onBack: () => {
  //         void engine().navigation.showScreen(LayerSelectScreen);
  //       },
  //       toTutorial: type === 'education',
  //       helpAsset: type === 'typing' ? 'tutorial-popups/typing-tutorial.png' : undefined,
  //       backdropColor: type === 'typing' ? 0x7d5600 : undefined,
  //     });

  //     this.title = new Text({
  //       text: mapData[type].title.text,
  //       style: {
  //         fontFamily: 'Concert One',
  //         fontSize: mapData[type].title.fontSize,
  //         fontWeight: '800',
  //         fill: 0x6b3f1f,
  //       },
  //       layout: {
  //         position: 'absolute',
  //         top: 140,
  //       },
  //     });
  //     this.levelRow = new LevelRow(mapData[type].levels, type);
  //     this.addChild(this.background, this.title, this.levelRow, this.hud);
  //   }
  constructor(mapUnit: TMapUnit) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
    engine().audio.bgm.setVolume(0.5);
    this.background = new Sprite({
      texture: Texture.from(mapUnit.background),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.hud = new HUD({
      onBack: () => void engine().navigation.showScreen(LayerSelectScreen),
      onHelp:
        mapUnit.type === 'education'
          ? () => void engine().navigation.showScreen(EducationTutorialScreen, mapUnit)
          : mapUnit.helpAsset
            ? () =>
                void engine().navigation.showPopup(TutorialPopup, {
                  asset: mapUnit.helpAsset!,
                  backdropColor: mapUnit.backdropColor!,
                  exitable: true,
                })
            : undefined,
    });

    this.title = new Text({
      text: mapUnit.title.text,
      style: {
        fontFamily: 'Concert One',
        fontSize: mapUnit.title.fontSize,
        fontWeight: '800',
        fill: 0x6b3f1f,
      },
      layout: {
        position: 'absolute',
        top: 140,
      },
    });
    this.levelRow = new LevelRow(mapUnit);

    if (mapUnit.nextMap) {
      const nextMap = mapUnit.nextMap;
      const size = 120;
      this.nextMapButton = new FancyButton({
        defaultView: new Graphics()
          .roundRect(0, 10, size, size, 20)
          .fill(0x7a5520)
          .roundRect(0, 0, size, size, 20)
          .fill(0xa66129),
        text: new Text({
          text: '>>',
          style: { fontFamily: 'Concert One', fontSize: 80, fill: 0xfff4e0 },
        }),
        animations: {
          hover: { props: { scale: { x: 1.1, y: 1.1 } }, duration: 100 },
          pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
        },
        anchor: 0.5,
      });
      this.nextMapButton.onPress.connect(() => {
        engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.showScreen(LevelMapScreen, nextMap);
      });
    }

    this.addChild(
      this.background,
      this.title,
      this.levelRow,
      ...(this.nextMapButton ? [this.nextMapButton] : []),
      this.hud,
    );
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.layout = { width, height };
    if (this.nextMapButton) {
      this.nextMapButton.position.set(width - 40, height / 2);
    }
  }

  public async show() {
    this.title.y = -(200 + 140);

    const animations = [
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      this.levelRow.playEnterAnimation(engine().navigation.height),
    ];

    if (this.nextMapButton) {
      const naturalX = this.nextMapButton.x;
      this.nextMapButton.x = naturalX + engine().navigation.width;
      animations.push(
        animate(
          this.nextMapButton,
          { x: naturalX },
          { duration: 0.4, ease: 'backOut', delay: 0.15 },
        ),
      );
    }

    await Promise.all(animations);
  }

  public async hide() {
    const screenHeight = engine().navigation.height;

    const animations = [
      animate(this.title, { y: -(200 + 140) }, { duration: 0.2, ease: 'backIn' }),
      this.levelRow.playExitAnimation(screenHeight),
    ];

    if (this.nextMapButton) {
      animations.push(
        animate(
          this.nextMapButton,
          { x: this.nextMapButton.x + engine().navigation.width },
          { duration: 0.2, ease: 'backIn' },
        ),
      );
    }

    await Promise.all(animations);
  }
}
