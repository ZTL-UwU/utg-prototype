import { animate } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { HUD } from '../../ui/hud';
import { EducationLevelScreen } from '../education-level/level-1';
import { EducationBubbleScreen } from '../education-level/level-2';
import { EducationSheepScreen } from '../education-level/level-3';
import { EducationImageScreen } from '../education-level/level-4';
import { LayerSelectScreen } from '../layer-select';
import { TypingLevelScreen } from '../typing-level';
import type { TLevel } from './level-button';
import { LevelRow } from './level-row';

const mapData: Record<
  string,
  { background: string; title: { text: string; fontSize: number }; levels: TLevel[] }
> = {
  typing: {
    background: 'typing-level-map/background.png',
    title: { text: 'TYPING JOURNEY', fontSize: 150 },
    levels: [
      {
        id: 1,
        title: 'TAKLAMAKAN DESERT',
        unlocked: true,
        miniMapImage: 'typing-level-map/button-preview.svg',
        screen: TypingLevelScreen,
        background: 'typing-level/background.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
        backdropColor: 0x7d5600,
      },
      {
        id: 2,
        unlocked: false,
        miniMapImage: 'typing-level-map/button-preview.svg',
        background: 'typing-level/background.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
        backdropColor: 0x7d5600,
      },
      {
        id: 3,
        unlocked: false,
        miniMapImage: 'typing-level-map/button-preview.svg',
        background: 'typing-level/background.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
        backdropColor: 0x7d5600,
      },
      {
        id: 4,
        unlocked: false,
        miniMapImage: 'typing-level-map/button-preview.svg',
        background: 'typing-level/background.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
        backdropColor: 0x7d5600,
      },
    ],
  },
  education: {
    background: 'education-level-map/background.png',
    title: { text: 'LEARN THE UYGHUR ALPHABET', fontSize: 100 },
    levels: [
      {
        id: 1,
        unlocked: true,
        miniMapImage: 'education-level-map/button-preview.svg',
        screen: EducationLevelScreen,
        background: 'education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-1.png',
        backdropColor: 0x4a90e2,
      },
      {
        id: 2,
        unlocked: true,
        miniMapImage: 'education-level-map/button-preview.svg',
        screen: EducationBubbleScreen,
        background: 'education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-2.png',
        backdropColor: 0x4a90e2,
      },
      {
        id: 3,
        unlocked: true,
        miniMapImage: 'education-level-map/button-preview.svg',
        screen: EducationSheepScreen,
        background: 'education-level/background.png',
        // TODO: missing tutorial asset
        helpAsset: 'tutorial-popups/education-tutorial.png',
        backdropColor: 0x4a90e2,
      },
      {
        id: 4,
        unlocked: true,
        miniMapImage: 'education-level-map/button-preview.svg',
        screen: EducationImageScreen,
        background: 'education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-4.png',
        backdropColor: 0x4a90e2,
      },
    ],
  },
};

export class LevelMapScreen extends Container {
  public static assetBundles = ['typing-level-map', 'education-level-map', 'ui'];

  private background: Sprite;
  private title: Text;
  private levelRow: LevelRow;
  private hud: HUD;

  constructor(type: 'typing' | 'education') {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
    engine().audio.bgm.setVolume(0.5);
    this.background = new Sprite({
      texture: Texture.from(mapData[type].background),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.hud = new HUD({
      onBack: () => {
        void engine().navigation.showScreen(LayerSelectScreen);
      },
      toTutorial: type === 'education',
      helpAsset: type === 'typing' ? 'tutorial-popups/typing-tutorial.png' : undefined,
      backdropColor: type === 'typing' ? 0x7d5600 : undefined,
    });

    this.title = new Text({
      text: mapData[type].title.text,
      style: {
        fontFamily: 'Concert One',
        fontSize: mapData[type].title.fontSize,
        fontWeight: '800',
        fill: 0x6b3f1f,
      },
      layout: {
        position: 'absolute',
        top: 140,
      },
    });
    this.levelRow = new LevelRow(mapData[type].levels, type);
    this.addChild(this.background, this.title, this.levelRow, this.hud);
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }

  public async show() {
    this.title.y = -(200 + 140);

    await Promise.all([
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      this.levelRow.playEnterAnimation(engine().navigation.height),
    ]);
  }

  public async hide() {
    const screenHeight = engine().navigation.height;

    await Promise.all([
      animate(this.title, { y: -(200 + 140) }, { duration: 0.2, ease: 'backIn' }),
      this.levelRow.playExitAnimation(screenHeight),
    ]);
  }
}
