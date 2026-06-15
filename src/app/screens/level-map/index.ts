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

export class LevelMapScreen extends Container {
  public static assetBundles = ['typing-level-map', 'education-level-map', 'ui'];

  private background: Sprite;
  private title: Text;
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

    if (mapUnit.prevMap) {
      const prevMap = mapUnit.prevMap;
      this.prevMapButton = createMapNavButton('<<');
      this.prevMapButton.onPress.connect(() => {
        engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.showScreen(LevelMapScreen, prevMap);
      });
    }

    if (mapUnit.nextMap) {
      const nextMap = mapUnit.nextMap;
      this.nextMapButton = createMapNavButton('>>');
      this.nextMapButton.onPress.connect(() => {
        engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
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
    this.title.y = -(200 + 140);

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
      animate(this.title, { y: -(200 + 140) }, { duration: 0.2, ease: 'backIn' }),
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
