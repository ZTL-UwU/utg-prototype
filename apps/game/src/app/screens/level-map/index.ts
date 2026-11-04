import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive } from '../../../engine/utils/viewport';
import { isMapUnitUnlocked } from '../../../lib/progression';
import { convertToCurrentScript, getScriptFontFamily } from '../../../utils/script';
import { HUD } from '../../ui/hud';
import { LayerSelectScreen } from '../layer-select';
import { EducationLevelSelect } from '../level-select/education-level-select';
import { CurvedText } from './curved-text';
import { LevelRow } from './level-row';
import { getNextMap, getPrevMap, type TMapUnit } from './units';

/** Phones drop the titles below the back button and script pill, which would cover them. */
const TITLE_TOP = { sm: 170, lg: 100 };
const SUBTITLE_TOP = { sm: 310, lg: 300 };
/** Space kept on each side of a title that is shrunk to fit a narrow screen. */
const TITLE_SIDE_MARGIN = 40;
/** Extra margin so drop shadows don't peek in from the screen edge. */
const OFF_SCREEN_MARGIN = 40;

export class LevelMapScreen extends Container {
  public readonly screenName = 'LevelMapScreen';
  public static assetBundles = ['typing-level-map', 'education-level-map', 'game-level-map', 'ui'];

  private background: Sprite;
  private title: CurvedText | Text;
  private titleTop = responsive(TITLE_TOP);
  private subtitleTop = responsive(SUBTITLE_TOP);
  /** Unscaled title width, for shrinking long titles to fit phones. */
  private titleWidth: number;
  private subtitle?: Text;
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
      // Typing maps surface the tutorial as a node in the level row instead.
      help:
        mapUnit.type === 'typing'
          ? undefined
          : { kind: 'tutorial', mapUnit, presentation: 'screen' },
    });

    const titleStyle = {
      fontFamily: 'Concert One',
      fontSize: mapUnit.title.fontSize,
      fontWeight: '800' as const,
      fill: mapUnit.title.fontColor,
      padding: 30,
    };
    this.title = mapUnit.title.isCurved
      ? new CurvedText({ text: mapUnit.title.text, style: titleStyle })
      : new Text({
          text: mapUnit.title.text,
          style: {
            ...titleStyle,
            ...(mapUnit.title.dropShadow && { dropShadow: mapUnit.title.dropShadow }),
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
    this.titleWidth = titleBounds.width;
    this.title.layout = {
      position: 'absolute',
      top: this.titleTop,
      width: titleBounds.width,
      height: titleBounds.height,
      // Shrink from the top edge, so a scaled-down title stays clear of the subtitle.
      transformOrigin: 'center top',
    };

    if (mapUnit.subtitle) {
      this.subtitle = new Text({
        text: convertToCurrentScript(mapUnit.subtitle.text),
        style: {
          fontFamily: getScriptFontFamily(),
          fontSize: mapUnit.subtitle.fontSize,
          fontWeight: '700',
          fill: mapUnit.subtitle.fontColor,
          padding: 30,
        },
        filters: [
          new DropShadowFilter({
            color: 0x000000,
            blur: 8,
            quality: 5,
            offset: { x: 0, y: 0 },
          }),
        ],
      });
      this.subtitle.layout = {
        position: 'absolute',
        top: this.subtitleTop,
      };
    }

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
      if (!isMapUnitUnlocked(nextMap)) this.nextMapButton.alpha = 0.45;
    }

    this.addChild(
      this.background,
      this.title,
      ...(this.subtitle ? [this.subtitle] : []),
      this.levelRow,
      ...(this.prevMapButton ? [this.prevMapButton] : []),
      ...(this.nextMapButton ? [this.nextMapButton] : []),
      this.hud,
    );
  }

  /** The y offset that moves an element fully above the top screen edge. */
  private offScreenY(element: Container, layoutTop: number) {
    return -(layoutTop + element.getLocalBounds().maxY + OFF_SCREEN_MARGIN);
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.title.scale.set(Math.min(1, (width - 2 * TITLE_SIDE_MARGIN) / this.titleWidth));
    this.levelRow.resize(width, height);
    const navButtonY = responsive({ sm: height - 200, lg: height / 2 });
    if (this.prevMapButton) {
      this.prevMapButton.position.set(responsive({ sm: 90, lg: 40 }), navButtonY);
    }
    if (this.nextMapButton) {
      this.nextMapButton.position.set(width - responsive({ sm: 90, lg: 40 }), navButtonY);
    }
  }

  public async show() {
    this.title.y = this.offScreenY(this.title, this.titleTop);
    if (this.subtitle) this.subtitle.y = this.offScreenY(this.subtitle, this.subtitleTop);

    const animations = [
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      ...(this.subtitle
        ? [animate(this.subtitle, { y: 0 }, { duration: 0.4, ease: 'backOut' })]
        : []),
      this.levelRow.playEnterAnimation(),
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
    const animations = [
      animate(
        this.title,
        { y: this.offScreenY(this.title, this.titleTop) },
        { duration: 0.2, ease: 'backIn' },
      ),
      ...(this.subtitle
        ? [
            animate(
              this.subtitle,
              { y: this.offScreenY(this.subtitle, this.subtitleTop) },
              { duration: 0.2, ease: 'backIn' },
            ),
          ]
        : []),
      this.levelRow.playExitAnimation(),
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
