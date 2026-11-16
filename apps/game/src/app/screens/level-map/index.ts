import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive, topClearance } from '../../../engine/utils/viewport';
import { isMapUnitUnlocked } from '../../../lib/progression';
import { m } from '../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { convertToCurrentScript, getScriptFontFamily } from '../../../utils/script';
import { HUD } from '../../ui/hud';
import { LayerSelectScreen } from '../layer-select';
import { EducationLevelSelect } from '../level-select/education-level-select';
import { TypingTutorialScreen } from '../typing-level/level-tutorial';
import { CurvedText } from './curved-text';
import { LevelRow } from './level-row';
import { MasteryGrid } from './mastery-grid';
import { masteryArtAliases } from './mastery-tile';
import { TypingJourney } from './typing-journey';
import { getLayerMaps, getNextMap, getPrevMap, type TMapUnit } from './units';

/** Phones drop the titles below the back button and script pill, which would cover them. */
const TITLE_TOP = { sm: 170, lg: 100 };
const SUBTITLE_TOP = { sm: 310, lg: 300 };
/** Space kept on each side of a title that is shrunk to fit a narrow screen. */
const TITLE_SIDE_MARGIN = 40;
/** Extra margin so drop shadows don't peek in from the screen edge. */
const OFF_SCREEN_MARGIN = 40;

export class LevelMapScreen extends Container {
  public readonly screenName = 'LevelMapScreen';
  public static assetBundles = [
    'typing-level-map',
    'education-level-map',
    'game-level-map',
    'mascots',
    'locked-popup',
    'end-screen',
    'ui',
  ];

  /** The Mastery grid shows each game level's art, which lives in that level's own bundle. */
  public static assets(props?: unknown): string[] {
    return (props as TMapUnit | undefined)?.type === 'game' ? masteryArtAliases() : [];
  }

  private background: Sprite;
  private title: CurvedText | Text;
  private titleTop = responsive(TITLE_TOP) + topClearance(engine().navigation.height);
  private subtitleTop = responsive(SUBTITLE_TOP) + topClearance(engine().navigation.height);
  /** Unscaled title width, for shrinking long titles to fit phones. */
  private titleWidth: number;
  private subtitle?: Text;
  /**
   * Education: a unit's row of level buttons. Typing and game: one overview of the whole
   * layer, the Typing Journey or The Mastery grid.
   */
  private body: LevelRow | TypingJourney | MasteryGrid;
  private hud: HUD;
  /** How far the overview is scrolled; the title rides along with it. */
  private scrollY = 0;
  private titleAnimating = false;
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
      help:
        mapUnit.type === 'typing'
          ? {
              kind: 'tutorial',
              onPress: () =>
                void engine().navigation.showScreen(
                  TypingTutorialScreen,
                  getLayerMaps('typing')[0] ?? mapUnit,
                ),
            }
          : { kind: 'tutorial', mapUnit, presentation: 'screen' },
    });

    const titleStyle = {
      fontFamily: DISPLAY_FONT_FAMILY,
      fontSize: mapUnit.title.fontSize,
      fontWeight: '800' as const,
      fill: mapUnit.title.fontColor,
      padding: 30,
    };
    const overview = mapUnit.type !== 'education';
    this.title = overview
      ? new Text({
          text: mapUnit.type === 'typing' ? m.typing_journey() : m.game_mastery(),
          style: { ...titleStyle, fontSize: responsive({ sm: 120, lg: 170 }), fill: 0xffffff },
        })
      : mapUnit.title.isCurved
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

    if (mapUnit.subtitle && !overview) {
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

    if (overview) {
      const body = mapUnit.type === 'typing' ? new TypingJourney(mapUnit) : new MasteryGrid();
      body.onScroll = (scrollY) => {
        this.scrollY = scrollY;
        if (!this.titleAnimating) this.title.y = scrollY;
      };
      this.body = body;
    } else {
      this.body = new LevelRow(mapUnit);
    }

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
          style: { fontFamily: DISPLAY_FONT_FAMILY, fontSize: 80, fill: 0xfff4e0 },
        }),
        animations: {
          hover: { props: { scale: { x: 1.1, y: 1.1 } }, duration: 100 },
          pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
        },
        anchor: 0.5,
      });
    };

    // The overviews show every unit of their layer at once, so they have no << >> paging
    const prevMap = overview ? undefined : getPrevMap(mapUnit);
    if (prevMap) {
      this.prevMapButton = createMapNavButton('<<');
      this.prevMapButton.onPress.connect(() => {
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.showScreen(LevelMapScreen, prevMap);
      });
    }

    const nextMap = overview ? undefined : getNextMap(mapUnit);
    if (nextMap) {
      this.nextMapButton = createMapNavButton('>>');
      this.nextMapButton.onPress.connect(() => {
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.showScreen(LevelMapScreen, nextMap);
      });
      if (!isMapUnitUnlocked(nextMap)) this.nextMapButton.alpha = 0.45;
    }

    this.addChild(
      // The overviews bring their own background, which scrolls with them
      ...(overview ? [this.body] : [this.background]),
      this.title,
      ...(this.subtitle ? [this.subtitle] : []),
      ...(overview ? [] : [this.body]),
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
    if (this.body instanceof MasteryGrid) {
      // The tiles start under the title, however tall it renders on this screen
      this.body.titleBottom = this.titleTop + this.title.getLocalBounds().maxY * this.title.scale.y;
    }
    this.body.resize(width, height);
    const navButtonY = responsive({ sm: height - 200, lg: height / 2 });
    if (this.prevMapButton) {
      this.prevMapButton.position.set(responsive({ sm: 90, lg: 40 }), navButtonY);
    }
    if (this.nextMapButton) {
      this.nextMapButton.position.set(width - responsive({ sm: 90, lg: 40 }), navButtonY);
    }
  }

  public async show() {
    this.titleAnimating = true;
    this.title.y = this.offScreenY(this.title, this.titleTop);
    if (this.subtitle) this.subtitle.y = this.offScreenY(this.subtitle, this.subtitleTop);

    const animations = [
      animate(this.title, { y: this.scrollY }, { duration: 0.4, ease: 'backOut' }),
      ...(this.subtitle
        ? [animate(this.subtitle, { y: 0 }, { duration: 0.4, ease: 'backOut' })]
        : []),
      this.body.playEnterAnimation(),
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
    this.titleAnimating = false;
    this.title.y = this.scrollY;
    if (this.body instanceof LevelRow) await this.body.playPendingHop();
  }

  public async hide() {
    this.titleAnimating = true;
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
      this.body.playExitAnimation(),
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
