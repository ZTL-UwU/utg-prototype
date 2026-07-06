import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { HUD } from '../../ui/hud';
import { LayerSelectScreen } from '../layer-select';
import { EducationLevelSelect } from '../level-select/education-level-select';
import { CurvedText } from './curved-text';
import { LevelRow } from './level-row';
import { getNextMap, getPrevMap, type TMapUnit } from './units';

export class LevelMapScreen extends Container {
  public static assetBundles = ['typing-level-map', 'education-level-map', 'game-level-map', 'ui'];

  private background: Sprite;
  private title: CurvedText;
  private levelRow: LevelRow;
  private hud: HUD;
  private nextMapButton?: FancyButton;
  private prevMapButton?: FancyButton;

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
      onBack: () =>
        void engine().navigation.showScreen(
          mapUnit.type === 'education' ? EducationLevelSelect : LayerSelectScreen,
        ),
      help: { kind: 'tutorial', mapUnit, presentation: 'screen' },
    });

    this.title = new CurvedText({
      text: mapUnit.title.text,
      style: {
        fontFamily: 'Concert One',
        fontSize: mapUnit.title.fontSize,
        fontWeight: '800',
        fill: 0xffffff,
      },
    });
    this.title.filters = [
      new DropShadowFilter({
        color: 0x000000,
        blur: 8,
        quality: 5,
        offset: { x: 0, y: 0 },
      }),
    ];
    const titleBounds = this.title.getLocalBounds();
    this.title.layout = {
      position: 'absolute',
      top: 100,
      width: titleBounds.width,
      height: titleBounds.height,
    };
    this.levelRow = new LevelRow(mapUnit);

    const createMapNavButton = (label: string) => {
      const size = 120;
      return new FancyButton({
        defaultView: new Graphics()
          .roundRect(0, 10, size, size, 20)
          .fill(0x7a5520)
          .roundRect(0, 0, size, size, 20)
          .fill(0xa66129),
        text: new Text({
          text: label,
          style: { fontFamily: 'Concert One', fontSize: 80, fill: 0xfff4e0 },
        }),
        animations: {
          hover: { props: { scale: { x: 1.1, y: 1.1 } }, duration: 100 },
          pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
        },
        anchor: 0.5,
      });
    };

    const prevMap = getPrevMap(mapUnit);
    if (prevMap) {
      this.prevMapButton = createMapNavButton('<<');
      this.prevMapButton.onPress.connect(() => {
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.showScreen(LevelMapScreen, prevMap);
      });
    }

    const nextMap = getNextMap(mapUnit);
    if (nextMap) {
      this.nextMapButton = createMapNavButton('>>');
      this.nextMapButton.onPress.connect(() => {
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.showScreen(LevelMapScreen, nextMap);
      });
    }

    this.addChild(
      this.background,
      this.title,
      this.levelRow,
      ...(this.prevMapButton ? [this.prevMapButton] : []),
      ...(this.nextMapButton ? [this.nextMapButton] : []),
      this.hud,
    );
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.layout = { width, height };
    if (this.prevMapButton) {
      this.prevMapButton.position.set(40, height / 2);
    }
    if (this.nextMapButton) {
      this.nextMapButton.position.set(width - 40, height / 2);
    }
  }

  public async show() {
    this.title.y = -(300 + 100);

    const animations = [
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      this.levelRow.playEnterAnimation(engine().navigation.height),
    ];

    if (this.prevMapButton) {
      const naturalX = this.prevMapButton.x;
      this.prevMapButton.x = naturalX - engine().navigation.width;
      animations.push(
        animate(this.prevMapButton, { x: naturalX }, { duration: 0.4, ease: 'easeOut' }),
      );
    }

    if (this.nextMapButton) {
      const naturalX = this.nextMapButton.x;
      this.nextMapButton.x = naturalX + engine().navigation.width;
      animations.push(
        animate(this.nextMapButton, { x: naturalX }, { duration: 0.4, ease: 'easeOut' }),
      );
    }

    await Promise.all(animations);
  }

  public async hide() {
    const screenHeight = engine().navigation.height;

    const animations = [
      animate(this.title, { y: -(300 + 100) }, { duration: 0.2, ease: 'backIn' }),
      this.levelRow.playExitAnimation(screenHeight),
    ];

    if (this.prevMapButton) {
      animations.push(
        animate(
          this.prevMapButton,
          { x: this.prevMapButton.x - engine().navigation.width },
          { duration: 0.2, ease: 'easeIn' },
        ),
      );
    }

    if (this.nextMapButton) {
      animations.push(
        animate(
          this.nextMapButton,
          { x: this.nextMapButton.x + engine().navigation.width },
          { duration: 0.2, ease: 'easeIn' },
        ),
      );
    }

    await Promise.all(animations);
  }
}
